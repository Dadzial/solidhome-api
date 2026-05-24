import nodemailer from 'nodemailer';
import logger from '../../utils/logger';
import { config } from '../../config';

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private initialized: boolean = false;

    public async init(): Promise<void> {
        if (this.initialized) return;

        try {
            if (config.smtpUser) {
                this.transporter = nodemailer.createTransport({
                    host: config.smtpHost,
                    port: config.smtpPort,
                    secure: config.smtpSecure,
                    auth: {
                        user: config.smtpUser,
                        pass: config.smtpPass,
                    },
                });
                logger.info("Email service initialized (Production SMTP)");
            } else {
                // Fallback to Ethereal for development
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: "smtp.ethereal.email",
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                logger.info("Email service initialized (Ethereal - dev mode)");
            }
            this.initialized = true;
        } catch (error) {
            logger.error("Failed to initialize email service", error);
        }
    }

    public async sendPasswordResetCode(to: string, code: string): Promise<void> {
        // Ensure transporter is ready before sending
        if (!this.initialized) {
            await this.init();
        }

        if (!this.transporter) {
            throw new Error("Email transporter not initialized");
        }

        const mailOptions = {
            from: config.smtpFrom,
            to: to,
            subject: 'Recover password code - SolidHome',
            text: `Your password recovery code is: ${code}\nThe code is valid for 15 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>SolidHome - Password Recovery</h2>
                    <p>Your password recovery code is:</p>
                    <h1 style="letter-spacing: 8px; text-align: center; background: #f4f4f4; padding: 20px; border-radius: 8px;">${code}</h1>
                    <p>The code is valid for <strong>15 minutes</strong>.</p>
                    <p style="color: #888;">If you did not request a password reset, please ignore this email.</p>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            // Show preview URL only for Ethereal (dev mode)
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                logger.info(`Email preview URL: ${previewUrl}`);
            }
            logger.info(`Password reset email sent to ${to}`);
        } catch (error) {
            logger.error("Error sending email:", error);
            throw new Error("Failed to send email with recovery code");
        }
    }
}

export default EmailService;
