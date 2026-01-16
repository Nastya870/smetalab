import { useState, useEffect, useMemo } from 'react';
import categoriesAPI from '../api/categories';

/**
 * Хук для загрузки и трансформации категорий в дерево
 */
const useCategoriesTree = (type = 'material') => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await categoriesAPI.getAll({ type });
                if (response.success) {
                    setCategories(response.data);
                }
            } catch (err) {
                console.error('Failed to load categories:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [type]);

    const tree = useMemo(() => {
        if (!categories.length) return [];

        const map = {};
        const roots = [];

        // Инициализируем мапу
        categories.forEach(cat => {
            map[cat.id] = { ...cat, children: [] };
        });

        // Строим дерево
        categories.forEach(cat => {
            if (cat.parent_id && map[cat.parent_id]) {
                map[cat.parent_id].children.push(map[cat.id]);
            } else {
                roots.push(map[cat.id]);
            }
        });

        return roots;
    }, [categories]);

    return { categories, tree, loading, error };
};

export default useCategoriesTree;
