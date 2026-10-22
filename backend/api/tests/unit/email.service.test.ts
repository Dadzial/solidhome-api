import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import EmailService from '../../lib/modules/services/user/email.service';
import nodemailer from 'nodemailer';
import { config } from '../../lib/config';

describe('EmailService', () => {
    let service: EmailService;
    let mockSendMail: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        service = new EmailService();
        mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg_12345' });

        vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
            sendMail: mockSendMail,
        } as any);

        vi.spyOn(nodemailer, 'createTestAccount').mockResolvedValue({
            user: 'ethereal_user',
            pass: 'ethereal_pass',
            smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
            imap: { host: '', port: 0, secure: false },
            pop3: { host: '', port: 0, secure: false },
            web: ''
        });

        vi.spyOn(nodemailer, 'getTestMessageUrl').mockReturnValue('https://ethereal.email/message/msg_12345');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('init', () => {
        it('should initialize production SMTP transporter when smtpUser is configured', async () => {
            const originalUser = config.smtpUser;
            config.smtpUser = 'production_user@example.com';

            await service.init();

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: config.smtpHost,
                    auth: expect.objectContaining({ user: 'production_user@example.com' }),
                })
            );

            config.smtpUser = originalUser;
        });

        it('should initialize Ethereal test account in dev mode when smtpUser is empty', async () => {
            const originalUser = config.smtpUser;
            config.smtpUser = '';

            await service.init();

            expect(nodemailer.createTestAccount).toHaveBeenCalled();
            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'smtp.ethereal.email',
                    auth: { user: 'ethereal_user', pass: 'ethereal_pass' },
                })
            );

            config.smtpUser = originalUser;
        });

        it('should not re-initialize if already initialized', async () => {
            await service.init();
            expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);

            await service.init();
            expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
        });

        it('should handle initialization error without crashing', async () => {
            vi.spyOn(nodemailer, 'createTestAccount').mockRejectedValueOnce(new Error('Ethereal unreachable'));
            const originalUser = config.smtpUser;
            config.smtpUser = '';

            await expect(service.init()).resolves.not.toThrow();

            config.smtpUser = originalUser;
        });
    });

    describe('sendPasswordResetCode', () => {
        it('should send email with 6-digit code and HTML template to specified address', async () => {
            await service.sendPasswordResetCode('recipient@example.com', '654321');

            expect(mockSendMail).toHaveBeenCalledTimes(1);
            const callArgs = mockSendMail.mock.calls[0][0];
            expect(callArgs.to).toBe('recipient@example.com');
            expect(callArgs.subject).toContain('Recover password code');
            expect(callArgs.text).toContain('654321');
            expect(callArgs.html).toContain('654321');
            expect(nodemailer.getTestMessageUrl).toHaveBeenCalled();
        });

        it('should throw Error if transporter fails to send mail', async () => {
            mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

            await expect(service.sendPasswordResetCode('test@example.com', '111222')).rejects.toThrow(
                'Failed to send email with recovery code'
            );
        });

        it('should throw Error if transporter is not initialized', async () => {
            vi.spyOn(service, 'init').mockImplementation(async () => {});

            await expect(service.sendPasswordResetCode('test@example.com', '111222')).rejects.toThrow(
                'Email transporter not initialized'
            );
        });
    });
});
