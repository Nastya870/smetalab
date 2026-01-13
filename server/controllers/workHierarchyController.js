/**
 * Controller для управления иерархией работ
 */

import workHierarchyRepository from '../repositories/workHierarchyRepository.js';
import { catchAsync, BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * Получить элементы иерархии по уровню
 * GET /api/works/hierarchy?level=phase&parent=value
 */
export const getHierarchyByLevel = catchAsync(async (req, res) => {
  const { level, parent } = req.query;
  const tenantId = req.user?.tenantId;

  if (!level || !['phase', 'section', 'subsection'].includes(level)) {
    throw new BadRequestError('Параметр level обязателен и должен быть: phase, section или subsection');
  }

  const items = await workHierarchyRepository.findByLevel(level, parent, tenantId);

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

/**
 * Получить полное дерево иерархии
 * GET /api/works/hierarchy/tree
 */
export const getHierarchyTree = catchAsync(async (req, res) => {
  const tenantId = req.user?.tenantId;

  const tree = await workHierarchyRepository.getFullTree(tenantId);

  res.json({
    success: true,
    data: tree
  });
});

/**
 * Получить элемент по ID
 * GET /api/works/hierarchy/:id
 */
export const getHierarchyItemById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const item = await workHierarchyRepository.findById(id, tenantId);

  if (!item) {
    throw new NotFoundError('Элемент не найден');
  }

  res.json({
    success: true,
    data: item
  });
});

/**
 * Создать элемент иерархии
 * POST /api/works/hierarchy
 * Body: { level, parent_value, value, code, sort_order, is_global }
 */
export const createHierarchyItem = catchAsync(async (req, res) => {
  const tenantId = req.user?.tenantId;
  const { level, value } = req.body;

  // Валидация
  if (!level || !['phase', 'section', 'subsection'].includes(level)) {
    throw new BadRequestError('Поле level обязательно и должно быть: phase, section или subsection');
  }

  if (!value || !value.trim()) {
    throw new BadRequestError('Поле value обязательно');
  }

  // Для section и subsection требуется parent_value
  if ((level === 'section' || level === 'subsection') && !req.body.parent_value) {
    throw new BadRequestError(`Для уровня ${level} требуется поле parent_value`);
  }

  const newItem = await workHierarchyRepository.create(req.body, tenantId);

  res.status(201).json({
    success: true,
    message: 'Элемент успешно создан',
    data: newItem
  });
});

/**
 * Обновить элемент иерархии
 * PUT /api/works/hierarchy/:id
 */
export const updateHierarchyItem = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const updatedItem = await workHierarchyRepository.update(id, req.body, tenantId);

  res.json({
    success: true,
    message: 'Элемент успешно обновлен',
    data: updatedItem
  });
});

/**
 * Удалить элемент иерархии
 * DELETE /api/works/hierarchy/:id
 */
export const deleteHierarchyItem = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  await workHierarchyRepository.deleteItem(id, tenantId);

  res.json({
    success: true,
    message: 'Элемент успешно удален'
  });
});

/**
 * Получить варианты для autocomplete
 * GET /api/works/hierarchy/autocomplete?level=phase&search=text
 */
export const getAutocomplete = catchAsync(async (req, res) => {
  const { level, search } = req.query;
  const tenantId = req.user?.tenantId;

  if (!level || !['phase', 'section', 'subsection'].includes(level)) {
    throw new BadRequestError('Параметр level обязателен');
  }

  const options = await workHierarchyRepository.getAutocompleteOptions(
    level,
    search,
    tenantId
  );

  res.json({
    success: true,
    count: options.length,
    data: options
  });
});

/**
 * Получить статистику по иерархии
 * GET /api/works/hierarchy/statistics
 */
export const getHierarchyStatistics = catchAsync(async (req, res) => {
  const tenantId = req.user?.tenantId;

  const stats = await workHierarchyRepository.getStatistics(tenantId);

  res.json({
    success: true,
    data: stats
  });
});

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
