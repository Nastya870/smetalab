import { useState, useRef, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import worksAPI from 'api/works';
import searchAPI from 'api/search';

/**
 * Хук для управления справочником работ (Библиотека)
 * Включает:
 * - Загрузку работ с кешированием (Global/Tenant)
 * - AI поиск работ
 * - Клиентский поиск (фильтрация)
 */
const useWorksLibrary = (initialSourceType = 'global') => {
    const [availableWorks, setAvailableWorks] = useState([]);
    const [aiSearchedWorks, setAiSearchedWorks] = useState(null); // null = поиск не активен
    const [loading, setLoading] = useState(true);
    const [loadingAi, setLoadingAi] = useState(false);
    const [error, setError] = useState(null);
    const [sourceType, setSourceType] = useState(initialSourceType); // 'global' | 'tenant'

    // Кеш
    const worksCache = useRef({ global: null, tenant: null });
    const worksCacheTimestamp = useRef({ global: null, tenant: null });
    const WORKS_CACHE_TTL = 10 * 60 * 1000; // 10 минут

    /**
     * Загрузить работы с использованием кеша
     */
    const loadWorks = useCallback(async (type) => {
        const currentType = type || sourceType;
        setSourceType(currentType);

        const now = Date.now();

        // Проверяем кеш
        if (worksCache.current[currentType] &&
            worksCacheTimestamp.current[currentType] &&
            (now - worksCacheTimestamp.current[currentType]) < WORKS_CACHE_TTL) {

            console.log(`✅ [useWorksLibrary] Cache hit (${currentType}): ${worksCache.current[currentType].length} items`);
            setAvailableWorks(worksCache.current[currentType]);
            setLoading(false);
            return;
        }

        // Загружаем
        try {
            setLoading(true);
            setError(null);
            console.log(`🔄 [useWorksLibrary] Loading works from API (${currentType})...`);

            const isGlobal = currentType === 'global';
            const response = await worksAPI.getAll({
                isGlobal: isGlobal.toString(),
                pageSize: 10000
            });

            const data = response.data || response || [];

            if (!Array.isArray(data) || data.length === 0) {
                // Если пусто - это может быть нормально для Tenant
                setAvailableWorks([]);
                worksCache.current[currentType] = [];
                worksCacheTimestamp.current[currentType] = now;
                if (!isGlobal) setError('В вашем справочнике пока нет работ.');
                return;
            }

            // Трансформация
            const transformedWorks = data.map(work => ({
                id: work.id.toString(),
                code: work.code,
                name: work.name,
                category: work.section || '',
                unit: work.unit,
                price: work.base_price || 0,
                phase: work.phase || '',
                section: work.section || '',
                subsection: work.subsection || ''
            }));

            // Сохраняем в кеш
            worksCache.current[currentType] = transformedWorks;
            worksCacheTimestamp.current[currentType] = now;

            setAvailableWorks(transformedWorks);
            console.log(`✅ [useWorksLibrary] Loaded ${transformedWorks.length} works`);

        } catch (err) {
            console.error('❌ [useWorksLibrary] Error:', err);
            setError(err.message || 'Ошибка загрузки справочника работ');
        } finally {
            setLoading(false);
        }
    }, [sourceType]);

    /**
     * AI Поиск работ
     */
    const searchWorksAI = useCallback(async (query) => {
        if (!query || query.trim().length < 2) {
            setAiSearchedWorks(null);
            return;
        }

        try {
            setLoadingAi(true);
            const scope = sourceType;
            console.log(`🧠 [useWorksLibrary] AI Search "${query}" (${scope})`);

            const aiResponse = await searchAPI.smartWorks(query.trim(), { limit: 50, scope });

            if (aiResponse.success && aiResponse.results?.length > 0) {
                const aiWorks = aiResponse.results.map(r => ({
                    id: r.id?.toString(),
                    code: r.code || r.sku || null,
                    name: r.name,
                    category: r.category || '',
                    section: r.category || '',
                    unit: r.unit || 'шт',
                    price: r.price || 0,
                    phase: '',
                    subsection: '',
                    is_global: r.is_global,
                    tenant_id: r.tenant_id,
                    _aiScore: 1,
                    _aiSource: 'smart-gpt',
                    _matchedKeyword: r.matchedKeyword
                }));

                console.log(`🧠 AI found ${aiWorks.length} works`);
                setAiSearchedWorks(aiWorks);
            } else {
                console.log('🧠 AI found nothing');
                setAiSearchedWorks([]);
            }
        } catch (err) {
            console.warn('⚠️ AI Works Search failed:', err.message);
            setAiSearchedWorks(null); // Fallback to client search
        } finally {
            setLoadingAi(false);
        }
    }, [sourceType]);

    // Debounced search
    const debouncedSearchWorksAI = useMemo(
        () => debounce((query) => searchWorksAI(query), 400),
        [searchWorksAI]
    );

    return {
        availableWorks,
        aiSearchedWorks, // Если !null, значит результаты AI поиска
        loading,
        loadingAi,
        error,
        sourceType,
        setSourceType, // Для переключения вкладок
        loadWorks,
        searchWorksAI, // Прямой вызов
        debouncedSearchWorksAI, // Debounced
        setAiSearchedWorks
    };
};

export default useWorksLibrary;
