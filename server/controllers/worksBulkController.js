import { StatusCodes } from 'http-status-codes';
import * as worksRepository from '../repositories/worksRepository.js';

/**
 * Массовое создание работ (bulk import)
 * POST /api/works/bulk
 */
export async function bulkCreateWorks(req, res) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { works, mode = 'add', isGlobal = false } = req.body;

    if (!works || !Array.isArray(works)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Неверный формат данных. Ожидается массив работ.'
      });
    }

    if (works.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Массив работ пуст'
      });
    }

    // Проверка прав для глобальных работ
    if (isGlobal && !isSuperAdmin) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: 'Только суперадмин может импортировать глобальные работы'
      });
    }

    // Если режим "replace" - удаляем существующие работы
    if (mode === 'replace') {
      const deleteParams = isGlobal ? { isGlobal: 'true' } : { isGlobal: 'false' };
      const existingWorks = await worksRepository.findAll(deleteParams, tenantId);
      
      for (const work of existingWorks) {
        await worksRepository.deleteWork(work.id, tenantId);
      }
    }

    // Импортируем работы
    const imported = [];
    const importErrors = [];

    for (const workData of works) {
      try {
        // Валидация обязательных полей
        if (!workData.code || !workData.name) {
          importErrors.push({
            work: workData,
            error: 'Отсутствуют обязательные поля: code или name'
          });
          continue;
        }

        // Валидация базовой цены
        const basePrice = parseFloat(workData.basePrice) || 0;
        if (basePrice < 0) {
          importErrors.push({
            work: workData,
            error: 'Базовая цена не может быть отрицательной'
          });
          continue;
        }

        const created = await worksRepository.create({
          code: workData.code,
          name: workData.name,
          category: workData.category || '',
          unit: workData.unit || '',
          basePrice: basePrice,
          phase: workData.phase || null,
          section: workData.section || null,
          subsection: workData.subsection || null,
          isGlobal: isGlobal
        }, tenantId);

        imported.push(created);
      } catch (error) {
        importErrors.push({
          work: workData,
          error: error.message
        });
      }
    }

    res.status(StatusCodes.OK).json({
      message: 'Импорт завершен',
      successCount: imported.length,
      errorCount: importErrors.length,
      errors: importErrors.length > 0 ? importErrors : undefined,
      mode: mode
    });

  } catch (error) {
    console.error('Bulk import works error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Ошибка при импорте работ',
      error: error.message
    });
  }
}
