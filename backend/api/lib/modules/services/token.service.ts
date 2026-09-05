import jwt from 'jsonwebtoken';
import  TokenModel  from '../schemas/token.schema';
import logger from "../../utils/logger";
import {config} from '../../config';
import { Types } from 'mongoose';

/**
 * @class TokenService
 * @description Serwis odpowiedzialny za generowanie, formatowanie i unieważnianie tokenów autoryzacyjnych JWT oraz zarządzanie sesją użytkownika w bazie danych.
 */
class TokenService {

    /**
     * Generuje nowy podpisany token JWT oraz zapisuje aktywną sesję autoryzacyjną w bazie danych.
     * Czas ważności tokenu wynosi 30 dni (jeśli zaznaczono rememberMe) lub 1 godzinę.
     *
     * @param userId - Identyfikator użytkownika w bazie danych.
     * @param email - Adres e-mail użytkownika włączany do ładunku (payload) JWT.
     * @param userName - Nazwa użytkownika włączana do ładunku (payload) JWT.
     * @param rememberMe - Flaga wydłużająca ważność tokenu do 30 dni (domyślnie: false).
     * @returns Promise<any> Zapisany dokument tokenu z bazy danych.
     * @throws Error w przypadku niepowodzenia zapisu sesji w bazie.
     */
    public async create(userId: Types.ObjectId, email: string, userName:string, rememberMe: boolean = false) {
        const access = 'auth';
        const userData = {
            userId: userId.toString(),
            email: email,
            userName: userName,
            access: access
        };

        const expiresIn = rememberMe ? '30d' : '1h';

        const value = jwt.sign(
            userData,
            config.jwtSecret,
            {
                expiresIn: expiresIn
            });

        try {
            const result = await new TokenModel({
                userId: userId as any,
                type: 'authorization',
                value,
                createDate: new Date().getTime()
            }).save();
            if (result) {
                return result;
            }
        } catch (error) {
            logger.error(`Error creating token for userId ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error creating data');
        }
    }

    /**
     * Formatuje obiekt odpowiedzi zawierający czystą wartość tekstową tokenu.
     *
     * @param token - Dokument tokenu z bazy danych.
     * @returns Obiekt z kluczem token gotowy do odesłania w odpowiedzi HTTP.
     */
    public getToken(token: any) {
        return {token: token.value};
    }

    /**
     * Unieważnia aktywną sesję użytkownika poprzez usunięcie tokenu z bazy danych (wylogowanie).
     *
     * @param tokenValue - Wartość tokenu JWT do usunięcia.
     * @returns Promise<any> Wynik operacji usunięcia z MongoDB.
     * @throws Error gdy token nie został znaleziony lub usunięty.
     */
    public async remove(tokenValue: string) {
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