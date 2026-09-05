import cors from "cors";
import { CorsOptions } from "cors";

/**
 * @const allowedOrigins
 * @description Biała lista dozwolonych domen (Origins) uprawnionych do
 * wykonywania zapytań międzydomenowych (CORS) do API (np. frontend Angular na porcie 4200).
 */
const allowedOrigins = ['http://localhost:4200'];

/**
 * @const corsOptions
 * @description Konfiguracja polityki CORS dla aplikacji Express.
 * Dynamicznie sprawdza nagłówek Origin zapytania pod kątem obecności na liście allowedOrigins,
 * zezwala na zapytania bez nagłówka Origin (np. Postman, urządzenia IoT/ESP/NXP)
 * oraz obsługuje przesyłanie poświadczeń (cookies/tokeny).
 */
const corsOptions: CorsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    credentials: true,
    optionsSuccessStatus: 204
};

/**
 * @const corsMiddleware
 * @description Gotowy middleware Express stosujący zdefiniowaną
 * politykę CORS dla wszystkich przychodzących żądań HTTP.
 */
export const corsMiddleware = cors(corsOptions);