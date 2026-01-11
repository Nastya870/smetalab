
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as semanticSearchService from '../../../server/services/semanticSearchService.js';

// Используем hoisited переменную для мока
const { mockCreate } = vi.hoisted(() => {
    return { mockCreate: vi.fn() };
});

vi.mock('openai', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            embeddings: {
                create: mockCreate
            }
        }))
    };
});

describe('Semantic Search Service', () => {

    describe('cosineSimilarity', () => {
        it('should calculate cosine similarity correctly for identical vectors', () => {
            const vec1 = [1, 1, 1];
            const vec2 = [1, 1, 1];
            const similarity = semanticSearchService.cosineSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(1.0);
        });

        it('should calculate cosine similarity correctly for orthogonal vectors', () => {
            const vec1 = [1, 0, 0];
            const vec2 = [0, 1, 0];
            const similarity = semanticSearchService.cosineSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(0.0);
        });

        it('should calculate cosine similarity correctly for opposite vectors', () => {
            const vec1 = [1, 2];
            const vec2 = [-1, -2];
            const similarity = semanticSearchService.cosineSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(-1.0);
        });
    });

    describe('getEmbeddings', () => {
        beforeEach(() => {
            mockCreate.mockClear();
        });

        it('should request embeddings from OpenAI', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3];
            mockCreate.mockResolvedValue({
                data: [
                    { embedding: mockEmbedding }
                ]
            });

            const result = await semanticSearchService.getEmbeddings(['test text']);

            expect(mockCreate).toHaveBeenCalledWith({
                model: 'text-embedding-3-small',
                input: ['test text'],
                encoding_format: 'float'
            });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockEmbedding);
        });

        it('should handle batching for large inputs', async () => {
            // Create a large array of texts (> 2000)
            const texts = new Array(2500).fill('text');
            const mockEmbedding = [0.1];

            // Mock response for each batch
            mockCreate
                .mockResolvedValueOnce({
                    data: new Array(2000).fill({ embedding: mockEmbedding })
                })
                .mockResolvedValueOnce({
                    data: new Array(500).fill({ embedding: mockEmbedding })
                });

            const result = await semanticSearchService.getEmbeddings(texts);

            expect(mockCreate).toHaveBeenCalledTimes(2);
            // First batch
            expect(mockCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
                input: expect.any(Array)
            }));
            // Check lengths
            expect(mockCreate.mock.calls[0][0].input).toHaveLength(2000);
            expect(mockCreate.mock.calls[1][0].input).toHaveLength(500);

            expect(result).toHaveLength(2500);
        });
    });

    describe('semanticSearch', () => {
        const items = [
            { id: 1, name: 'Цемент М500' },
            { id: 2, name: 'Кирпич красный' },
            { id: 3, name: 'Песок строительный' }
        ];

        beforeEach(() => {
            mockCreate.mockClear();
        });

        it('should find relevant items based on embeddings similarity', async () => {
            // Setup embeddings
            // Query: 'бетон' -> near 'Цемент'
            const queryEmb = [1, 0, 0];
            const cementEmb = [0.99, 0.1, 0]; // High similarity
            const brickEmb = [0.5, 0.5, 0];   // Medium
            const sandEmb = [0.1, 0.9, 0];    // Low

            mockCreate.mockResolvedValue({
                data: [
                    { embedding: queryEmb },
                    { embedding: cementEmb },
                    { embedding: brickEmb },
                    { embedding: sandEmb }
                ]
            });

            const results = await semanticSearchService.semanticSearch('бетон', items, 'name', 0.8);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].name).toBe('Цемент М500');
            expect(results[0].similarity).toBeGreaterThan(0.9);
        });

        it('should fallback to text search on error', async () => {
            mockCreate.mockRejectedValue(new Error('OpenAI API Error'));

            // Fallback Text Search logic test
            // Query: 'кирпич'
            const results = await semanticSearchService.semanticSearch('кирпич', items, 'name');

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].name).toBe('Кирпич красный');
            expect(results[0].similarity).toBeGreaterThan(0.8); // Simple include match
        });
    });

    describe('Fallback Search (via private function access simulation)', () => {
        const items = [
            { id: 1, name: 'Штукатурка гипсовая Knauf Rotband 30кг' },
            { id: 2, name: 'Профиль направляющий 27x28' },
        ];

        beforeEach(() => {
            // Force error to trigger fallback
            mockCreate.mockRejectedValue(new Error('Force Fallback'));
        });

        it('should find partial text matches', async () => {
            const results = await semanticSearchService.semanticSearch('Knauf', items, 'name', 0.3);
            expect(results.some(r => r.name.includes('Knauf'))).toBe(true);
        });

        it('should handle typo-tolerant logic (simple checks like startsWith)', async () => {
            const results = await semanticSearchService.semanticSearch('Штукатурка', items, 'name', 0.3);
            expect(results[0].name).toContain('Штукатурка');
        });
    });
});
