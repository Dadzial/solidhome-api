import rateLimit from 'express-rate-limit';

const createLimiter = (max: number, windowMs = 15 * 60 * 1000) =>
    rateLimit({
        windowMs,
        max,
        message: { error: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
    });

export const createAccountLimiter = createLimiter(100);
export const authLimiter    = createLimiter(10);
export const passwordResetLimiter = createLimiter(5, 60 * 60 * 1000);
export const LightsLimiter = createLimiter(100);