import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
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

    const csvHeader = `Фаза${CSV_DELIMITER}Раздел${CSV_DELIMITER}Подраздел${CSV_DELIMITER}Наименование работ${CSV_DELIMITER}Ед. изм.${CSV_DELIMITER}Кол-во${CSV_DELIMITER}Цена${CSV_DELIMITER}Накладные %${CSV_DELIMITER}Прибыль %${CSV_DELIMITER}Налог %\n`;

    const csvRows = [];
    for (const section of estimate.sections || []) {
        for (const item of section.items || []) {
            csvRows.push([
                escapeCsvField(item.phase || ''),
                escapeCsvField(item.section || ''),
                escapeCsvField(item.subsection || ''),
                escapeCsvField(item.work_name || item.name || ''),
                escapeCsvField(item.unit || ''),
                item.quantity || 0,
                item.price_per_unit || item.price || 0,
                item.overhead_percent || 0,
                item.profit_percent || 0,
                item.tax_percent || 0
            ].join(CSV_DELIMITER));
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
                if (!row['Наименование работ']) {
                    errors.push({ line: lineNumber, message: 'Отсутствует Наименование работ' });
                    return;
                }

                results.push({
                    estimateId,
                    phase: row['Фаза']?.trim() || null,
                    section: row['Раздел']?.trim() || null,
                    subsection: row['Подраздел']?.trim() || null,
                    workName: row['Наименование работ'].trim(),
                    unit: row['Ед. изм.']?.trim() || 'шт',
                    quantity: parseNumber(row['Кол-во']),
                    pricePerUnit: parseNumber(row['Цена']),
                    overheadPercent: parseNumber(row['Накладные %']),
                    profitPercent: parseNumber(row['Прибыль %']),
                    taxPercent: parseNumber(row['Налог %']),
                    itemType: 'work'
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 0) throw new BadRequestError('Ошибки в CSV', { errors });
    if (results.length === 0) throw new BadRequestError('Файл пуст');

    if (mode === 'replace') {
        // Удаляем существующие позиции (через репозиторий или напрямую)
        // В данном проекте лучше использовать транзакцию или метод репозитория
        await estimateItemsRepository.deleteByEstimateId(estimateId, tenantId);
    }

    const imported = [];
    for (const data of results) {
        const created = await estimateItemsRepository.create(data, tenantId, userId);
        imported.push(created);
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
