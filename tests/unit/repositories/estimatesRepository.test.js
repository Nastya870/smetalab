import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as estimatesRepository from '../../../server/repositories/estimatesRepository.js';
import db from '../../../server/config/database.js';

// Mock DB objects
const mockClient = {
    query: vi.fn(),
    release: vi.fn()
};

vi.mock('../../../server/config/database.js', () => {
    return {
        default: {
            pool: {
                connect: vi.fn(() => Promise.resolve(mockClient)),
                query: vi.fn(), // For methods using pool directly (e.g. findByProjectId)
                end: vi.fn()
            }
        }
    };
});

describe('Estimates Repository (Unit)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient.query.mockReset();
        // Default minimal setup
        mockClient.query.mockResolvedValue({ rows: [] });
    });

    describe('createWithDetails', () => {
        it('should create estimate, items, and materials within a transaction', async () => {
            const userId = 'user-1';
            const tenantId = 'tenant-1';
            const inputData = {
                projectId: 'proj-1',
                name: 'New Estimate',
                items: [
                    {
                        name: 'Work 1', unit: 'm2', quantity: 10, unit_price: 100,
                        materials: [
                            { material_id: 'mat-1', quantity: 5, price: 10 }
                        ]
                    }
                ]
            };

            // MOCK RESPONSES SEQUENCE
            // 1. BEGIN
            mockClient.query.mockResolvedValueOnce({});
            // 2. INSERT estimates
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 'est-1', name: 'New Estimate', status: 'draft' }]
            });
            // 3. INSERT estimate_items (Work 1)
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    id: 'item-1',
                    name: 'Work 1',
                    total_price: 1000,
                    final_price: 1000 // Database generated
                }]
            });
            // 4. INSERT materials (for Work 1)
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // 5. UPDATE total_amount
            mockClient.query.mockResolvedValueOnce({});
            // 6. COMMIT
            mockClient.query.mockResolvedValueOnce({});

            const result = await estimatesRepository.createWithDetails(inputData, tenantId, userId);

            // ASSERTIONS
            expect(mockClient.query).toHaveBeenCalledTimes(6);
            expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');

            // Check Estimate Insert
            expect(mockClient.query.mock.calls[1][0]).toContain('INSERT INTO estimates');
            expect(mockClient.query.mock.calls[1][1]).toContain('New Estimate');

            // Check Item Insert
            expect(mockClient.query.mock.calls[2][0]).toContain('INSERT INTO estimate_items');
            expect(mockClient.query.mock.calls[2][1]).toContain('Work 1');

            // Check Material Insert
            expect(mockClient.query.mock.calls[3][0]).toContain('INSERT INTO estimate_item_materials');
            expect(mockClient.query.mock.calls[3][1]).toContain('mat-1'); // material_id

            // Check Total Update
            expect(mockClient.query.mock.calls[4][0]).toContain('UPDATE estimates SET total_amount');
            expect(mockClient.query.mock.calls[4][1][0]).toBe(1000); // 10 * 100

            expect(mockClient.query.mock.calls[5][0]).toBe('COMMIT');

            expect(result.id).toBe('est-1');
            expect(result.items).toHaveLength(1);
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should rollback on error during item insertion', async () => {
            const inputData = { projectId: 'p1', name: 'fail', items: [{ name: 'bad' }] };

            // 1. BEGIN
            mockClient.query.mockResolvedValueOnce({});
            // 2. INSERT estimates OK
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'est-1' }] });
            // 3. INSERT item FAILS
            mockClient.query.mockRejectedValueOnce(new Error('Insert Failed'));

            await expect(estimatesRepository.createWithDetails(inputData, 't1', 'u1'))
                .rejects.toThrow('Insert Failed');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should skip materials without material_id', async () => {
            const inputData = {
                projectId: 'p1', name: 'Skip Mat',
                items: [
                    {
                        name: 'W1', quantity: 1, unit_price: 10,
                        materials: [
                            { name: 'Manual Mat', price: 5 } // No material_id
                        ]
                    }
                ]
            };

            // 1. BEGIN
            mockClient.query.mockResolvedValueOnce({});
            // 2. INSERT estimates
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'est-1' }] });
            // 3. INSERT item
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'i-1', total_price: 10 }] });
            // 4. INSERT materials skipped -> Jump to UPDATE total
            mockClient.query.mockResolvedValueOnce({});
            // 5. COMMIT
            mockClient.query.mockResolvedValueOnce({});

            await estimatesRepository.createWithDetails(inputData, 't1', 'u1');

            // Find calls containing INSERT INTO estimate_item_materials - should contain none
            const materialCalls = mockClient.query.mock.calls.filter(call =>
                call[0].includes('INSERT INTO estimate_item_materials')
            );
            expect(materialCalls).toHaveLength(0);
        });
    });

    describe('findByIdWithDetails', () => {
        it('should fetch estimate, items and materials efficiently', async () => {
            // Mock pool.query (not client) as findByIdWithDetails uses pool directly (read-only)

            // 1. Estimate Query
            db.pool.query.mockResolvedValueOnce({
                rows: [{ id: 'est-1', name: 'Details' }]
            });

            // 2. Items Query
            db.pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 'item-1', name: 'W1', quantity: 1, unit_price: 100 },
                    { id: 'item-2', name: 'W2', quantity: 2, unit_price: 50 }
                ]
            });

            // 3. Materials Batch Query
            db.pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 'mat-1', estimate_item_id: 'item-1', quantity: 1, unit_price: 10, material_name: 'M1' },
                    { id: 'mat-2', estimate_item_id: 'item-1', quantity: 2, unit_price: 5, material_name: 'M2' }
                    // item-2 has no materials
                ]
            });

            const result = await estimatesRepository.findByIdWithDetails('est-1', 't-1');

            expect(result.id).toBe('est-1');
            expect(result.items).toHaveLength(2);

            // Item 1 has 2 materials
            expect(result.items[0].id).toBe('item-1');
            expect(result.items[0].materials).toHaveLength(2);
            expect(result.items[0].materials[0].material_name).toBe('M1');

            // Item 2 has 0 materials
            expect(result.items[1].id).toBe('item-2');
            expect(result.items[1].materials).toHaveLength(0);
        });

        it('should return null if estimate not found', async () => {
            db.pool.query.mockResolvedValueOnce({ rows: [] });

            const result = await estimatesRepository.findByIdWithDetails('missing', 't-1');
            expect(result).toBeNull();
        });
    });
});
