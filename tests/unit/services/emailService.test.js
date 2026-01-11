import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import db from '../../../server/config/database.js';

// Hoist functions for mocks
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

// Mock Resend
vi.mock('resend', () => {
    return {
        Resend: vi.fn().mockImplementation(() => ({
            emails: { send: mockSend }
        }))
    };
});

// Mock DB
vi.mock('../../../server/config/database.js', () => {
    return {
        default: {
            query: vi.fn()
        }
    };
});

describe('Email Service', () => {
    let emailService;

    beforeAll(async () => {
        // Устанавливаем ENV до импорта модуля
        process.env.RESEND_API_KEY = 'test_key';
        const module = await import('../../../server/services/emailService.js');
        emailService = module.default;
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('sendEmail', () => {
        it('should send email using Resend API', async () => {
            mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });

            const result = await emailService.sendEmail({
                to: 'test@test.com',
                subject: 'Subject',
                html: '<p>Body</p>'
            });

            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
                to: ['test@test.com'],
                subject: 'Subject',
                html: '<p>Body</p>'
            }));

            expect(result).toEqual({
                success: true,
                messageId: 'email-1',
                provider: 'resend'
            });
        });

        it('should throw error if Resend fails', async () => {
            mockSend.mockResolvedValueOnce({ data: null, error: { message: 'API Error' } });

            await expect(emailService.sendEmail({ to: 'a@b.c', subject: 's', html: 'h' }))
                .rejects.toThrow('Resend error');
        });
    });

    describe('generateEmailVerificationToken', () => {
        it('should insert token into DB', async () => {
            db.query.mockResolvedValueOnce({}); // INSERT response

            const token = await emailService.generateEmailVerificationToken('user-1');

            expect(token).toBeDefined();
            expect(token).toHaveLength(64); // hex string of 32 bytes

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO email_verification_tokens'),
                expect.arrayContaining(['user-1', token])
            );
        });
    });

    describe('verifyEmailToken', () => {
        it('should verify valid token and update user', async () => {
            // 1. SELECT returns token
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 'user-1', email: 'test@test.com', full_name: 'Tester' }]
            });
            // 2. UPDATE users
            db.query.mockResolvedValueOnce({});
            // 3. DELETE token
            db.query.mockResolvedValueOnce({});

            const result = await emailService.verifyEmailToken('valid-token');

            expect(result.success).toBe(true);
            expect(db.query).toHaveBeenCalledTimes(3);

            // Check Update
            expect(db.query.mock.calls[1][0]).toContain('UPDATE users SET email_verified = true');
            expect(db.query.mock.calls[1][1]).toEqual(['user-1']);
        });

        it('should fail if token not found or expired', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // Not found

            const result = await emailService.verifyEmailToken('bad-token');

            expect(result.success).toBe(false);
            expect(db.query).toHaveBeenCalledTimes(1); // Only Select
        });
    });
});
