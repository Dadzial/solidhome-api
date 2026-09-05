import nodemailer from 'nodemailer';
import logger from '../../utils/logger';
import { config } from '../../config';

/**
 * @class EmailService
 * @description Serwis odpowiedzialny za konfigurację transportera SMTP oraz wysyłkę wiadomości e-mail
 * (kody weryfikacyjne do resetu hasła) w środowisku produkcyjnym oraz deweloperskim (Ethereal).
 */
class EmailService {
    /** Instancja transportera Nodemailer do wysyłki wiadomości */
    private transporter: nodemailer.Transporter | null = null;
    /** Flaga określająca, czy serwis został pomyślnie zainicjalizowany */
    private initialized: boolean = false;

    /**
     * Inicjalizuje transporter Nodemailer.
     * W przypadku zdefiniowania poświadczeń w pliku konfiguracyjnym łączy się z produkcyjnym serwerem SMTP.
     * W środowisku lokalnym automatycznie generuje testowe konto Ethereal i loguje podgląd URL wiadomości.
     *
     * @returns Promise<void>
     */
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

    /**
     * Wysyła wiadomość e-mail z jednorazowym kodem do resetu hasła użytkownika.
     * Wiadomość zawiera kod w wersji tekstowej oraz sformatowany szablon HTML (ważny przez 15 minut).
     *
     * @param to - Adres e-mail odbiorcy wiadomości.
     * @param code - 6-cyfrowy kod weryfikacyjny wygenerowany przez ResetCodeService.
     * @returns Promise<void>
     * @throws Error w przypadku braku inicjalizacji transportera lub błędu wysyłki.
     */
    public async sendPasswordResetCode(to: string, code: string): Promise<void> {
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
