import db from '../config/database.js';
import { StatusCodes } from 'http-status-codes';
import { catchAsync, BadRequestError } from '../utils/errors.js';

/**
 * Высокопроизводительный импорт графика работ
 */
export const bulkImportSchedules = catchAsync(async (req, res) => {
    const { estimateId } = req.params;
    const { schedules, mode = 'add', projectId } = req.body;
    const { tenantId, userId } = req.user;

    if (!schedules || !Array.isArray(schedules)) {
        throw new BadRequestError('Массив schedules обязателен');
    }

    if (!projectId) {
        throw new BadRequestError('projectId обязателен');
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // 1. Если режим replace - удаляем старые
        if (mode === 'replace') {
            await client.query(
                'DELETE FROM schedules WHERE estimate_id = $1 AND tenant_id = $2',
                [estimateId, tenantId]
            );
        }

        if (schedules.length > 0) {
            // 2. Подготовка данных для UNNEST
            const projectIds = schedules.map(() => projectId);
            const estimateIds = schedules.map(() => estimateId);
            const tenantIds = schedules.map(() => tenantId);
            const createdBy = schedules.map(() => userId);

            const phases = schedules.map(s => s.phase || 'Без фазы');
            const workCodes = schedules.map(s => s.workCode || null);
            const workNames = schedules.map(s => s.workName || '');
            const units = schedules.map(s => s.unit || 'шт');
            const quantities = schedules.map(s => parseFloat(s.quantity) || 0);
            const unitPrices = schedules.map(s => parseFloat(s.unitPrice) || 0);
            const totalPrices = schedules.map(s => parseFloat(s.totalPrice) || 0);
            const positionNumbers = schedules.map((s, idx) => parseInt(s.positionNumber) || idx + 1);

            const query = `
                INSERT INTO schedules (
                    project_id, estimate_id, tenant_id, created_by,
                    phase, work_code, work_name, unit, quantity,
                    unit_price, total_price, position_number
                )
                SELECT * FROM UNNEST(
                    $1::uuid[], $2::uuid[], $3::uuid[], $4::uuid[],
                    $5::text[], $6::text[], $7::text[], $8::text[], $9::numeric[],
                    $10::numeric[], $11::numeric[], $12::int[]
                )
                RETURNING id
            `;

            const result = await client.query(query, [
                projectIds, estimateIds, tenantIds, createdBy,
                phases, workCodes, workNames, units, quantities,
                unitPrices, totalPrices, positionNumbers
            ]);

            await client.query('COMMIT');

            res.status(StatusCodes.OK).json({
                success: true,
                successCount: result.rows.length,
                message: `Успешно импортировано ${result.rows.length} позиций графика`
            });
        } else {
            await client.query('COMMIT');
            res.status(StatusCodes.OK).json({ success: true, successCount: 0 });
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[bulkImportSchedules] Error:', error);
        throw error;
    } finally {
        client.release();
    }
});
