import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import * as materialsRepository from '../repositories/materialsRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const BULK_IMPORT_LIMIT = 50000;
const CSV_DELIMITER = ';';

const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return 0;
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

    const isGlobalBool = isGlobal === 'true' || isGlobal === true;

    if (!file) throw new BadRequestError('Файл не загружен');
    if (isGlobalBool && !isSuperAdmin) {
        throw new BadRequestError('Только суперадмин может импортировать глобальные материалы. Ваш статус: ' + (isSuperAdmin ? 'Admin' : 'User'));
    }

    const results = [];
    const errors = [];
    let lineNumber = 1;

    // Определяем разделитель (пробуем ; потом ,)
    const content = file.buffer.toString('utf8');
    const firstLine = content.split('\n')[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    console.log(`[IMPORT] Detected delimiter: "${delimiter}" from first line: "${firstLine.substring(0, 50)}..."`);

    const stream = Readable.from(content);

    await new Promise((resolve, reject) => {
        stream
            .pipe(csvParser({
                separator: delimiter,
                mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, ''), // Убираем BOM если есть
                skipEmptyLines: true
            }))
            .on('data', (row) => {
                lineNumber++;
                // Поддержка разных имен колонок
                const sku = row['Артикул'] || row['sku'] || row['SKU'];
                const name = row['Наименование'] || row['name'] || row['Name'];

                if (!sku || !name) {
                    // Пропускаем пустые строки или строки без ключевых данных, но логируем
                    if (Object.values(row).some(v => v)) {
                        errors.push({ line: lineNumber, message: `Отсутствуют Артикул или Наименование. Колонки: ${Object.keys(row).join(',')}` });
                    }
                    return;
                }

                results.push({
                    sku: sku.trim(),
                    name: name.trim(),
                    unit: (row['Единица измерения'] || row['Ед. изм.'] || row['unit'] || row['Unit'])?.trim() || 'шт',
                    price: parseNumber(row['Цена'] || row['price'] || row['Price']),
                    supplier: (row['Поставщик'] || row['supplier'] || row['Supplier'])?.trim() || '',
                    weight: parseNumber(row['Вес (кг)'] || row['Вес'] || row['weight'] || row['Weight']),
                    category: (row['Категория'] || row['category'] || row['Category'])?.trim() || '',
                    productUrl: (row['URL товара'] || row['Ссылка на товар'] || row['Ссылка'] || row['product_url'])?.trim() || '',
                    image: (row['URL изображения'] || row['Ссылка на изображение'] || row['Изображение'] || row['image'])?.trim() || '',
                    isGlobal: isGlobalBool
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 100) {
        throw new BadRequestError(`Слишком много ошибок в формате CSV (${errors.length}). Проверьте разделитель и заголовки.`, { firstErrors: errors.slice(0, 5) });
    }

    if (results.length === 0) {
        throw new BadRequestError('Файл пуст или не удалось распознать заголовки. Ожидаются: Артикул, Наименование.');
    }

    if (results.length > BULK_IMPORT_LIMIT) {
        throw new BadRequestError(`Превышен лимит импорта: ${results.length} > ${BULK_IMPORT_LIMIT}`);
    }

    console.log(`[IMPORT] Starting processing ${results.length} materials in mode: ${mode}`);

    if (mode === 'replace') {
        console.log(`[IMPORT] Mode REPLACE: clearing existing materials (isGlobal: ${isGlobalBool})`);
        const existing = await materialsRepository.findAll({ isGlobal: isGlobalBool.toString() }, tenantId);
        // Удаляем пачками по 100 для скорости
        for (let i = 0; i < existing.length; i += 100) {
            const chunk = existing.slice(i, i + 100);
            await Promise.all(chunk.map(m => materialsRepository.deleteMaterial(m.id, tenantId)));
        }
    }

    const imported = [];
    const importErrors = [];

    // Обрабатываем пачками по 50 для баланса скорости и стабильности
    const BATCH_SIZE = 50;
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (data) => {
            try {
                const created = await materialsRepository.create(data, tenantId);
                imported.push(created);
            } catch (e) {
                importErrors.push({ sku: data.sku, error: e.message });
            }
        }));

        if (i % 500 === 0 && i > 0) {
            console.log(`[IMPORT] Progress: ${i}/${results.length}...`);
        }
    }

    res.status(StatusCodes.OK).json({
        success: true,
        message: 'Импорт завершен',
        successCount: imported.length,
        errorCount: importErrors.length,
        totalProcessed: results.length,
        errors: importErrors.length > 0 ? importErrors.slice(0, 100) : undefined // Ограничиваем список ошибок в ответе
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
