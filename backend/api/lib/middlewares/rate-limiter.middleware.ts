import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

/**
 * @const createLimiter
 * @param max - Maksymalna liczba żądań dozwolona w określonym oknie czasowym (windowMs).
 * @param windowMs - Okno czasowe
 * @description - Funkcja tworząca middleware ograniczający liczbę żądań dla danej trasy Express.
 * Identyfikuje klienta po ID zalogowanego użytkownika (jeśli jest po middleware auth) lub po adresie IP.
 * @returns RateLimitRequestHandler - Middleware Express ograniczający liczbę żądań.
 */
const createLimiter = (max: number, windowMs: number = 15 * 60 * 1000): RateLimitRequestHandler =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user?.userId || user?._id?.toString() || req.ip || 'unknown';
    },
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const createAccountLimiter = createLimiter(100);
export const updateAccountLimiter = createLimiter(50);
export const authLimiter = createLimiter(10);
export const passwordResetLimiter = createLimiter(5, 60 * 60 * 1000);
export const LightsLimiter = createLimiter(300, 60 * 1000);
