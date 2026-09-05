import ResetCodeModel from '../schemas/reset-code.schema';
import { IResetCode } from '../models/reset-code.model';
import logger from '../../utils/logger';
import { Types } from 'mongoose';

/**
 * @class ResetCodeService
 * @description Serwis zarządzający jednorazowymi kodami weryfikacyjnymi używanymi podczas procedury resetowania hasła.
 */
class ResetCodeService {

    /**
     * Zapisuje nowy kod weryfikacyjny w bazie danych.
     * Przed utworzeniem nowego wpisu unieważnia (usuwa) wszystkie poprzednie kody przypisane do danego użytkownika.
     *
     * @param userId - Identyfikator użytkownika wnioskującego o reset hasła.
     * @param code - 6-cyfrowy ciąg znaków (kod weryfikacyjny).
     * @returns Promise<IResetCode> Utworzony obiekt kodu.
     * @throws Error w przypadku niepowodzenia operacji na bazie danych.
     */
    public async create(userId: Types.ObjectId, code: string): Promise<IResetCode> {
        try {
            await ResetCodeModel.deleteMany({ userId: userId as any });

            const dataModel = new ResetCodeModel({ userId: userId as any, code });
            const result = await dataModel.save();
            return result.toObject() as IResetCode;
        } catch (error) {
            logger.error("Error creating reset code:", error);
            throw new Error('Error creating reset code');
        }
    }

    /**
     * Wyszukuje aktywny wpis kodu weryfikacyjnego na podstawie podanego ciągu znaków.
     *
     * @param code - 6-cyfrowy kod przesłany przez użytkownika.
     * @returns Promise<IResetCode | null> Znaleziony kod lub null, jeśli kod nie istnieje bądź wygasł (TTL).
     * @throws Error w przypadku błędu zapytania do bazy danych.
     */
    public async getByCode(code: string): Promise<IResetCode | null> {
        try {
            const result = await ResetCodeModel.findOne({ code });
            return result ? (result.toObject() as IResetCode) : null;
        } catch (error) {
            logger.error("Error fetching reset code:", error);
            throw new Error('Error fetching reset code');
        }
    }

    /**
     * Usuwa z bazy danych wykorzystany kod weryfikacyjny po pomyślnej zmianie hasła.
     *
     * @param codeId - Identyfikator dokumentu kodu (_id) do usunięcia.
     * @returns Promise<void>
     * @throws Error w przypadku błędu usuwania z bazy danych.
     */
    public async deleteCode(codeId: Types.ObjectId): Promise<void> {
        try {
            await ResetCodeModel.deleteOne({ _id: codeId });
        } catch (error) {
            logger.error("Error deleting reset code:", error);
            throw new Error('Error deleting reset code');
        }
    }
}

export default ResetCodeService;
