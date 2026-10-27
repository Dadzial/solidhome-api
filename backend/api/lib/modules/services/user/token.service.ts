import jwt from 'jsonwebtoken';
import TokenModel from '../../schemas/user/token.schema';
import logger from "../../../utils/logger";
import { config } from '../../../config';
import { Types } from 'mongoose';

/**
 * @interface AuthTokens
 * @property {string} token - Wartość Access Tokena JWT.
 * @property {string} refreshToken - Wartość Refresh Tokena JWT.
 * @description Interfejs TypeScript definiujący strukturę obiektu zwracanego przez metody serwisu TokenService,
 * zawierającego parę tokenów autoryzacyjnych (Access Token i Refresh Token).
 */
export interface AuthTokens {
    token: string;
    refreshToken: string;
}

/**
 * @class TokenService
 * @description Serwis odpowiedzialny za generowanie, formatowanie, odświeżanie i unieważnianie tokenów autoryzacyjnych JWT
 * (Access Token i Refresh Token) oraz zarządzanie sesją użytkownika w bazie danych.
 */
class TokenService {

    /**
     * Generuje parę tokenów JWT:
     * - Access Token (krótkotrwały: 15 minut)
     * - Refresh Token (długotrwały: 30 dni przy rememberMe lub 24 godziny)
     * Obie sesje są zapisywane w bazie danych z indeksem TTL odpowiadającym ich czasowi wygaśnięcia.
     *
     * @param userId - Identyfikator użytkownika w bazie danych.
     * @param email - Adres e-mail użytkownika włączany do ładunku (payload) JWT.
     * @param userName - Nazwa użytkownika włączana do ładunku (payload) JWT.
     * @param rememberMe - Flaga określająca czas życia Refresh Tokena (30 dni vs 24h, domyślnie: false).
     * @returns Promise<AuthTokens> Obiekt zawierający wygenerowaną parę: token (Access Token) i refreshToken.
     * @throws Error w przypadku niepowodzenia zapisu sesji w bazie.
     */
    public async create(userId: Types.ObjectId, email: string, userName: string, rememberMe: boolean = false): Promise<AuthTokens> {
        const userData = {
            userId: userId.toString(),
            email: email,
            userName: userName,
            access: 'auth'
        };

        const refreshData = {
            userId: userId.toString(),
            email: email,
            userName: userName,
            access: 'refresh'
        };

        const accessExpiresIn = '15m';
        const refreshExpiresIn = rememberMe ? '30d' : '24h';

        const accessExpireAt = new Date(Date.now() + 15 * 60 * 1000);
        const refreshDays = rememberMe ? 30 : 1;
        const refreshExpireAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

        const accessTokenValue = jwt.sign(userData, config.jwtSecret, { expiresIn: accessExpiresIn });
        const refreshTokenValue = jwt.sign(refreshData, config.jwtSecret, { expiresIn: refreshExpiresIn });

        try {
            const now = Date.now();

            await new TokenModel({
                userId: userId as any,
                type: 'authorization',
                value: accessTokenValue,
                createDate: now,
                expireAt: accessExpireAt
            }).save();

            await new TokenModel({
                userId: userId as any,
                type: 'refresh',
                value: refreshTokenValue,
                createDate: now,
                expireAt: refreshExpireAt
            }).save();

            return {
                token: accessTokenValue,
                refreshToken: refreshTokenValue
            };
        } catch (error) {
            logger.error(`Error creating token for userId ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error creating data');
        }
    }

    /**
     * Odświeża sesję użytkownika na podstawie ważnego Refresh Tokena.
     * Sprawdza obecność Refresh Tokena w bazie danych, weryfikuje podpis JWT i generuje nowy Access Token (15m).
     *
     * @param refreshTokenValue - Wartość Refresh Tokena przekazana przez klienta.
     * @returns Promise<AuthTokens> Obiekt z nowym Access Tokenem (token) i aktualnym Refresh Tokenem (refreshToken).
     * @throws Error gdy Refresh Token jest nieprawidłowy, wygasł lub nie istnieje w bazie.
     */
    public async refresh(refreshTokenValue: string): Promise<AuthTokens> {
        try {
            const tokenInDb = await TokenModel.findOne({ value: refreshTokenValue, type: 'refresh' });
            if (!tokenInDb) {
                throw new Error('Refresh token not found or expired');
            }

            if (tokenInDb.expireAt && tokenInDb.expireAt.getTime() < Date.now()) {
                await TokenModel.deleteOne({ _id: tokenInDb._id });
                throw new Error('Refresh token expired');
            }

            const decoded = jwt.verify(refreshTokenValue, config.jwtSecret) as any;
            if (decoded.access !== 'refresh') {
                throw new Error('Invalid token type');
            }

            const { userId, email, userName } = decoded;
            const newAccessExpiresIn = '15m';
            const newAccessExpireAt = new Date(Date.now() + 15 * 60 * 1000);

            const newAccessToken = jwt.sign(
                { userId, email, userName, access: 'auth' },
                config.jwtSecret,
                { expiresIn: newAccessExpiresIn }
            );

            await new TokenModel({
                userId: new Types.ObjectId(userId),
                type: 'authorization',
                value: newAccessToken,
                createDate: Date.now(),
                expireAt: newAccessExpireAt
            }).save();

            return {
                token: newAccessToken,
                refreshToken: refreshTokenValue
            };
        } catch (error) {
            logger.error(`Error refreshing token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error refreshing token');
        }
    }

    /**
     * Formatuje obiekt odpowiedzi zawierający czystą wartość tekstową tokenu oraz opcjonalnie refresh token.
     *
     * @param token - Dokument tokenu z bazy danych lub obiekt z polem value i refreshToken.
     * @returns Obiekt z tokenem i opcjonalnym refreshToken gotowy do odesłania w odpowiedzi HTTP.
     */
    public getToken(token: any): { token: string; refreshToken?: string } {
        if (!token) return { token: '' };
        return {
            token: token.token || token.value,
            ...(token.refreshToken ? { refreshToken: token.refreshToken } : {})
        };
    }

    /**
     * Unieważnia aktywną sesję użytkownika poprzez usunięcie tokenu z bazy danych (wylogowanie).
     *
     * @param tokenValue - Wartość tokenu JWT do usunięcia.
     * @returns Promise<any> Wynik operacji usunięcia z MongoDB.
     * @throws Error gdy token nie został znaleziony lub usunięty.
     */
    public async remove(tokenValue: string): Promise<any> {
        try {
            const result = await TokenModel.deleteOne({ value: tokenValue });

            if (result.deletedCount === 0) {
                throw new Error('Error while removing token');
            }
            return result;
        } catch (error) {
            logger.error(`Error removing token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error while removing token');
        }
    }
}

export default TokenService;
