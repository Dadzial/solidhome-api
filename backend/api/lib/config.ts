import dotenv from "dotenv";
dotenv.config();

/**
 * @const config
 * @description Główny obiekt konfiguracyjny aplikacji wczytujący zmienne środowiskowe z pliku .env.
 * Zawiera parametry sieciowe serwera, połączenia z bazą danych MongoDB, klucz JWT, adres mikrokontrolera oraz konfigurację SMTP.
 * @property {string | undefined} port - Port sieciowy, na którym nasłuchuje serwer HTTP (np. 3000).
 * @property {string | undefined} databaseUrl - Adres połączenia (URI) do bazy danych MongoDB.
 * @property {string | undefined} jwtSecret - Tajny klucz kryptograficzny używany do podpisywania tokenów JWT.
 * @property {string | undefined} npx_ip - Adres IP płytki mikrokontrolera NXP (SolidHome MCU).
 * @property {string} smtpHost - Adres serwera pocztowego SMTP do wysyłki e-maili.
 * @property {number} smtpPort - Port serwera pocztowego SMTP (domyślnie 587).
 * @property {boolean} smtpSecure - Flaga określająca, czy połączenie SMTP ma korzystać z protokołu SSL/TLS.
 * @property {string} smtpUser - Nazwa użytkownika / login do uwierzytelnienia na serwerze SMTP.
 * @property {string} smtpPass - Hasło dostępowe do konta pocztowego SMTP.
 * @property {string} smtpFrom - Adres e-mail i nazwa nadawcy widoczna w wysyłanych wiadomościach.
 */
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