import { catchAsync } from '../utils/errors.js';
import categoriesRepository from '../repositories/categoriesRepository.js';

/**
 * Получить список всех категорий
 * @swagger
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Получить список категорий
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           default: material
 *         description: Тип категории (material/work)
 *     responses:
 *       200:
 *         description: Успешно
 */
export const getAllCategories = catchAsync(async (req, res) => {
    const { type = 'material' } = req.query;
    const tenantId = req.user?.tenantId;

    const categories = await categoriesRepository.findAll({
        tenantId,
        type
    });

    // Преобразуем плоский список в дерево (если нужно на бэке, но пока шлем плоский для гибкости)
    // Фронтенд сам соберет дерево.

    res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
    });
});

export default {
    getAllCategories
};
