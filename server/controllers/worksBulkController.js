import { StatusCodes } from 'http-status-codes';
import db from '../config/database.js';
import { invalidateWorksCache } from '../cache/referencesCache.js';
import { catchAsync, BadRequestError, ConflictError } from '../utils/errors.js';

/**
 * Массовое создание работ (bulk import)
 * POST /api/works/bulk
 */
export const bulkCreateWorks = catchAsync(async (req, res) => {
  console.log('📦 Bulk import works started');
  const { tenantId, isSuperAdmin } = req.user;
  const { works, mode = 'add', isGlobal = false } = req.body;
  
  console.log(`📊 Import params: mode=${mode}, isGlobal=${isGlobal}, works count=${works?.length}, tenantId=${tenantId}`);

  if (!works || !Array.isArray(works)) {
    console.log('❌ Invalid data format');
    throw new BadRequestError('Неверный формат данных. Ожидается массив работ.');
  }

  if (works.length === 0) {
    throw new BadRequestError('Массив работ пуст');
  }

  // Проверка прав для глобальных работ
  if (isGlobal && !isSuperAdmin) {
    throw new BadRequestError('Только суперадмин может импортировать глобальные работы');
  }

    // Если режим "replace" - удаляем существующие работы
    if (mode === 'replace') {
      if (isGlobal) {
        await db.query('DELETE FROM works WHERE is_global = TRUE');
      } else {
        await db.query('DELETE FROM works WHERE is_global = FALSE AND tenant_id = $1', [tenantId]);
      }
    }

    // Импортируем работы
    const imported = [];
    const importErrors = [];
    
    console.log(`🔄 Starting import of ${works.length} works...`);

    for (let i = 0; i < works.length; i++) {
      const workData = works[i];
      try {
        // Валидация обязательных полей
        if (!workData.code || !workData.name) {
          console.log(`⚠️  Work ${i+1}: Missing required fields`);
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

        // Вставляем работу
        const result = await db.query(
          `INSERT INTO works (code, name, unit, base_price, phase, section, subsection, is_global, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING id, code, name, unit, base_price, phase, section, subsection, is_global, tenant_id`,
          [
            workData.code,
            workData.name,
            workData.unit || 'шт',
            basePrice,
            workData.phase || null,
            workData.section || null,
            workData.subsection || null,
            isGlobal,
            isGlobal ? null : tenantId
          ]
        );

        imported.push(result.rows[0]);
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Imported ${i + 1}/${works.length} works`);
        }
      } catch (error) {
        console.log(`❌ Error importing work ${i+1} (${workData.code}): ${error.message}`);
        importErrors.push({
          work: workData,
          error: error.message
        });
      }
    }

  // Инвалидируем кэш
  invalidateWorksCache();

  console.log(`✅ Import completed: ${imported.length} success, ${importErrors.length} errors`);

  res.status(StatusCodes.OK).json({
    message: 'Импорт завершен',
    successCount: imported.length,
    errorCount: importErrors.length,
    errors: importErrors.length > 0 ? importErrors : undefined,
    mode: mode
  });
});
