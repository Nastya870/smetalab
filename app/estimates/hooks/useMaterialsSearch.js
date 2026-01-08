import { useState, useRef, useCallback } from 'react';
import materialsAPI from 'api/materials';
import searchAPI from 'api/search';

/**
 * Хук для поиска и загрузки материалов
 * Поддерживает:
 * - Гибридный поиск (AI pinecone + SQL fallback)
 * - Пагинацию (Infinite Scroll)
 * - Кеширование (базовое)
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
    const materialsCache = useRef(null);
    const materialsCacheTimestamp = useRef(null);

    // Константы
    const MATERIALS_PAGE_SIZE = 100;

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
     * @param {number} pageNumber - номер страницы
     * @param {boolean} resetData - сбросить ли текущий список (для нового поиска)
     * @param {string} search - поисковый запрос
     */
    const loadMaterials = useCallback(async (pageNumber = 1, resetData = false, search = '') => {
        try {
            setLoading(true);
            const startTime = performance.now();

            let newMaterials = [];
            let total = 0;

            // 🧠 AI-ПОИСК (Только если есть запрос)
            if (search && search.trim().length > 0) {
                // Если сброс данных, чистим старое
                if (resetData) setMaterials([]);

                console.log(`🧠 [useMaterialsSearch] AI-поиск: "${search}"`);

                try {
                    const aiResponse = await searchAPI.smartMaterials(search.trim(), { limit: 50 });

                    if (aiResponse.success && aiResponse.results?.length > 0) {
                        // Преобразуем AI-результаты
                        newMaterials = aiResponse.results.map(result => normalizeMaterial({
                            id: result.id,
                            name: result.name,
                            sku: result.sku || null,
                            price: result.price || 0,
                            unit: result.unit || 'шт',
                            category: result.category || null,
                            supplier: result.supplier || null,
                            is_global: true,
                            _aiScore: 1,
                            _aiSource: 'smart-gpt',
                            _matchedKeyword: result.matchedKeyword
                        }));

                        total = newMaterials.length;
                        const keywords = aiResponse.expandedKeywords?.join(', ') || '';
                        console.log(`🧠 GPT keywords: ${keywords}`);
                    } else {
                        console.log('🧠 AI ничего не нашел, Fallback на SQL...');
                        throw new Error('AI no results'); // Пробрасываем в catch для fallback
                    }
                } catch (aiError) {
                    // Fallback на обычный SQL поиск
                    const fallbackResponse = await materialsAPI.getAll({ search: search.trim(), pageSize: 50 });
                    newMaterials = (fallbackResponse.data || []).map(normalizeMaterial);
                    total = newMaterials.length;
                }

                // AI/Search поиск пока не поддерживает пагинацию (возвращает топ-50)
                setHasMore(false);
                setMaterials(newMaterials);
                setPage(1); // Сбрасываем страницу

            } else {
                // 📋 ОБЫЧНАЯ ЗАГРУЗКА (Пагинация)
                const params = {
                    page: pageNumber,
                    pageSize: MATERIALS_PAGE_SIZE,
                    skipCount: pageNumber > 1 ? 'true' : 'false'
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
                    : (totalRecords || response.count || newMaterials.length);

                setTotalRecords(total);

                if (resetData) {
                    setMaterials(newMaterials);
                    setHasMore(newMaterials.length < total);
                } else {
                    // Добавляем к существующим (Infinite Scroll)
                    setMaterials(prev => {
                        // Фильтруем дубликаты на всякий случай
                        const existingIds = new Set(prev.map(m => m.id));
                        const cleanNew = newMaterials.filter(m => !existingIds.has(m.id));
                        const updated = [...prev, ...cleanNew];
                        setHasMore(updated.length < total);
                        return updated;
                    });
                }

                setPage(pageNumber);
            }

            // Логи
            const duration = performance.now() - startTime;
            const type = search ? '🔍 Search' : '📄 Page';
            console.log(`✅ [useMaterialsSearch] ${type} ${pageNumber}: ${newMaterials.length} items (${duration.toFixed(0)}ms)`);

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
