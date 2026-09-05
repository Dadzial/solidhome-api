import lightsHistoryModel from '../schemas/lights-history.schema'
import {ILightHistory} from "../models/lights-history.model";
import { Types } from 'mongoose';
import logger from '../../utils/logger';

/**
 * @class LightsHistoryService
 * @description Serwis odpowiedzialny za rejestrowanie oraz odczyt historii zdarzeń (logów) przełączeń świateł w systemie SolidHome.
 */
class LightsHistoryService {

    /**
     * Zapisuje nowe zdarzenie przełączenia światła w dzienniku historii.
     *
     * @param name - Nazwa przełączonego światła (np. 'living_room').
     * @param state - Nowy zarejestrowany stan zasilania: 0 (wyłączone) lub 1 (włączone).
     * @param userId - Opcjonalny identyfikator użytkownika, który dokonał przełączenia.
     * @returns Promise<ILightHistory> Utworzony wpis historii.
     * @throws Error w przypadku niepowodzenia zapisu do bazy danych.
     */
    public async addHistoryEntry(name: string, state: number, userId?: Types.ObjectId): Promise<ILightHistory> {
        try {
            const entry = await lightsHistoryModel.create({
                name,
                state,
                userId
            });
            logger.info(`[LightsHistoryService] Saved history entry: ${name} -> state: ${state}`);
            return entry;
        } catch (error) {
            logger.error(`[LightsHistoryService] Error saving history entry for ${name}:`, error);
            throw error;
        }
    }

    /**
     * Pobiera zbiorczą historię przełączeń świateł w całym domu, posortowaną od najnowszych zdarzeń.
     * Dołącza podstawowe dane użytkownika (userName, email), który wywołał dane zdarzenie.
     *
     * @param limit - Maksymalna liczba wpisów do pobrania (domyślnie: 100).
     * @returns Promise<ILightHistory[]> Lista wpisów historii.
     * @throws Error w przypadku błędu odczytu z bazy danych.
     */
    public async getHistory(limit: number = 40) {
        try {
            return await lightsHistoryModel.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('userId', 'userName email')
                .lean();
        } catch (error) {
            logger.error('[LightsHistoryService] Error fetching lights history:', error);
            throw error;
        }
    }

    /**
     * Usuwa wszystkie wpisy z historii przełączeń świateł (reset dziennika).
     *
     * @returns Promise<{ acknowledged: boolean; deletedCount: number }> Wynik usunięcia dokumentów.
     * @throws Error w przypadku niepowodzenia operacji w bazie danych.
     */
    public async resetHistory() {
        try {
            const result = await lightsHistoryModel.deleteMany({});
            logger.info('[LightsHistoryService] Successfully reset lights history.');
            return result;
        } catch (error) {
            logger.error('[LightsHistoryService] Error resetting lights history:', error);
            throw error;
        }
    }
}

export default LightsHistoryService;