import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import schedulesRepository from '../repositories/schedulesRepository.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const CSV_DELIMITER = ';';

const parseNumber = (value) => {
    if (!value) return 0;
    const normalized = String(value).replace(/,/g, '.').replace(/\s/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
};

/**
 * Экспорт графика в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId, userId } = req.user;

    const scheduleWorks = await schedulesRepository.findByEstimateId(estimateId, tenantId, userId);

    const csvHeader = `Фаза${CSV_DELIMITER}Код работы${CSV_DELIMITER}Наименование работ${CSV_DELIMITER}Ед. изм.${CSV_DELIMITER}Кол-во${CSV_DELIMITER}Цена за ед.${CSV_DELIMITER}Сумма${CSV_DELIMITER}Позиция\n`;

    const csvRows = scheduleWorks.map(w => {
        return [
            escapeCsvField(w.phase || ''),
            escapeCsvField(w.work_code || ''),
            escapeCsvField(w.work_name || ''),
            escapeCsvField(w.unit || ''),
            w.quantity || 0,
            w.unit_price || 0,
            w.total_price || 0,
            w.position_number || 0
        ].join(CSV_DELIMITER);
    }).join('\n');

    const csv = csvHeader + csvRows;
    const filename = `schedule_${estimateId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.write('\ufeff');
    res.write(csv);
    res.end();
});

/**
 * Импорт графика из CSV
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
                if (!row['Наименование работ']) {
                    errors.push({ line: lineNumber, message: 'Отсутствует Наименование работ' });
                    return;
                }

                results.push({
                    projectId,
                    estimateId,
                    phase: row['Фаза']?.trim() || 'Без фазы',
                    workCode: row['Код работы']?.trim() || null,
                    workName: row['Наименование работ'].trim(),
                    unit: row['Ед. изм.']?.trim() || 'шт',
                    quantity: parseNumber(row['Кол-во']),
                    unitPrice: parseNumber(row['Цена за ед.']),
                    totalPrice: parseNumber(row['Сумма']),
                    positionNumber: parseInt(row['Позиция']) || 0
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 0) throw new BadRequestError('Ошибки в CSV', { errors });
    if (results.length === 0) throw new BadRequestError('Файл пуст');

    if (mode === 'replace') {
        await schedulesRepository.deleteByEstimateId(estimateId, tenantId, userId);
    }

    const imported = [];
    for (const data of results) {
        const created = await schedulesRepository.create(data, tenantId, userId);
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
