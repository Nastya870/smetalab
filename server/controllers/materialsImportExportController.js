import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import * as materialsRepository from '../repositories/materialsRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const BULK_IMPORT_LIMIT = 1000;
const CSV_DELIMITER = ';';

const parseNumber = (value) => {
    if (!value) return 0;
    // Заменяем запятую на точку и убираем неразрывные пробелы/обычные пробелы
    const normalized = String(value).replace(/,/g, '.').replace(/\s/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
};

/**
 * Экспорт материалов в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { tenantId } = req.user;
    const { isGlobal } = req.query;

    const params = {};
    if (isGlobal === 'true') params.isGlobal = 'true';
    if (isGlobal === 'false') params.isGlobal = 'false';

    console.log('[MATERIALS EXPORT] Starting export with params:', { isGlobal, tenantId });

    const materials = await materialsRepository.findAll(params, tenantId);

    console.log(`[MATERIALS EXPORT] Found ${materials.length} materials to export`);

    const csvHeader = `Артикул${CSV_DELIMITER}Наименование${CSV_DELIMITER}Единица измерения${CSV_DELIMITER}Цена${CSV_DELIMITER}Поставщик${CSV_DELIMITER}Вес (кг)${CSV_DELIMITER}Категория${CSV_DELIMITER}URL товара${CSV_DELIMITER}URL изображения\n`;

    const csvRows = materials.map(m => {
        return [
            escapeCsvField(m.sku),
            escapeCsvField(m.name),
            escapeCsvField(m.unit),
            m.price || 0,
            escapeCsvField(m.supplier || ''),
            m.weight || 0,
            escapeCsvField(m.category || ''),
            escapeCsvField(m.product_url || ''),
            escapeCsvField(m.image || '')
        ].join(CSV_DELIMITER);
    }).join('\n');

    const csv = csvHeader + csvRows;
    const filename = isGlobal === 'true' ? 'materials_global.csv' : `materials_tenant_${tenantId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.write('\ufeff');
    res.write(csv);
    res.end();
});

/**
 * Экспорт шаблона
 */
export const exportTemplate = catchAsync(async (req, res) => {
    const csvHeader = `Артикул${CSV_DELIMITER}Наименование${CSV_DELIMITER}Единица измерения${CSV_DELIMITER}Цена${CSV_DELIMITER}Поставщик${CSV_DELIMITER}Вес (кг)${CSV_DELIMITER}Категория${CSV_DELIMITER}URL товара${CSV_DELIMITER}URL изображения\n`;
    const examples = [
        `MAT-001${CSV_DELIMITER}Цемент М500${CSV_DELIMITER}мешок${CSV_DELIMITER}450${CSV_DELIMITER}СтройМир${CSV_DELIMITER}50${CSV_DELIMITER}Сухие смеси${CSV_DELIMITER}${CSV_DELIMITER}`,
        `MAT-002${CSV_DELIMITER}Кирпич красный${CSV_DELIMITER}шт${CSV_DELIMITER}15${CSV_DELIMITER}КирпичЗавод${CSV_DELIMITER}3.5${CSV_DELIMITER}Стеновые материалы${CSV_DELIMITER}${CSV_DELIMITER}`
    ].join('\n');

    const csv = csvHeader + examples;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="materials_template.csv"');
    res.write('\ufeff');
    res.write(csv);
    res.end();
});

/**
 * Импорт материалов
 */
export const importFromCSV = catchAsync(async (req, res) => {
    const { tenantId, isSuperAdmin } = req.user;
    const { file } = req;
    const { mode = 'add', isGlobal = false } = req.body;

    if (!file) throw new BadRequestError('Файл не загружен');
    if (isGlobal && !isSuperAdmin) throw new BadRequestError('Только суперадмин может импортировать глобальные материалы');

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
                if (!row['Артикул'] || !row['Наименование']) {
                    errors.push({ line: lineNumber, message: 'Отсутствуют Артикул или Наименование' });
                    return;
                }

                results.push({
                    sku: row['Артикул']?.trim(),
                    name: row['Наименование']?.trim(),
                    unit: (row['Единица измерения'] || row['Ед. изм.'])?.trim() || 'шт',
                    price: parseNumber(row['Цена']),
                    supplier: row['Поставщик']?.trim() || '',
                    weight: parseNumber(row['Вес (кг)'] || row['Вес']),
                    category: row['Категория']?.trim() || '',
                    productUrl: (row['URL товара'] || row['Ссылка на товар'] || row['Ссылка'])?.trim() || '',
                    image: (row['URL изображения'] || row['Ссылка на изображение'] || row['Изображение'])?.trim() || '',
                    isGlobal: isGlobal === 'true' || isGlobal === true
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 0) throw new BadRequestError('Ошибки в CSV', { errors });
    if (results.length === 0) throw new BadRequestError('Файл пуст');
    if (results.length > BULK_IMPORT_LIMIT) throw new BadRequestError(`Лимит ${BULK_IMPORT_LIMIT} превышен`);

    if (mode === 'replace') {
        const existing = await materialsRepository.findAll({ isGlobal: isGlobal.toString() }, tenantId);
        for (const m of existing) await materialsRepository.deleteMaterial(m.id, tenantId);
    }

    const imported = [];
    const importErrors = [];

    for (const data of results) {
        try {
            const created = await materialsRepository.create(data, tenantId);
            imported.push(created);
        } catch (e) {
            importErrors.push({ sku: data.sku, error: e.message });
        }
    }

    res.status(StatusCodes.OK).json({
        message: 'Импорт завершен',
        successCount: imported.length,
        errorCount: importErrors.length,
        errors: importErrors.length > 0 ? importErrors : undefined
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
