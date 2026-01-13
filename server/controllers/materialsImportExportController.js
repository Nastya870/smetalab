import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import * as materialsRepository from '../repositories/materialsRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const BULK_IMPORT_LIMIT = 1000;

/**
 * Экспорт материалов в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { tenantId } = req.user;
    const { isGlobal } = req.query;

    const params = {};
    if (isGlobal === 'true') params.isGlobal = 'true';
    if (isGlobal === 'false') params.isGlobal = 'false';

    const materials = await materialsRepository.findAll(params, tenantId);

    const csvHeader = 'Артикул,Наименование,Ед. изм.,Цена,Поставщик,Вес,Категория,Ссылка,Авторасчет,Расход\n';

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
            m.auto_calculate ? 'Да' : 'Нет',
            m.consumption || 0
        ].join(',');
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
    const csvHeader = 'Артикул,Наименование,Ед. изм.,Цена,Поставщик,Вес,Категория,Ссылка,Авторасчет,Расход\n';
    const examples = [
        'MAT-001,Цемент М500,мешок,450,СтройМир,50,Сухие смеси,,Да,1',
        'MAT-002,Кирпич красный,шт,15,КирпичЗавод,3.5,Стеновые материалы,,Нет,0'
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
                    sku: row['Артикул'].trim(),
                    name: row['Наименование'].trim(),
                    unit: row['Ед. изм.']?.trim() || 'шт',
                    price: parseFloat(row['Цена']) || 0,
                    supplier: row['Поставщик']?.trim() || '',
                    weight: parseFloat(row['Вес']) || 0,
                    category: row['Категория']?.trim() || '',
                    productUrl: row['Ссылка']?.trim() || '',
                    autoCalculate: row['Авторасчет']?.toLowerCase() === 'да',
                    consumption: parseFloat(row['Расход']) || 0,
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
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
