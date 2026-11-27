import { createLogger, format, transports } from 'winston';

/** Maksymalny rozmiar pojedynczego pliku logów (~150 KB ≈ ~1000 linii JSON). */
const MAX_LOG_FILE_SIZE = 150 * 1024;

/** Maksymalna liczba przechowywanych plików logów (1 aktywny + 1 archiwalny). */
const MAX_LOG_FILES = 2;

/**
 * Flaga określająca, czy aplikacja działa w trybie produkcyjnym.
 */
const isProd = process.env.NODE_ENV === 'production';

/**
 * @const fileFormat
 * @description Format zapisu logów do plików: dodaje znacznik czasu w
 * formacie YYYY-MM-DD HH:mm:ss oraz serializuje wpis do formatu JSON.
 */
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.json(),
);

/**
 * @const consoleFormat
 * @description Kolorowany, czytelny format wyjściowy dla konsoli deweloperskiej: [TIMESTAMP] LEVEL: MESSAGE.
 */
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  }),
);

/**
 * @const logger
 * @description Centralna instancja rejestratora zdarzeń (Winston) dla całego systemu backendowego.
 * Zapisuje błędy do logs/error.log, pełną historię do logs/combined.log oraz wyświetla logi w konsoli.
 */
const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  transports: [
    new transports.Console({
      format: isProd ? format.json() : consoleFormat,
    }),

    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: MAX_LOG_FILE_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true,
    }),

    new transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: MAX_LOG_FILE_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true,
    }),
  ],
});

export default logger;
