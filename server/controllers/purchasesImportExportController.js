import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import db from '../config/database.js';
import * as purchasesRepository from '../repositories/purchasesRepository.js';
import categoriesRepository from '../repositories/categoriesRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const CSV_DELIMITER = ';';

const parseNumber = (value) => {
    if (!value) return 0;
    const normalized = String(value).replace(/,/g, '.').replace(/\s/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
};

/**
 * Экспорт закупок в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId, userId } = req.user;

    const purchases = await purchasesRepository.getPurchasesByEstimate(tenantId, estimateId, userId);

    const csvHeader = `Артикул${CSV_DELIMITER}Наименование${CSV_DELIMITER}Единица измерения${CSV_DELIMITER}Цена${CSV_DELIMITER}Кол-во${CSV_DELIMITER}Сумма${CSV_DELIMITER}Закуплено${CSV_DELIMITER}Категория LV1${CSV_DELIMITER}Категория LV2${CSV_DELIMITER}Категория LV3${CSV_DELIMITER}Категория LV4\n`;

    const csvRows = purchases.map(p => {
        const pathParts = (p.category_full_path || p.category || '').split(' / ');
        return [
            escapeCsvField(p.sku || ''),
            escapeCsvField(p.name || ''),
            escapeCsvField(p.unit || ''),
            p.price || 0,
            p.quantity || 0,
            p.total || 0,
            p.purchasedQuantity || 0,
            escapeCsvField(pathParts[0] || ''),
            escapeCsvField(pathParts[1] || ''),
            escapeCsvField(pathParts[2] || ''),
            escapeCsvField(pathParts[3] || '')
        ].join(CSV_DELIMITER);
    }).join('\n');

    const csv = csvHeader + csvRows;
    const filename = `purchases_${estimateId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.write('\ufeff');
    res.write(csv);
    res.end();
});

/**
 * Импорт закупок из CSV
 */
export const importFromCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId, userId } = req.user;
    const { file } = req;
    const { mode = 'add', projectId } = req.body;

    if (!file) throw new BadRequestError('Файл не загружен');
    if (!projectId) throw new BadRequestError('ID проекта обязателен');

    const results = [];
    const errors = [];
    let lineNumber = 1;

    const stream = Readable.from(file.buffer.toString('utf8'));

    await new Promise((resolve, reject) => {
        stream
            .pipe(csvParser({
                separator: CSV_DELIMITER,
                mapHeaders: ({ header }) => header.trim(),
                skipEmptyLines: true
            }))
            .on('data', (row) => {
                lineNumber++;
                if (!row['Наименование']) {
                    errors.push({ line: lineNumber, message: 'Отсутствует Наименование' });
                    return;
                }

                results.push({
                    sku: row['Артикул']?.trim() || '',
                    name: row['Наименование'].trim(),
                    unit: row['Ед. изм.']?.trim() || 'шт',
                    quantity: parseNumber(row['Кол-во']),
                    price: parseNumber(row['Цена']),
                    total: parseNumber(row['Сумма']),
                    purchasedQuantity: parseNumber(row['Закуплено']),
                    // Иерархические категории
                    category_lv1: (row['category_lv1'] || row['Категория LV1'] || row['Категория'])?.trim() || '',
                    category_lv2: (row['category_lv2'] || row['Категория LV2'])?.trim() || '',
                    category_lv3: (row['category_lv3'] || row['Категория LV3'])?.trim() || '',
                    category_lv4: (row['category_lv4'] || row['Категория LV4'])?.trim() || '',
                    category: (row['Категория'] || row['category'])?.trim() || ''
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 0) throw new BadRequestError('Ошибки в CSV', { errors });
    if (results.length === 0) throw new BadRequestError('Файл пуст');

    if (mode === 'replace') {
        await purchasesRepository.deletePurchases(tenantId, estimateId, userId);
    }

    // Получаем материалы для сопоставления (НУЖНО ВЕРНУТЬ)
    const materialsResult = await db.query(
        'SELECT id, sku, name FROM materials WHERE tenant_id = $1 OR is_global = TRUE',
        [tenantId]
    );
    const materialsMap = new Map();
    materialsResult.rows.forEach(m => {
        if (m.sku) materialsMap.set(m.sku, m.id);
        materialsMap.set(m.name, m.id);
    });

    const categoryCache = new Map();
    const imported = [];

    for (const data of results) {
        // Резолвим иерархию категорий
        const levels = [
            data.category_lv1,
            data.category_lv2,
            data.category_lv3,
            data.category_lv4
        ].filter(Boolean);

        if (levels.length === 0 && data.category) {
            levels.push(data.category);
        }
        if (levels.length === 0) {
            levels.push('Прочее');
        }

        const cacheKey = levels.join(' > ');
        let resolved;
        if (categoryCache.has(cacheKey)) {
            resolved = categoryCache.get(cacheKey);
        } else {
            resolved = await categoriesRepository.resolveHierarchy(levels, {
                tenantId: tenantId,
                isGlobal: false,
                type: 'material'
            });
            categoryCache.set(cacheKey, resolved);
        }

        const materialId = materialsMap.get(data.sku) || materialsMap.get(data.name);
        if (!materialId) continue;

        const query = `
      INSERT INTO purchases (
        tenant_id, project_id, estimate_id, material_id,
        material_sku, material_name, category, category_id, category_full_path, unit,
        quantity, unit_price, total_price, purchased_quantity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

        const values = [
            tenantId, projectId, estimateId, materialId,
            data.sku, data.name, levels[levels.length - 1], resolved.id, resolved.fullPath, data.unit,
            data.quantity, data.price, data.total, data.purchasedQuantity
        ];

        const result = await db.query(query, values);
        imported.push(result.rows[0]);
    }

    res.status(StatusCodes.OK).json({
        message: 'Импорт завершен',
        successCount: imported.length
    });
});

function escapeCsvField(field) {
    if (field == null) return '';
    const str = String(field);
    if (str.includes(CSV_DELIMITER) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
