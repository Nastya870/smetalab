import { useState, useEffect, useCallback, useRef } from 'react';
import materialsAPI from 'api/materials';
import { fullTextSearch } from 'shared/lib/utils/fullTextSearch';

const DB_NAME = 'smetalab_db';
const DB_VERSION = 1;
const STORE_NAME = 'materials';
const SYNC_KEY = 'materials_last_sync';
const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook for instant material search using IndexedDB
 * @returns {Object} { materials, loading, syncing, searchMaterials, syncMaterials, syncStatus }
 */
const useIndexedMaterials = () => {
    const [db, setDb] = useState(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [materials, setMaterials] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
    const [lastSync, setLastSync] = useState(null);

    // In-memory cache for all materials (avoid re-reading from IDB)
    const allMaterialsCache = useRef(null);

    // Initialize DB
    useEffect(() => {
        const initDB = async () => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onerror = (event) => {
                    console.error('IndexedDB error:', event.target.error);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        store.createIndex('name', 'name', { unique: false });
                        store.createIndex('sku', 'sku', { unique: false });
                        store.createIndex('category', 'category', { unique: false });
                    }
                };

                request.onsuccess = (event) => {
                    const database = event.target.result;
                    setDb(database);

                    // Check last sync
                    const last = localStorage.getItem(SYNC_KEY);
                    if (last) {
                        setLastSync(new Date(parseInt(last)));
                    }

                    // Initial check if we need sync
                    if (!last || (Date.now() - parseInt(last) > SYNC_INTERVAL)) {
                        // Don't auto-sync immediately to avoid blocking UI on first load
                        // Let the user trigger it or do it in background after a delay
                        setTimeout(() => syncMaterials(database), 1000);
                    }
                };
            } catch (err) {
                console.error('Failed to init IndexedDB:', err);
            }
        };

        initDB();
    }, []);

    /**
     * Sync materials from API to IndexedDB
     */
    const syncMaterials = useCallback(async (database = db) => {
        if (!database || syncing) return;

        try {
            setSyncing(true);
            setSyncStatus('syncing');
            console.log('🔄 Starting materials sync...');

            // Fetch all materials (using large page size)
            // TODO: Implement chunking if 50k is too large
            const response = await materialsAPI.getAll({
                page: 1,
                pageSize: 50000, // Fetch all
                skipCount: 'true'
            });

            const items = Array.isArray(response) ? response : (response.data || []);

            if (items.length === 0) {
                console.warn('⚠️ No materials fetched from API');
                setSyncing(false);
                setSyncStatus('success');
                return;
            }

            console.log(`📥 Fetched ${items.length} materials. Saving to IndexedDB...`);

            // Save to IndexedDB using transaction
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Clear old data first? Or merge? 
            // Clearing is safer for "sync" to remove deleted items
            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = resolve;
                clearRequest.onerror = reject;
            });

            // Bulk add
            let addedCount = 0;
            for (const item of items) {
                // Normalize item for storage
                const normalized = {
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    unit: item.unit,
                    price: item.price,
                    category: item.category,
                    category_full_path: item.category_full_path, // Сохраняем полный путь для иерархического поиска
                    supplier: item.supplier,
                    image: item.image,
                    is_global: item.is_global,
                    // Add search string for faster filtering if needed
                    _search: `${item.name} ${item.sku} ${item.supplier || ''} ${item.category || ''}`.toLowerCase()
                };
                store.put(normalized);
                addedCount++;
            }

            transaction.oncomplete = () => {
                console.log(`✅ Sync complete. Saved ${addedCount} items.`);
                const now = Date.now();
                localStorage.setItem(SYNC_KEY, now.toString());
                setLastSync(new Date(now));
                setSyncStatus('success');
                setSyncing(false);

                // Clear memory cache to force reload from IDB
                allMaterialsCache.current = null;
            };

            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                setSyncStatus('error');
                setSyncing(false);
            };

        } catch (err) {
            console.error('Sync failed:', err);
            setSyncStatus('error');
            setSyncing(false);
        }
    }, [db, syncing]);

    /**
     * Search materials in IndexedDB
     */
    const searchMaterials = useCallback(async (query = '', page = 1, pageSize = 50) => {
        if (!db) return { items: [], total: 0 };

        setLoading(true);
        const startTime = performance.now();
        const cacheKey = `${query.trim().toLowerCase()}`;

        try {
            // 1. Get all items from IDB (fast for < 500k)
            // Optimization: If query is empty, use cursor with limit?
            // But we need total count.

            // For now, load all keys/values to memory for filtering
            // This is the simplest "Instant Search" implementation
            // If memory is an issue, we can use IDB cursors

            let allItems = [];

            // Check memory cache first (if we keep all items in memory)
            // But to save RAM, let's read from IDB every time or keep a "hot" cache

            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);

            if (!query) {
                // If no query, just get a page using cursor
                // This is much faster than getAll()
                const items = [];
                let count = 0;
                let hasMore = true;
                const offset = (page - 1) * pageSize;
                const limit = pageSize;

                // Get total count
                const countRequest = store.count();
                const total = await new Promise((resolve, reject) => {
                    countRequest.onsuccess = () => resolve(countRequest.result);
                    countRequest.onerror = reject;
                });

                // Get page items
                await new Promise((resolve, reject) => {
                    let advanced = false;
                    const request = store.openCursor();
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (!cursor) {
                            resolve();
                            return;
                        }

                        if (offset > 0 && !advanced) {
                            advanced = true;
                            cursor.advance(offset);
                            return;
                        }

                        if (items.length < limit) {
                            items.push(cursor.value);
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    request.onerror = reject;
                });

                setMaterials(items);
                setTotalRecords(total);
                setLoading(false);
                return { items, total };
            }

            // If query exists, we need to filter
            // Use in-memory cache if available, otherwise read from IDB

            if (!allMaterialsCache.current) {
                const allRequest = store.getAll();
                allMaterialsCache.current = await new Promise((resolve, reject) => {
                    allRequest.onsuccess = () => resolve(allRequest.result);
                    allRequest.onerror = reject;
                });
                console.log(`📦 Loaded ${allMaterialsCache.current.length} materials into memory cache`);
            }

            allItems = allMaterialsCache.current;

            // Если query начинается с "category:", фильтруем по точной категории
            let textQuery = query;
            let categoryFilter = null;

            if (query.startsWith('category:')) {
                categoryFilter = query.substring(9).trim(); // "category:Name" -> "Name"
                textQuery = ''; // Сбрасываем текстовый поиск, так как мы только фильтруем
            }

            let filtered = allItems;

            if (categoryFilter) {
                // Фильтрация по категории (точное совпадение или startWith для подкатегорий?)
                // Для простоты пока используем точное или вхождение
                const cf = categoryFilter.toLowerCase();
                filtered = allItems.filter(item =>
                    item.category?.toLowerCase() === cf ||
                    item.category_full_path?.toLowerCase().includes(cf)
                );
            } else if (textQuery) {
                // Filter using fullTextSearch
                filtered = fullTextSearch(allItems, textQuery, ['name', 'sku', 'supplier', 'category']);
            }

            // Pagination
            const total = filtered.length;
            const start = (page - 1) * pageSize;
            const pagedItems = filtered.slice(start, start + pageSize);

            const duration = performance.now() - startTime;
            console.log(`🔍 Search "${query}": ${total} found in ${duration.toFixed(0)}ms`);

            if (page === 1) {
                setMaterials(pagedItems);
            } else {
                setMaterials(prev => [...prev, ...pagedItems]);
            }

            setTotalRecords(total);
            setLoading(false);
            return { items: pagedItems, total };

        } catch (err) {
            console.error('Search error:', err);
            setLoading(false);
            return { items: [], total: 0 };
        }
    }, [db]);

    /**
     * Force sync - clears timestamp and re-syncs from server
     */
    const forceSync = useCallback(async () => {
        console.log('🔄 Force sync initiated...');
        localStorage.removeItem(SYNC_KEY);
        allMaterialsCache.current = null;
        await syncMaterials(db);
    }, [db, syncMaterials]);

    /**
     * Clear all cache (IndexedDB + localStorage + memory)
     */
    const clearCache = useCallback(async () => {
        console.log('🗑️ Clearing all materials cache...');

        // Clear memory
        allMaterialsCache.current = null;
        setMaterials([]);
        setTotalRecords(0);

        // Clear localStorage
        localStorage.removeItem(SYNC_KEY);
        setLastSync(null);

        // Clear IndexedDB
        if (db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                await new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
                console.log('✅ IndexedDB cleared');
            } catch (err) {
                console.error('Failed to clear IndexedDB:', err);
            }
        }

        setSyncStatus('idle');
    }, [db]);

    return {
        materials,
        loading,
        syncing,
        syncStatus,
        lastSync,
        totalRecords,
        hasMore: materials.length < totalRecords,
        searchMaterials,
        syncMaterials,
        forceSync,
        clearCache,
        resetMaterials: () => setMaterials([])
    };
};

export default useIndexedMaterials;
