import db from '../config/database.js';
import { StatusCodes } from 'http-status-codes';
import { catchAsync, BadRequestError } from '../utils/errors.js';

/**
 * Высокопроизводительный импорт позиций сметы
 */
export const bulkImportEstimateItems = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { items, mode = 'add' } = req.body;
    const { tenantId } = req.user;

    if (!items || !Array.isArray(items)) {
        throw new BadRequestError('Массив items обязателен');
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // 1. Проверка доступа к смете
        const checkQuery = `
      SELECT id FROM estimates 
      WHERE id = $1 AND tenant_id = $2
    `;
        const checkResult = await client.query(checkQuery, [estimateId, tenantId]);
        if (checkResult.rows.length === 0) {
            throw new BadRequestError('Смета не найдена или нет доступа');
        }

        // 2. Если режим replace - удаляем старые
        if (mode === 'replace') {
            await client.query('DELETE FROM estimate_item_materials WHERE estimate_item_id IN (SELECT id FROM estimate_items WHERE estimate_id = $1)', [estimateId]);
            await client.query('DELETE FROM estimate_items WHERE estimate_id = $1', [estimateId]);
        }

        // 3. Получаем начальную позицию
        const posResult = await client.query('SELECT COALESCE(MAX(position_number), 0) as max_pos FROM estimate_items WHERE estimate_id = $1', [estimateId]);
        let currentPos = parseInt(posResult.rows[0].max_pos, 10);

        // 4. Подготовка данных для UNNEST
        // Мы делим импорт на "Работы" и "Материалы". 
        // Сначала вставляем все работы одним пахом, получаем их ID, потом вставляем материалы.

        // Но так как у нас могут быть смешанные данные в CSV, мы сначала нормализуем их.
        // Если в JSON пришел плоский список, где некоторые "работы" на самом деле материалы последней работы.

        const worksData = [];
        const materialsData = []; // Будем заполнять после получения ID работ

        // Нормализация: группировка материалов под работы
        let lastWorkIndex = -1;
        const processedItems = [];

        items.forEach(item => {
            if (item.item_type === 'material' && processedItems.length > 0) {
                const lastWork = processedItems[processedItems.length - 1];
                if (!lastWork.materials) lastWork.materials = [];
                lastWork.materials.push(item);
            } else {
                const work = { ...item, item_type: 'work', materials: item.materials || [] };
                processedItems.push(work);
            }
        });

        if (processedItems.length === 0) {
            await client.query('COMMIT');
            return res.status(StatusCodes.OK).json({ success: true, successCount: 0 });
        }

        // Вставляем работы через UNNEST
        const names = processedItems.map(i => i.name);
        const units = processedItems.map(i => i.unit || 'шт');
        const quantities = processedItems.map(i => parseFloat(i.quantity) || 0);
        const prices = processedItems.map(i => parseFloat(i.unit_price || i.price) || 0);
        const codes = processedItems.map(i => i.code || null);
        const phases = processedItems.map(i => i.phase || null);
        const sections = processedItems.map(i => i.section || null);
        const subsections = processedItems.map(i => i.subsection || null);
        const positions = processedItems.map((_, idx) => ++currentPos);
        const types = processedItems.map(i => i.item_type || 'work');

        const insertWorksQuery = `
      INSERT INTO estimate_items (
        estimate_id, position_number, item_type, name, code, unit, quantity, unit_price,
        phase, section, subsection
      )
      SELECT $1, * FROM UNNEST(
        $2::int[], $3::text[], $4::text[], $5::text[], $6::text[], $7::numeric[], $8::numeric[],
        $9::text[], $10::text[], $11::text[]
      )
      RETURNING id, name
    `;

        const worksResult = await client.query(insertWorksQuery, [
            estimateId, positions, types, names, codes, units, quantities, prices, phases, sections, subsections
        ]);

        const workIdMap = new Map();
        worksResult.rows.forEach((row, idx) => {
            workIdMap.set(idx, row.id);
        });

        // 5. Поиск существующих ID материалов (маппинг по имени/артикулу)
        const allMaterialsQuery = `
            SELECT id, name, sku FROM materials 
            WHERE tenant_id = $1 OR is_global = true
        `;
        const allMaterialsResult = await client.query(allMaterialsQuery, [tenantId]);
        const materialMapByName = new Map();
        const materialMapBySku = new Map();
        allMaterialsResult.rows.forEach(m => {
            if (m.name) materialMapByName.set(m.name.toLowerCase().trim(), m.id);
            if (m.sku) materialMapBySku.set(m.sku.toLowerCase().trim(), m.id);
        });

        // 6. Теперь вставляем материалы для каждой работы
        const matEstimateItemIds = [];
        const matNames = [];
        const matUnits = [];
        const matQuantities = [];
        const matPrices = [];
        const matMaterialIds = [];
        const matSkus = [];
        const matConsumptions = [];
        const matAutoCalc = [];
        const matIsRequired = [];
        const matNotes = [];

        processedItems.forEach((work, workIdx) => {
            const estimateItemId = workIdMap.get(workIdx);
            if (work.materials && work.materials.length > 0) {
                work.materials.forEach(mat => {
                    let materialId = mat.material_id;
                    const name = (mat.name || mat.material_name || '').trim();
                    const sku = (mat.sku || mat.material_sku || '').trim();

                    // Try lookup if ID is missing
                    if (!materialId && name) {
                        materialId = materialMapByName.get(name.toLowerCase());
                    }
                    if (!materialId && sku) {
                        materialId = materialMapBySku.get(sku.toLowerCase());
                    }

                    // КРИТИЧНО: База требует material_id NOT NULL
                    if (!materialId) {
                        console.warn(`[bulkImportEstimateItems] Skipping material without ID (not found in catalog): ${name}`);
                        return;
                    }

                    matEstimateItemIds.push(estimateItemId);
                    matNames.push(name);
                    matUnits.push(mat.unit || mat.material_unit || 'шт');
                    matQuantities.push(parseFloat(mat.quantity) || 0);
                    matPrices.push(parseFloat(mat.unit_price || mat.price) || 0);
                    matMaterialIds.push(materialId);
                    matSkus.push(sku);
                    matConsumptions.push(parseFloat(mat.consumption || mat.consumption_coefficient) || 1.0);
                    matAutoCalc.push(mat.auto_calculate !== undefined ? !!mat.auto_calculate : true);
                    matIsRequired.push(mat.is_required !== false);
                    matNotes.push(mat.notes || '');
                });
            }
        });

        if (matNames.length > 0) {
            const insertMaterialsQuery = `
          INSERT INTO estimate_item_materials (
            estimate_item_id, material_name, material_unit, quantity, unit_price, material_id,
            material_sku, consumption_coefficient, auto_calculate, is_required, notes
          )
          SELECT * FROM UNNEST(
            $1::uuid[], $2::text[], $3::text[], $4::numeric[], $5::numeric[], $6::int[],
            $7::text[], $8::numeric[], $9::boolean[], $10::boolean[], $11::text[]
          )
        `;
            await client.query(insertMaterialsQuery, [
                matEstimateItemIds, matNames, matUnits, matQuantities, matPrices, matMaterialIds,
                matSkus, matConsumptions, matAutoCalc, matIsRequired, matNotes
            ]);
        }

        await client.query('COMMIT');

        res.status(StatusCodes.OK).json({
            success: true,
            successCount: processedItems.length,
            message: `Успешно импортировано ${processedItems.length} позиций`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[bulkImportEstimateItems] Error:', error);
        throw error;
    } finally {
        client.release();
    }
});
