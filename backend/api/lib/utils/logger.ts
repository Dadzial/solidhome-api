import { createLogger, format, transports } from 'winston';

const isProd = process.env.NODE_ENV === 'production';

const fileFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json()
);


const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level}: ${message}`;
    })
);

const logger = createLogger({
    level: isProd ? 'info' : 'debug',
    transports: [

        new transports.Console({
            format: isProd ? format.json() : consoleFormat
        }),


        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: fileFormat
        }),


        new transports.File({
            filename: 'logs/combined.log',
            format: fileFormat
        })
    ]
});

export default logger;