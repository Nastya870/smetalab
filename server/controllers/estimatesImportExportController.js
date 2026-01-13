import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import db from '../config/database.js';
import estimatesRepository from '../repositories/estimatesRepository.js';
import estimateItemsRepository from '../repositories/estimateItemsRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const BULK_IMPORT_LIMIT = 1000;
const CSV_DELIMITER = ';';

const parseNumber = (value) => {
    if (!value) return 0;
    const normalized = String(value).replace(/,/g, '.').replace(/\s/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
};

/**
 * Экспорт позиций сметы в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId } = req.user;

    const estimate = await estimatesRepository.findByIdWithDetails(estimateId, tenantId);
    if (!estimate) throw new BadRequestError('Смета не найдена');

    const csvHeader = `Тип${CSV_DELIMITER}Фаза${CSV_DELIMITER}Раздел${CSV_DELIMITER}Подраздел${CSV_DELIMITER}Наименование${CSV_DELIMITER}Ед. изм.${CSV_DELIMITER}Кол-во${CSV_DELIMITER}Цена${CSV_DELIMITER}Накладные %${CSV_DELIMITER}Прибыль %${CSV_DELIMITER}Налог %\n`;

    const csvRows = [];
    const items = estimate.items || [];

    for (const item of items) {
        // Добавляем строку работы
        csvRows.push([
            'Работа',
            escapeCsvField(item.phase || ''),
            escapeCsvField(item.section || ''),
            escapeCsvField(item.subsection || ''),
            escapeCsvField(item.name || ''),
            escapeCsvField(item.unit || ''),
            item.quantity || 0,
            item.unit_price || 0,
            item.overhead_percent || 0,
            item.profit_percent || 0,
            item.tax_percent || 0
        ].join(CSV_DELIMITER));

        // Добавляем строки материалов для этой работы
        if (item.materials && item.materials.length > 0) {
            for (const mat of item.materials) {
                csvRows.push([
                    'Материал',
                    '', // Фаза
                    '', // Раздел
                    '', // Подраздел
                    escapeCsvField(mat.name || mat.material_name || ''),
                    escapeCsvField(mat.unit || ''),
                    mat.quantity || 0,
                    mat.unit_price || 0,
                    0, // Накладные
                    0, // Прибыль
                    0  // Налог
                ].join(CSV_DELIMITER));
            }
        }
    }

    const csv = csvHeader + csvRows.join('\n');
    const filename = `estimate_${estimateId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.write('\ufeff');
    res.write(csv);
    res.end();
});

/**
 * Импорт позиций в смету
 */
export const importFromCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId, userId } = req.user;
    const { file } = req;
    const { mode = 'add' } = req.body;

    if (!file) throw new BadRequestError('Файл не загружен');

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
                const name = row['Наименование']?.trim() || row['Наименование работ']?.trim();
                const type = row['Тип']?.trim();

                if (!name) {
                    errors.push({ line: lineNumber, message: 'Отсутствует Наименование' });
                    return;
                }

                if (type === 'Материал') {
                    // Если это материал, добавляем его в последнюю созданную работу
                    if (results.length > 0) {
                        const lastWork = results[results.length - 1];
                        if (!lastWork.materials) lastWork.materials = [];

                        lastWork.materials.push({
                            name: name,
                            unit: row['Ед. изм.']?.trim() || 'шт',
                            quantity: parseNumber(row['Кол-во']),
                            unit_price: parseNumber(row['Цена']),
                            // Мы будем искать ID по имени позже в цикле создания
                        });
                    }
                } else {
                    // По умолчанию считаем работой
                    results.push({
                        estimateId,
                        phase: row['Фаза']?.trim() || null,
                        section: row['Раздел']?.trim() || null,
                        subsection: row['Подраздел']?.trim() || null,
                        name: name,
                        unit: row['Ед. изм.']?.trim() || 'шт',
                        quantity: parseNumber(row['Кол-во']),
                        unit_price: parseNumber(row['Цена']),
                        overhead_percent: parseNumber(row['Накладные %']),
                        profit_percent: parseNumber(row['Прибыль %']),
                        tax_percent: parseNumber(row['Налог %']),
                        item_type: 'work',
                        materials: []
                    });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 0) throw new BadRequestError('Ошибки в CSV', { errors });
    if (results.length === 0) throw new BadRequestError('Файл пуст');

    // Оптимизация: загружаем все материалы один раз
    console.log(`[importFromCSV] Starting import for estimate ${estimateId}, mapping materials...`);

    let materialMap = new Map();
    try {
        const allMaterialsQuery = `
            SELECT id, name FROM materials 
            WHERE tenant_id = $1 OR is_global = true
        `;
        const allMaterialsResult = await db.query(allMaterialsQuery, [tenantId]);
        allMaterialsResult.rows.forEach(m => {
            if (m.name) {
                materialMap.set(m.name.toLowerCase().trim(), m.id);
            }
        });
        console.log(`[importFromCSV] Loaded ${materialMap.size} materials for mapping`);
    } catch (err) {
        console.error('[importFromCSV] Error loading materials for mapping:', err);
        // Продолжаем без мапинга, если сорвалось
    }

    // Сопоставляем материалы
    for (const work of results) {
        if (work.materials) {
            for (const mat of work.materials) {
                if (mat.name) {
                    const matName = mat.name.toLowerCase().trim();
                    if (materialMap.has(matName)) {
                        mat.material_id = materialMap.get(matName);
                    }
                }
            }
        }
    }

    if (mode === 'replace') {
        console.log(`[importFromCSV] Mode is REPLACE, deleting old items for estimate ${estimateId}`);
        await estimateItemsRepository.deleteAllByEstimateId(estimateId, tenantId);
    }

    // Используем массовое создание в одной транзакции
    console.log(`[importFromCSV] Inserting ${results.length} work items into database...`);
    const imported = await estimateItemsRepository.bulkCreate(estimateId, results, tenantId);

    console.log(`[importFromCSV] Import successful, created ${imported.length} items`);

    res.status(StatusCodes.OK).json({
        message: 'Импорт завершен',
        successCount: imported.length,
        errorCount: 0,
        success: true
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
