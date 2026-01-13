import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import schedulesRepository from '../../../server/repositories/schedulesRepository.js';
import db from '../../../server/config/database.js';

vi.mock('../../../server/config/database.js', () => {
    const mClient = {
        query: vi.fn(),
        release: vi.fn()
    };
    return {
        default: {
            getClient: vi.fn(() => Promise.resolve(mClient)),
            pool: { end: vi.fn() }
        }
    };
});

describe('Schedules Repository', () => {
    let mockClient;

    beforeEach(async () => {
        mockClient = await db.getClient();
        mockClient.query.mockReset();
        mockClient.release.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('groupByPhases', () => {
        it('should group works by phases correctly', () => {
            const works = [
                { phase: 'Phase 1', work_code: 'W1', total_price: '100', quantity: '1', unit_price: '100' },
                { phase: 'Phase 1', work_code: 'W2', total_price: '200', quantity: '2', unit_price: '100' },
                { phase: 'Phase 2', work_code: 'W3', total_price: '300', quantity: '1', unit_price: '300' },
                { phase: null, work_code: 'W4', total_price: '50', quantity: '1', unit_price: '50' } // No phase
            ];

            const result = schedulesRepository.groupByPhases(works);

            expect(result).toHaveLength(3); // Phase 1, Phase 2, Без фазы

            const p1 = result.find(p => p.phase === 'Phase 1');
            expect(p1.works).toHaveLength(2);
            expect(p1.phaseTotal).toBe(300);

            const pNo = result.find(p => p.phase === 'Без фазы');
            expect(pNo.works).toHaveLength(1);
            expect(pNo.works[0].code).toBe('W4');
        });
    });

    describe('findByEstimateId', () => {
        it('should execute select query with RLS context', async () => {
            mockClient.query.mockResolvedValueOnce({}); // set_config
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // actual data

            const result = await schedulesRepository.findByEstimateId('est-1', 'tenant-1', 'user-1');

            expect(mockClient.query).toHaveBeenCalledTimes(2);

            // First call: set RLS
            expect(mockClient.query.mock.calls[0][0]).toContain('set_config');
            expect(mockClient.query.mock.calls[0][1]).toEqual(['user-1', 'tenant-1']);

            // Second call: select data
            expect(mockClient.query.mock.calls[1][0]).toContain('SELECT');
            expect(mockClient.query.mock.calls[1][1]).toEqual(['est-1', 'tenant-1']);

            expect(result).toEqual([{ id: 1 }]);
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('generateFromEstimate', () => {
        it('should perform full transaction flow', async () => {
            // Setup mocks for sequential calls
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({}) // set RLS
                .mockResolvedValueOnce({}) // DELETE old
                .mockResolvedValueOnce({   // SELECT items
                    rows: [
                        { work_id: 1, name: 'Work 1', phase: 'P1', quantity: 1, unit_price: 100 }
                    ]
                })
                .mockResolvedValueOnce({ rows: [{ id: 'new-sched-1' }] }) // INSERT item
                .mockResolvedValueOnce({}); // COMMIT

            const result = await schedulesRepository.generateFromEstimate('est-1', 'proj-1', 'tenant-1', 'user-1');

            // Assertions
            expect(mockClient.query).toHaveBeenCalledTimes(6);
            expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
            expect(mockClient.query.mock.calls[2][0]).toContain('DELETE');
            expect(mockClient.query.mock.calls[3][0]).toContain('SELECT'); // Fetch estimate items
            expect(mockClient.query.mock.calls[4][0]).toContain('INSERT INTO schedules');
            expect(mockClient.query.mock.calls[5][0]).toBe('COMMIT');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('new-sched-1');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should rollback on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockRejectedValue(new Error('DB Error')); // Fail on RLS or anything

            await expect(schedulesRepository.generateFromEstimate('est-1', 'p-1', 't-1', 'u-1'))
                .rejects.toThrow('DB Error');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should throw if no works found', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({}) // set RLS
                .mockResolvedValueOnce({}) // DELETE old
                .mockResolvedValueOnce({ rows: [] }); // No items

            await expect(schedulesRepository.generateFromEstimate('est-1', 'p-1', 't-1', 'u-1'))
                .rejects.toThrow('В смете нет работ');

            // Should rollback
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });
});
