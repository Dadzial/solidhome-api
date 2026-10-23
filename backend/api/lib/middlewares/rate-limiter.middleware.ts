import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

/**
 * @const createLimiter
 * @param max - Maksymalna liczba żądań dozwolona w określonym oknie czasowym (windowMs).
 * @param windowMs - Okno czasowe
 * @description - Funkcja tworząca middleware ograniczający liczbę żądań dla danej trasy Express.
 * @returns RateLimitRequestHandler - Middleware Express ograniczający liczbę żądań.
 */
const createLimiter = (max: number, windowMs: number = 15 * 60 * 1000): RateLimitRequestHandler =>
    rateLimit({
        windowMs,
        max,
        message: { error: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
    });

export const createAccountLimiter = createLimiter(100);
export const updateAccountLimiter = createLimiter(50);
export const authLimiter    = createLimiter(10);
export const passwordResetLimiter = createLimiter(5, 60 * 60 * 1000);
export const LightsLimiter = createLimiter(200);