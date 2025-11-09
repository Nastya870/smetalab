/**
 * Controller для управления позициями смет (estimate_items)
 */

import estimateItemsRepository from '../repositories/estimateItemsRepository.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * /estimates/{estimateId}/items:
 *   get:
 *     tags: [Estimate Items]
 *     summary: Получить все позиции сметы
 *     description: Возвращает все позиции (работы) для конкретной сметы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Список позиций получен
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export async function getEstimateItems(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;

    const items = await estimateItemsRepository.findByEstimateId(estimateId, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching estimate items:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при получении позиций сметы',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/items/{id}:
 *   get:
 *     tags: [Estimate Items]
 *     summary: Получить позицию по ID
 *     description: Возвращает детальную информацию о позиции сметы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Позиция найдена
 *       404:
 *         description: Позиция не найдена
 *       500:
 *         description: Ошибка сервера
 */
export async function getEstimateItemById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const item = await estimateItemsRepository.findById(id, tenantId);

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Позиция не найдена'
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching estimate item:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при получении позиции',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{estimateId}/items:
 *   post:
 *     tags: [Estimate Items]
 *     summary: Создать новую позицию сметы
 *     description: Добавляет новую работу/позицию в смету
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unit
 *               - quantity
 *               - unit_price
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название работы
 *               unit:
 *                 type: string
 *                 description: Единица измерения
 *               quantity:
 *                 type: number
 *                 description: Количество (>0)
 *               unit_price:
 *                 type: number
 *                 description: Цена за единицу (>=0)
 *               work_id:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Позиция успешно создана
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Смета не найдена
 *       500:
 *         description: Ошибка сервера
 */
export async function createEstimateItem(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;

    // Валидация обязательных полей
    const { name, unit, quantity, unit_price } = req.body;

    if (!name || !name.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Название позиции обязательно'
      });
    }

    if (!unit || !unit.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Единица измерения обязательна'
      });
    }

    if (quantity === undefined || quantity <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Количество должно быть больше 0'
      });
    }

    if (unit_price === undefined || unit_price < 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Цена должна быть неотрицательной'
      });
    }

    // Создаём позицию
    const newItem = await estimateItemsRepository.create(req.body, estimateId, tenantId);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Позиция успешно создана',
      data: newItem
    });
  } catch (error) {
    console.error('Error creating estimate item:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при создании позиции',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/items/{id}:
 *   put:
 *     tags: [Estimate Items]
 *     summary: Обновить позицию
 *     description: Обновляет данные позиции сметы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unit_price:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Позиция обновлена
 *       404:
 *         description: Позиция не найдена
 *       500:
 *         description: Ошибка сервера
 */
export async function updateEstimateItem(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Валидация quantity и unit_price, если они передаются
    if (req.body.quantity !== undefined && req.body.quantity <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Количество должно быть больше 0'
      });
    }

    if (req.body.unit_price !== undefined && req.body.unit_price < 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Цена должна быть неотрицательной'
      });
    }

    const updatedItem = await estimateItemsRepository.update(id, req.body, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Позиция успешно обновлена',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating estimate item:', error);

    if (error.message === 'Позиция не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при обновлении позиции',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/items/{id}:
 *   delete:
 *     tags: [Estimate Items]
 *     summary: Удалить позицию
 *     description: Удаляет позицию из сметы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Позиция удалена
 *       404:
 *         description: Позиция не найдена
 *       500:
 *         description: Ошибка сервера
 */
export async function deleteEstimateItem(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    await estimateItemsRepository.deleteItem(id, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Позиция успешно удалена'
    });
  } catch (error) {
    console.error('Error deleting estimate item:', error);

    if (error.message === 'Позиция не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при удалении позиции',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{estimateId}/items/bulk-from-works:
 *   post:
 *     tags: [Estimate Items]
 *     summary: Массовое добавление из справочника работ
 *     description: Добавляет несколько работ из справочника в смету одним запросом
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workIds
 *             properties:
 *               workIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               quantities:
 *                 type: object
 *                 description: Количества для каждой работы (optional)
 *     responses:
 *       201:
 *         description: Работы добавлены
 *       400:
 *         description: Некорректные данные
 *       500:
 *         description: Ошибка сервера
 */
export async function bulkAddFromWorks(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const { workIds, quantities } = req.body;

    console.log('[bulkAddFromWorks] Request:', { 
      estimateId, 
      tenantId, 
      workIds: workIds?.length, 
      quantities: Object.keys(quantities || {}).length 
    });

    if (!workIds || !Array.isArray(workIds) || workIds.length === 0) {
      console.error('[bulkAddFromWorks] Invalid workIds:', workIds);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Массив workIds обязателен и должен содержать хотя бы один элемент'
      });
    }

    const result = await estimateItemsRepository.bulkCreateFromWorks(
      estimateId,
      workIds,
      tenantId,
      quantities || {}
    );

    console.log('[bulkAddFromWorks] Success:', result);
    
    // Формируем сообщение с учетом дубликатов
    let message = `Успешно добавлено ${result.created.length} позиций`;
    if (result.skipped > 0) {
      message += `, пропущено ${result.skipped} дубликатов`;
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message,
      created: result.created.length,
      skipped: result.skipped,
      total: result.total,
      data: result.created
    });
  } catch (error) {
    console.error('[bulkAddFromWorks] Error:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Работы не найдены') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при массовом добавлении работ',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{estimateId}/items/reorder:
 *   put:
 *     tags: [Estimate Items]
 *     summary: Изменить порядок позиций
 *     description: Переупорядочивает позиции в смете
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     position:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Порядок обновлён
 *       400:
 *         description: Некорректные данные
 *       500:
 *         description: Ошибка сервера
 */
export async function reorderEstimateItems(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Массив items обязателен'
      });
    }

    const reorderedItems = await estimateItemsRepository.reorderItems(estimateId, items, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Порядок позиций успешно изменен',
      data: reorderedItems
    });
  } catch (error) {
    console.error('Error reordering items:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при изменении порядка позиций',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{estimateId}/items/bulk:
 *   post:
 *     tags: [Estimate Items]
 *     summary: Массовая вставка позиций с материалами
 *     description: Создаёт несколько позиций (с материалами) за один запрос
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - unit
 *                     - quantity
 *                     - unit_price
 *                   properties:
 *                     name:
 *                       type: string
 *                     unit:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unit_price:
 *                       type: number
 *                     materials:
 *                       type: array
 *                       description: Материалы для позиции
 *     responses:
 *       201:
 *         description: Позиции созданы
 *       400:
 *         description: Ошибка валидации
 *       500:
 *         description: Ошибка сервера
 */
export async function bulkCreateItems(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const { items } = req.body;

    console.log(`[bulkCreateItems] Received ${items?.length || 0} items for estimate ${estimateId}`);

    // Валидация
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Массив items обязателен и должен содержать хотя бы один элемент'
      });
    }

    // Валидация обязательных полей для каждой позиции
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.name || !item.name.trim()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: название обязательно`
        });
      }

      if (!item.unit || !item.unit.trim()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: единица измерения обязательна`
        });
      }

      if (item.quantity === undefined || item.quantity <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: количество должно быть больше 0`
        });
      }

      if (item.unit_price === undefined || item.unit_price < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: цена должна быть неотрицательной`
        });
      }
    }

    // Создаём позиции в транзакции
    const createdItems = await estimateItemsRepository.bulkCreate(estimateId, items, tenantId);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `Успешно создано ${createdItems.length} позиций`,
      count: createdItems.length,
      data: createdItems
    });
  } catch (error) {
    console.error('[bulkCreateItems] Error:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при массовом создании позиций',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{estimateId}/items/all:
 *   delete:
 *     tags: [Estimate Items]
 *     summary: Удалить все позиции сметы
 *     description: Удаляет все позиции из сметы (⚠️ необратимо)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Все позиции удалены
 *       500:
 *         description: Ошибка сервера
 */
export async function deleteAllEstimateItems(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;

    const deletedCount = await estimateItemsRepository.deleteAllByEstimateId(estimateId, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Удалено ${deletedCount} позиций`,
      count: deletedCount
    });
  } catch (error) {
    console.error('[deleteAllEstimateItems] Error:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при удалении позиций',
      message: error.message
    });
  }
}

/**
 * Заменить все позиции сметы (удалить старые + создать новые в одной транзакции)
 * PUT /api/estimates/:estimateId/items/replace
 * Body: { items: [{ name, unit, quantity, unit_price, materials: [...] }, ...] }
 */
export async function replaceAllEstimateItems(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const { items } = req.body;

    console.log(`[replaceAllEstimateItems] Replacing all items for estimate ${estimateId} with ${items?.length || 0} new items`);

    // Валидация
    if (!items || !Array.isArray(items)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Массив items обязателен'
      });
    }

    // Разрешаем пустой массив (удалить все позиции)
    if (items.length === 0) {
      console.log('[replaceAllEstimateItems] Empty items array - will delete all items');
    }

    // Валидация обязательных полей для каждой позиции
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.name || !item.name.trim()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: название обязательно`
        });
      }

      if (!item.unit || !item.unit.trim()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: единица измерения обязательна`
        });
      }

      // ✅ Разрешаем quantity = 0 (пользователь увидит красную подсветку в UI)
      if (item.quantity === undefined || item.quantity < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: количество должно быть неотрицательным (>= 0)`
        });
      }

      if (item.unit_price === undefined || item.unit_price < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: `Позиция #${i + 1}: цена должна быть неотрицательной`
        });
      }
    }

    // Заменяем все позиции в транзакции
    const createdItems = await estimateItemsRepository.replaceAllItems(estimateId, items, tenantId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Смета обновлена: создано ${createdItems.length} позиций`,
      count: createdItems.length,
      data: createdItems
    });
  } catch (error) {
    console.error('[replaceAllEstimateItems] Error:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ошибка при замене позиций сметы',
      message: error.message
    });
  }
}

export default {
  getEstimateItems,
  getEstimateItemById,
  createEstimateItem,
  updateEstimateItem,
  deleteEstimateItem,
  bulkAddFromWorks,
  reorderEstimateItems,
  bulkCreateItems,
  deleteAllEstimateItems,
  replaceAllEstimateItems
};
