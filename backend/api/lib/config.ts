import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: process.env.API_PORT,
    databaseUrl: process.env.API_DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    npx_ip : process.env.NXP_BOARD_IP,
    smtpHost: process.env.SMTP_HOST || 'smtp.ethereal.email',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || '"SolidHome Smart" <no-reply@solidhome.local>',
}