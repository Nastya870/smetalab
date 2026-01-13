import { useState, useRef, useCallback } from 'react';
import materialsAPI from 'api/materials';

/**
 * Хук для поиска и загрузки материалов
 * Поддерживает:
 * - Кеширование поиска (Map)
 * - Пагинацию (Infinite Scroll)
 * - Оптимизированный SQL поиск
 * 
 * @returns {Object} { materials, loading, hasMore, loadMaterials, totalRecords }
 */
const useMaterialsSearch = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);

    // Внутренние ссылки для управления состоянием без ререндера
    const materialsCache = useRef(new Map());

    // Константы
    const MATERIALS_PAGE_SIZE = 50; // Уменьшим батч для скорости первого рендера

    /**
     * Нормализация данных материала (из любого источника к единому виду)
     */
    const normalizeMaterial = useCallback((mat) => ({
        ...mat,
        id: mat.id || mat.dbId, // AI-поиск возвращает dbId
        productUrl: mat.product_url || mat.productUrl,
        showImage: mat.show_image !== undefined ? mat.show_image : mat.showImage,
        isGlobal: mat.is_global !== undefined ? mat.is_global : mat.isGlobal,
        autoCalculate: mat.auto_calculate !== undefined ? mat.auto_calculate : mat.autoCalculate
    }), []);

    /**
     * Основная функция загрузки материалов
     */
    const loadMaterials = useCallback(async (pageNumber = 1, resetData = false, search = '') => {
        try {
            setLoading(true);
            const startTime = performance.now();
            const cacheKey = `${search.trim().toLowerCase()}_${pageNumber}`;

            // ⚡ 1. Проверяем кеш (даже если resetData, если есть в кеше - берем оттуда)
            if (materialsCache.current.has(cacheKey)) {
                const cached = materialsCache.current.get(cacheKey);
                console.log(`⚡ [Cache Hit] "${cacheKey}"`);

                if (pageNumber === 1 || resetData) {
                    setMaterials(cached.items);
                } else {
                    setMaterials(prev => [...prev, ...cached.items]);
                }

                setTotalRecords(cached.total);
                setHasMore(cached.hasMore);
                setLoading(false);
                return;
            }

            let newMaterials = [];
            let total = 0;

            // 🔍 2. Выполняем запрос (SQL Search или Page)
            // Используем единый API для поиска и листинга
            const params = {
                page: pageNumber,
                pageSize: MATERIALS_PAGE_SIZE,
                skipCount: pageNumber > 1 ? 'true' : 'false',
                search: search.trim() // API поддерживает параметр search
            };

            const response = await materialsAPI.getAll(params);

            let fetchedData = [];
            if (response.data) {
                fetchedData = response.data;
            } else if (Array.isArray(response)) {
                fetchedData = response;
            }

            newMaterials = fetchedData.map(normalizeMaterial);

            // Считаем тотал
            total = response.total !== null && response.total !== undefined
                ? response.total
                : (totalRecords || response.count || newMaterials.length); // Fallback

            const hasMoreItems = (pageNumber * MATERIALS_PAGE_SIZE) < total;

            // 💾 3. Сохраняем в кеш
            materialsCache.current.set(cacheKey, {
                items: newMaterials,
                total: total,
                hasMore: hasMoreItems
            });

            // Обновляем состояние
            setTotalRecords(total);
            setHasMore(hasMoreItems);

            if (resetData || pageNumber === 1) {
                setMaterials(newMaterials);
            } else {
                setMaterials(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const cleanNew = newMaterials.filter(m => !existingIds.has(m.id));
                    return [...prev, ...cleanNew];
                });
            }

            setPage(pageNumber);

            // Логи
            const duration = performance.now() - startTime;
            console.log(`✅ [API] Load ${pageNumber}: ${newMaterials.length}/${total} (${duration.toFixed(0)}ms)`);

        } catch (error) {
            console.error('❌ [useMaterialsSearch] Error:', error);
            if (resetData) setMaterials([]); // Очищаем список при ошибке только если это был новый поиск
        } finally {
            setLoading(false);
        }
    }, [totalRecords, normalizeMaterial]);

    /**
     * Сброс списка материалов
     */
    const resetMaterials = useCallback(() => {
        setMaterials([]);
        setPage(1);
        setHasMore(true);
        setTotalRecords(0);
    }, []);

    return {
        materials,
        loading,
        hasMore,
        totalRecords,
        page,
        loadMaterials,
        resetMaterials
    };
};

export default useMaterialsSearch;
