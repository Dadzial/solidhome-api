import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

/**
 * @interface AuthRequest
 * @property user - Zdekodowany ładunek (payload) tokenu JWT (m.in. userId, email, userName).
 * @description Rozszerzenie standardowego zapytania Express (Request) o pole `user`,
 * zawierające zdekodowane dane użytkownika po pomyślnej weryfikacji tokenu JWT.
 */
export interface AuthRequest extends Request {
    user?: any;
}

/**
 * @const auth
 * @param request - Rozszerzone zapytanie Express (AuthRequest), do którego dołączane są dane sesji użytkownika.
 * @param response - Obiekt odpowiedzi Express służący do przerwania żądania kodem 401 w razie braku autoryzacji.
 * @param next - Funkcja Express przekazująca sterowanie do kolejnego middleware lub kontrolera.
 * @description Middleware autoryzacyjny Express weryfikujący obecność i ważność tokenu JWT.
 * Pobiera token z nagłówka 'authorization' (Bearer <token>) lub 'x-access-token',
 * sprawdza podpis kryptograficzny oraz weryfikuje istnienie aktywnej sesji w bazie danych (TokenModel).
 * Po poprawnej weryfikacji przypisuje zdekodowane dane do `request.user` i wywołuje `next()`.
 * W przypadku braku tokenu lub jego nieważności odsyła kod błędu 401 (Unauthorized).
 */
export const auth = async (request: AuthRequest, response: Response, next: NextFunction) => {
    let token = request.headers['x-access-token'] || request.headers['authorization'];
    if (token && typeof token === 'string') {
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }
        try {
            const decoded = jwt.verify(token, config.jwtSecret);

            const TokenModel = (await import('../modules/schemas/token.schema')).default;
            const tokenExists = await TokenModel.findOne({ value: token });
            if (!tokenExists) {
                return response.status(401).send('Invalid or expired token.');
            }
            
            request.user = decoded;
            next();
        } catch (ex) {
            return response.status(401).send('Invalid token.');
        }
    } else {
        return response.status(401).send('Access denied. No token provided.');
    }
};