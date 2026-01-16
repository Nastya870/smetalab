import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import * as materialsRepository from '../repositories/materialsRepository.js';
import categoriesRepository from '../repositories/categoriesRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';
import { invalidateMaterialsCache } from '../cache/referencesCache.js';

const BULK_IMPORT_LIMIT = 100000;
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

    const csvHeader = `Артикул${CSV_DELIMITER}Наименование${CSV_DELIMITER}Единица измерения${CSV_DELIMITER}Цена${CSV_DELIMITER}Поставщик${CSV_DELIMITER}Вес (кг)${CSV_DELIMITER}Категория LV1${CSV_DELIMITER}Категория LV2${CSV_DELIMITER}Категория LV3${CSV_DELIMITER}Категория LV4${CSV_DELIMITER}URL товара${CSV_DELIMITER}URL изображения\n`;

    const csvRows = materials.map(m => {
        // Мы можем попробовать восстановить уровни из full_path, если они там есть через разделитель
        const pathParts = (m.category_full_path || m.category || '').split(' / ');
        return [
            escapeCsvField(m.sku),
            escapeCsvField(m.name),
            escapeCsvField(m.unit),
            m.price || 0,
            escapeCsvField(m.supplier || ''),
            m.weight || 0,
            escapeCsvField(pathParts[0] || ''),
            escapeCsvField(pathParts[1] || ''),
            escapeCsvField(pathParts[2] || ''),
            escapeCsvField(pathParts[3] || ''),
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
    const csvHeader = `Артикул${CSV_DELIMITER}Наименование${CSV_DELIMITER}Единица измерения${CSV_DELIMITER}Цена${CSV_DELIMITER}Поставщик${CSV_DELIMITER}Вес (кг)${CSV_DELIMITER}Категория LV1${CSV_DELIMITER}Категория LV2${CSV_DELIMITER}Категория LV3${CSV_DELIMITER}Категория LV4${CSV_DELIMITER}URL товара${CSV_DELIMITER}URL изображения\n`;

    const examples = [
        `MAT-001${CSV_DELIMITER}Цемент М500${CSV_DELIMITER}мешок${CSV_DELIMITER}450${CSV_DELIMITER}СтройМир${CSV_DELIMITER}50${CSV_DELIMITER}Сухие смеси${CSV_DELIMITER}Цемент${CSV_DELIMITER}${CSV_DELIMITER}${CSV_DELIMITER}${CSV_DELIMITER}`,
        `MAT-002${CSV_DELIMITER}Кирпич красный${CSV_DELIMITER}шт${CSV_DELIMITER}15${CSV_DELIMITER}КирпичЗавод${CSV_DELIMITER}3.5${CSV_DELIMITER}Стеновые материалы${CSV_DELIMITER}Кирпич${CSV_DELIMITER}${CSV_DELIMITER}${CSV_DELIMITER}${CSV_DELIMITER}`
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

    const delimiter = CSV_DELIMITER;

    console.log(`[IMPORT] Using forced delimiter: "${delimiter}"`);

    const stream = Readable.from(file.buffer.toString('utf8'));

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
                const sku = row['Артикул'] || row['sku'] || row['SKU'] || row['Код'] || row['код'];
                const name = row['Наименование'] || row['Название'] || row['name'] || row['Name'] || row['Наименование работ'];

                // Извлекаем числовую часть из SKU для sku_number (для правильной сортировки)
                let skuNumber = null;
                if (sku) {
                    const match = String(sku).match(/\d+/);
                    if (match) {
                        skuNumber = parseInt(match[0], 10);
                    }
                }

                if (!sku || !name) {
                    // Пропускаем пустые строки или строки без ключевых данных, но логируем
                    if (Object.values(row).some(v => v)) {
                        errors.push({ line: lineNumber, message: `Отсутствуют Артикул или Наименование. Колонки: ${Object.keys(row).join(',')}` });
                    }
                    return;
                }

                results.push({
                    sku: String(sku).trim(),
                    skuNumber: skuNumber,
                    name: String(name).trim(),
                    unit: (row['Единица измерения'] || row['Ед. изм.'] || row['unit'] || row['Unit'])?.trim() || 'шт',
                    price: parseNumber(row['Цена'] || row['price'] || row['Price']),
                    supplier: (row['Поставщик'] || row['Бренд'] || row['supplier'] || row['Supplier'])?.trim() || '',
                    weight: parseNumber(row['Вес (кг)'] || row['Вес'] || row['weight'] || row['Weight']),
                    // Иерархические категории
                    category_lv1: (row['category_lv1'] || row['Категория LV1'] || row['Категория'])?.trim(),
                    category_lv2: (row['category_lv2'] || row['Категория LV2'])?.trim(),
                    category_lv3: (row['category_lv3'] || row['Категория LV3'])?.trim(),
                    category_lv4: (row['category_lv4'] || row['Категория LV4'])?.trim(),
                    // Сохраняем и обычную категорию для совместимости
                    category: (row['Категория'] || row['category'])?.trim() || '',
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
    const categoryCache = new Map();

    for (const data of results) {
        try {
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
                    isGlobal: isGlobalBool,
                    type: 'material'
                });
                categoryCache.set(cacheKey, resolved);
            }

            // Обогащаем данные для сохранения
            data.category = levels[levels.length - 1]; // Совместимость
            data.categoryId = resolved.id;
            data.categoryFullPath = resolved.fullPath;

            const created = await materialsRepository.create(data, tenantId);
            imported.push(created);
        } catch (e) {
            importErrors.push({ sku: data.sku, error: e.message });
        }
    }

    // Инвалидация кеша после импорта
    invalidateMaterialsCache(tenantId);

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
