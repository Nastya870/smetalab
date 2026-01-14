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

  // 🚀 УЛЬТРА-ОПТИМИЗАЦИЯ: Массовая вставка через UNNEST и ON CONFLICT
  try {
    // 🛡️ ДЕДУПЛИКАЦИЯ: Если в одной пачке попались одинаковые коды, 
    // PostgreSQL выдаст ошибку "affect row a second time". Оставляем последний.
    const uniqueWorksMap = new Map();
    works.forEach(w => {
      if (w.code) uniqueWorksMap.set(String(w.code).trim(), w);
    });
    const uniqueList = Array.from(uniqueWorksMap.values());

    const codes = uniqueList.map(w => String(w.code || '').trim());
    const names = uniqueList.map(w => String(w.name || '').trim());
    const units = uniqueList.map(w => w.unit || 'шт');
    const basePrices = uniqueList.map(w => parseFloat(w.basePrice) || 0);
    const phases = uniqueList.map(w => w.phase || null);
    const sections = uniqueList.map(w => w.section || null);
    const subsections = uniqueList.map(w => w.subsection || null);

    const params = [
      codes, names, units, basePrices, phases, sections, subsections,
      isGlobal === true, tenantId
    ];

    let query = `
      INSERT INTO works (
        code, name, unit, base_price, phase, section, subsection, is_global, tenant_id, created_at, updated_at
      )
      SELECT * FROM UNNEST(
        $1::text[], $2::text[], $3::text[], $4::numeric[], $5::text[], $6::text[], $7::text[],
        ARRAY_FILL($8::boolean, ARRAY[CARDINALITY($1::text[])]),
        ARRAY_FILL($9::uuid, ARRAY[CARDINALITY($1::text[])]),
        ARRAY_FILL(NOW(), ARRAY[CARDINALITY($1::text[])]),
        ARRAY_FILL(NOW(), ARRAY[CARDINALITY($1::text[])])
      )
    `;

    if (mode === 'replace') {
      // Режим Upsert (Обновить существующие)
      query += `
        ON CONFLICT (code, is_global, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'))
        DO UPDATE SET 
          name = EXCLUDED.name,
          unit = EXCLUDED.unit,
          base_price = EXCLUDED.base_price,
          phase = EXCLUDED.phase,
          section = EXCLUDED.section,
          subsection = EXCLUDED.subsection,
          updated_at = NOW()
      `;
    } else {
      // Режим Add (Пропускать дубликаты)
      query += `
        ON CONFLICT (code, is_global, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'))
        DO NOTHING
      `;
    }

    query += ' RETURNING code;';

    const dbResult = await db.query(query, params);
    const importedCodes = new Set(dbResult.rows.map(r => r.code));

    const failed = works.filter(w => !importedCodes.has(w.code)).map(w => ({
      code: w.code,
      name: w.name,
      error: mode === 'add' ? 'Работа с таким кодом уже существует' : 'Ошибка при сохранении'
    }));

    invalidateWorksCache();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Импорт завершен',
      successCount: importedCodes.size,
      errorCount: failed.length,
      errors: failed.length > 0 ? failed : undefined,
      mode: mode
    });
  } catch (err) {
    console.error('[BULK WORKS IMPORT ERROR]', err);
    throw err;
  }
});

export default {
  bulkCreateWorks
};
