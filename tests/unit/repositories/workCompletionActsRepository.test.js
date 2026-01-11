import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as actsRepository from '../../../server/repositories/workCompletionActsRepository.js';
import db from '../../../server/config/database.js';

// Mock DB
const mockClient = {
    query: vi.fn(),
    release: vi.fn()
};

vi.mock('../../../server/config/database.js', () => {
    return {
        default: {
            getClient: vi.fn(() => Promise.resolve(mockClient)),
            pool: { end: vi.fn() }
        }
    };
});

describe('Work Completion Acts Repository (Unit)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient.query.mockReset();
        mockClient.query.mockResolvedValue({ rows: [] }); // Default
    });

    describe('generateClientAct', () => {
        it('should generate client act with items within transaction', async () => {
            const userId = 'u1';
            const tenantId = 't1';
            const estimateId = 'est1';
            const projectId = 'proj1';

            // Sequence of DB calls:
            // 1. BEGIN
            mockClient.query.mockResolvedValueOnce({});
            // 2. Set RLS
            mockClient.query.mockResolvedValueOnce({});
            // 3. SELECT works (Found completed works)
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        estimate_item_id: 'ei1', work_id: 'w1', work_name: 'Work A',
                        actual_quantity: 10, total_price: 1000, position_number: 1,
                        unit: 'm2', planned_quantity: 10, client_unit_price: 100
                    }
                ]
            });
            // 4. Act Number Generation (SELECT last number) - internal function
            mockClient.query.mockResolvedValueOnce({ rows: [{ act_number: 'ACT-CL-2025-001' }] });

            // 5. INSERT act
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 'act1', act_number: 'ACT-CL-2025-002' }]
            });

            // 6. INSERT act item
            mockClient.query.mockResolvedValueOnce({});

            // 7. UPDATE work_completions
            mockClient.query.mockResolvedValueOnce({});

            // 8. COMMIT
            mockClient.query.mockResolvedValueOnce({});

            const result = await actsRepository.generateClientAct(estimateId, projectId, tenantId, userId);

            expect(result.id).toBe('act1');
            expect(result.act_number).toBe('ACT-CL-2025-002');

            expect(mockClient.query).toHaveBeenCalledTimes(8);
            expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
            expect(mockClient.query.mock.calls[2][0]).toContain('SELECT'); // Works query

            expect(mockClient.query.mock.calls[4][0]).toContain('INSERT INTO work_completion_acts');
            expect(mockClient.query.mock.calls[5][0]).toContain('INSERT INTO work_completion_act_items');

            expect(mockClient.query.mock.calls[6][0]).toContain('UPDATE work_completions');
            expect(mockClient.query.mock.calls[7][0]).toBe('COMMIT');

            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should throw error if no completed works found', async () => {
            // 1. BEGIN
            mockClient.query.mockResolvedValueOnce({});
            // 2. RLS
            mockClient.query.mockResolvedValueOnce({});
            // 3. SELECT works (Empty)
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // 4. ROLLBACK (called in catch block? No, explicit rollback in logic usually)
            // Wait, logic says: if (worksResult.rows.length === 0) { rollback; throw ... }
            mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

            await expect(actsRepository.generateClientAct('est1', 'p1', 't1', 'u1'))
                .rejects.toThrow('Выберите выполненные работы');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should rollback on DB error', async () => {
            // 1. BEGIN
            mockClient.query.mockResolvedValueOnce({});
            // 2. RLS
            mockClient.query.mockRejectedValue(new Error('DB Fail'));
            // 3. ROLLBACK (in catch)
            mockClient.query.mockResolvedValueOnce({});

            await expect(actsRepository.generateClientAct('est1', 'p1', 't1', 'u1'))
                .rejects.toThrow('DB Fail');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });
});
