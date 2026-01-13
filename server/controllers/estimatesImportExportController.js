import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import estimatesRepository from '../repositories/estimatesRepository.js';
import estimateItemsRepository from '../repositories/estimateItemsRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const BULK_IMPORT_LIMIT = 1000;

/**
 * Экспорт позиций сметы в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId } = req.user;

    const estimate = await estimatesRepository.findByIdWithDetails(estimateId, tenantId);
    if (!estimate) throw new BadRequestError('Смета не найдена');

    const csvHeader = 'Фаза,Раздел,Подраздел,Наименование работ,Ед. изм.,Кол-во,Цена,Накладные %,Прибыль %,Налог %\n';

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
            ].join(','));
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
                    quantity: parseFloat(row['Кол-во']) || 0,
                    pricePerUnit: parseFloat(row['Цена']) || 0,
                    overheadPercent: parseFloat(row['Накладные %']) || 0,
                    profitPercent: parseFloat(row['Прибыль %']) || 0,
                    taxPercent: parseFloat(row['Налог %']) || 0,
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
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
