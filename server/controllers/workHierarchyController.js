/**
 * Controller для управления иерархией работ
 */

import workHierarchyRepository from '../repositories/workHierarchyRepository.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Получить элементы иерархии по уровню
 * GET /api/works/hierarchy?level=phase&parent=value
 */
export async function getHierarchyByLevel(req, res) {
  try {
    const { level, parent } = req.query;
    const tenantId = req.user?.tenantId;

    if (!level || !['phase', 'section', 'subsection'].includes(level)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Параметр level обязателен и должен быть: phase, section или subsection'
      });
    }

    const items = await workHierarchyRepository.findByLevel(level, parent, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('[getHierarchyByLevel] Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при получении элементов иерархии',
      message: error.message
    });
  }
}

/**
 * Получить полное дерево иерархии
 * GET /api/works/hierarchy/tree
 */
export async function getHierarchyTree(req, res) {
  try {
    const tenantId = req.user?.tenantId;

    const tree = await workHierarchyRepository.getFullTree(tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('[getHierarchyTree] Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при получении дерева иерархии',
      message: error.message
    });
  }
}

/**
 * Получить элемент по ID
 * GET /api/works/hierarchy/:id
 */
export async function getHierarchyItemById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const item = await workHierarchyRepository.findById(id, tenantId);

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Элемент не найден'
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('[getHierarchyItemById] Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при получении элемента',
      message: error.message
    });
  }
}

/**
 * Создать элемент иерархии
 * POST /api/works/hierarchy
 * Body: { level, parent_value, value, code, sort_order, is_global }
 */
export async function createHierarchyItem(req, res) {
  try {
    const tenantId = req.user?.tenantId;
    const { level, value } = req.body;

    // Валидация
    if (!level || !['phase', 'section', 'subsection'].includes(level)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Поле level обязательно и должно быть: phase, section или subsection'
      });
    }

    if (!value || !value.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Поле value обязательно'
      });
    }

    // Для section и subsection требуется parent_value
    if ((level === 'section' || level === 'subsection') && !req.body.parent_value) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: `Для уровня ${level} требуется поле parent_value`
      });
    }

    const newItem = await workHierarchyRepository.create(req.body, tenantId);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Элемент успешно создан',
      data: newItem
    });
  } catch (error) {
    console.error('[createHierarchyItem] Error:', error);

    // Проверка на дубликат
    if (error.code === '23505') { // unique_violation
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        error: 'Такой элемент уже существует'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при создании элемента',
      message: error.message
    });
  }
}

/**
 * Обновить элемент иерархии
 * PUT /api/works/hierarchy/:id
 */
export async function updateHierarchyItem(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const updatedItem = await workHierarchyRepository.update(id, req.body, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Элемент успешно обновлен',
      data: updatedItem
    });
  } catch (error) {
    console.error('[updateHierarchyItem] Error:', error);

    if (error.message === 'Элемент не найден или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при обновлении элемента',
      message: error.message
    });
  }
}

/**
 * Удалить элемент иерархии
 * DELETE /api/works/hierarchy/:id
 */
export async function deleteHierarchyItem(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    await workHierarchyRepository.deleteItem(id, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Элемент успешно удален'
    });
  } catch (error) {
    console.error('[deleteHierarchyItem] Error:', error);

    if (error.message === 'Элемент не найден или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Невозможно удалить элемент с дочерними элементами') {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при удалении элемента',
      message: error.message
    });
  }
}

/**
 * Получить варианты для autocomplete
 * GET /api/works/hierarchy/autocomplete?level=phase&search=text
 */
export async function getAutocomplete(req, res) {
  try {
    const { level, search } = req.query;
    const tenantId = req.user?.tenantId;

    if (!level || !['phase', 'section', 'subsection'].includes(level)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Параметр level обязателен'
      });
    }

    const options = await workHierarchyRepository.getAutocompleteOptions(
      level,
      search,
      tenantId
    );

    res.status(StatusCodes.OK).json({
      success: true,
      count: options.length,
      data: options
    });
  } catch (error) {
    console.error('[getAutocomplete] Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при получении вариантов автозаполнения',
      message: error.message
    });
  }
}

/**
 * Получить статистику по иерархии
 * GET /api/works/hierarchy/statistics
 */
export async function getHierarchyStatistics(req, res) {
  try {
    const tenantId = req.user?.tenantId;

    const stats = await workHierarchyRepository.getStatistics(tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[getHierarchyStatistics] Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при получении статистики',
      message: error.message
    });
  }
}

export default {
  getHierarchyByLevel,
  getHierarchyTree,
  getHierarchyItemById,
  createHierarchyItem,
  updateHierarchyItem,
  deleteHierarchyItem,
  getAutocomplete,
  getHierarchyStatistics
};
