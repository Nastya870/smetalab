import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import db from '../config/database.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

/**
 * Экспорт глобальных закупок в CSV
 */
export const exportToCSV = catchAsync(async (req, res) => {
    const { tenantId } = req.user;

    const query = `
    SELECT 
      gp.material_sku, gp.material_name, gp.unit, gp.quantity, 
      gp.purchase_price, gp.total_price, gp.purchase_date,
      p.name as project_name, e.name as estimate_name
    FROM global_purchases gp
    LEFT JOIN projects p ON gp.project_id = p.id
    LEFT JOIN estimates e ON gp.estimate_id = e.id
    WHERE gp.tenant_id = $1
    ORDER BY gp.purchase_date DESC
  `;

    const result = await db.query(query, [tenantId]);

    const csvHeader = 'Артикул,Наименование,Ед. изм.,Кол-во,Цена закупки,Сумма,Дата,Проект,Смета\n';

    const csvRows = result.rows.map(r => {
        return [
            escapeCsvField(r.material_sku || ''),
            escapeCsvField(r.material_name || ''),
            escapeCsvField(r.unit || ''),
            r.quantity || 0,
            r.purchase_price || 0,
            r.total_price || 0,
            r.purchase_date ? new Date(r.purchase_date).toLocaleDateString('ru-RU') : '',
            escapeCsvField(r.project_name || ''),
            escapeCsvField(r.estimate_name || '')
        ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;
    const filename = `global_purchases_${tenantId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.write('\ufeff');
    res.write(csv);
    res.end();
});

/**
 * Импорт глобальных закупок из CSV
 */
export const importFromCSV = catchAsync(async (req, res) => {
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
                    quantity: parseFloat(row['Кол-во']) || 0,
                    price: parseFloat(row['Цена закупки']) || 0,
                    total: parseFloat(row['Сумма']) || 0,
                    date: row['Дата'] ? parseRussianDate(row['Дата']) : new Date(),
                    projectName: row['Проект']?.trim() || '',
                    estimateName: row['Смета']?.trim() || ''
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (errors.length > 0) throw new BadRequestError('Ошибки в CSV', { errors });
    if (results.length === 0) throw new BadRequestError('Файл пуст');

    // Получаем проекты и сметы для сопоставления
    const projectsResult = await db.query('SELECT id, name FROM projects WHERE tenant_id = $1', [tenantId]);
    const projectsMap = new Map(projectsResult.rows.map(p => [p.name, p.id]));

    const estimatesResult = await db.query('SELECT id, name FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)', [tenantId]);
    const estimatesMap = new Map(estimatesResult.rows.map(e => [e.name, e.id]));

    // Получаем материалы
    const materialsResult = await db.query('SELECT id, sku, name FROM materials WHERE tenant_id = $1 OR is_global = TRUE', [tenantId]);
    const materialsMap = new Map();
    materialsResult.rows.forEach(m => {
        if (m.sku) materialsMap.set(m.sku, m.id);
        materialsMap.set(m.name, m.id);
    });

    const imported = [];
    for (const data of results) {
        const materialId = materialsMap.get(data.sku) || materialsMap.get(data.name);
        if (!materialId) continue;

        const projectId = projectsMap.get(data.projectName);
        const estimateId = estimatesMap.get(data.estimateName);

        if (!projectId || !estimateId) continue;

        const query = `
      INSERT INTO global_purchases (
        tenant_id, project_id, estimate_id, material_id,
        material_sku, material_name, unit, quantity,
        purchase_price, total_price, purchase_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

        const values = [
            tenantId, projectId, estimateId, materialId,
            data.sku, data.name, data.unit, data.quantity,
            data.price, data.total, data.date, userId
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
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function parseRussianDate(dateStr) {
    const [day, month, year] = dateStr.split('.').map(Number);
    if (!day || !month || !year) return new Date();
    return new Date(year, month - 1, day);
}
