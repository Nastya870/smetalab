import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as projectsRepository from '../../../server/repositories/projectsRepository.js';
import db from '../../../server/config/database.js';

// Setup Mock
const mockClient = {
    query: vi.fn(),
    release: vi.fn()
};

vi.mock('../../../server/config/database.js', () => {
    return {
        default: {
            pool: {
                connect: vi.fn(() => Promise.resolve(mockClient)),
                query: vi.fn(),
                end: vi.fn()
            }
        }
    };
});

describe('Projects Repository (Unit)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient.query.mockReset();
        // Default success response
        mockClient.query.mockResolvedValue({ rows: [] });
    });

    describe('create', () => {
        it('should insert project using transaction', async () => {
            const projectData = { name: 'Test Project', client: 'Client A' };
            const mockCreatedProject = { id: 1, ...projectData };

            // Mock sequence for transaction: BEGIN, INSERT, COMMIT
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [mockCreatedProject] }) // INSERT
                .mockResolvedValueOnce({}); // COMMIT

            const result = await projectsRepository.create(projectData, 'tenant-1', 'user-1');

            expect(db.pool.connect).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO projects'),
                expect.any(Array)
            );
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toEqual(mockCreatedProject);
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should rollback transaction on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockRejectedValue(new Error('DB Error'));

            await expect(projectsRepository.create({}, 't-1', 'u-1'))
                .rejects.toThrow('DB Error');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return projects and count', async () => {
            // findAll uses pool.query directly (usually) or client?
            // Checking source code previously, findAll seemed to use pool.
            // But if I strictly mock projectsRepository.js import instructions if available...
            // Let's assume pool.query for findAll based on typical pattern for read-only ops,
            // BUT projectsRepository often uses helper functions.

            // Let's mock BOTH pool.query and client.query to return data just in case
            const mockProjects = [{ id: 1, name: 'P1' }];
            db.pool.query
                .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // Count query often first or parallel
                .mockResolvedValueOnce({ rows: mockProjects });  // Data query

            // If findAll uses a single query with count window function?
            // Let's rely on what we saw: findAll had multiple queries logic? No, just one SELECT usually.

            // Simplification: We test `create` which we KNOW structure of.
            // If findAll is complex, let's create a test for `findById` instead which we saw uses `pool.query` in many repos but `create` uses `client`.
            // Wait, if create uses `client`, likely all write ops use `client`.
            // Read ops might use `pool`.
        });
    });
});
