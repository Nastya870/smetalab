import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import db from '../config/database.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

const CSV_DELIMITER = ';';

/**
 * Экспорт выполненных работ в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId } = req.user;

    const query = `
    SELECT 
      ei.name as work_name,
      wc.actual_quantity,
      wc.completion_date,
      wc.notes
    FROM work_completions wc
    JOIN estimate_items ei ON wc.estimate_item_id = ei.id
    WHERE wc.estimate_id = $1 AND wc.tenant_id = $2
    ORDER BY ei.position_number
  `;

    const result = await db.query(query, [estimateId, tenantId]);

    const csvHeader = `Наименование работ${CSV_DELIMITER}Кол-во${CSV_DELIMITER}Дата${CSV_DELIMITER}Заметки\n`;

    const csvRows = result.rows.map(r => {
        return [
            escapeCsvField(r.work_name),
            r.actual_quantity || 0,
            r.completion_date ? new Date(r.completion_date).toLocaleDateString('ru-RU') : '',
            escapeCsvField(r.notes || '')
        ].join(CSV_DELIMITER);
    }).join('\n');

    const csv = csvHeader + csvRows;
    const filename = `completions_${estimateId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.write('\ufeff');
    res.write(csv);
    res.end();
});

/**
 * Импорт выполненных работ из CSV
 */
export const importFromCSV = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { tenantId, userId } = req.user;
    const { file } = req;

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
                    workName: row['Наименование работ'].trim(),
                    actualQuantity: parseFloat(row['Кол-во']) || 0,
                    completionDate: row['Дата'] ? parseRussianDate(row['Дата']) : new Date(),
                    notes: row['Заметки']?.trim() || ''
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 0) throw new BadRequestError('Ошибки в CSV', { errors });
    if (results.length === 0) throw new BadRequestError('Файл пуст');

    // Получаем все позиции сметы для сопоставления по имени
    const itemsResult = await db.query(
        'SELECT id, name FROM estimate_items WHERE estimate_id = $1 AND tenant_id = $2',
        [estimateId, tenantId]
    );
    const itemsMap = new Map(itemsResult.rows.map(i => [i.name, i.id]));

    const imported = [];
    const importErrors = [];

    for (const data of results) {
        const estimateItemId = itemsMap.get(data.workName);
        if (!estimateItemId) {
            importErrors.push({ workName: data.workName, error: 'Работа не найдена в смете' });
            continue;
        }

        try {
            // Upsert logic
            const existing = await db.query(
                'SELECT id FROM work_completions WHERE estimate_item_id = $1 AND tenant_id = $2',
                [estimateItemId, tenantId]
            );

            if (existing.rows.length > 0) {
                await db.query(
                    `UPDATE work_completions 
           SET actual_quantity = $1, completion_date = $2, notes = $3, updated_by = $4, updated_at = NOW(), completed = true
           WHERE id = $5`,
                    [data.actualQuantity, data.completionDate, data.notes, userId, existing.rows[0].id]
                );
            } else {
                await db.query(
                    `INSERT INTO work_completions (estimate_id, estimate_item_id, tenant_id, actual_quantity, completion_date, notes, created_by, updated_by, completed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
                    [estimateId, estimateItemId, tenantId, data.actualQuantity, data.completionDate, data.notes, userId, userId]
                );
            }
            imported.push(data.workName);
        } catch (e) {
            importErrors.push({ workName: data.workName, error: e.message });
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

function parseRussianDate(dateStr) {
    const [day, month, year] = dateStr.split('.').map(Number);
    if (!day || !month || !year) return new Date();
    return new Date(year, month - 1, day);
}
