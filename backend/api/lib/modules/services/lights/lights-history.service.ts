import lightsHistoryModel from '../../schemas/lights/lights-history.schema';
import { ILightHistory } from '../../models/lights/lights-history.model';
import { Types } from 'mongoose';
import SseService from '../sse/sse.service';
import logger from '../../../utils/logger';

/**
 * @class LightsHistoryService
 * @description Serwis odpowiedzialny za rejestrowanie, odczyt oraz rozgłaszanie przez SSE
 * historii zdarzeń (logów) przełączeń świateł w systemie SolidHome.
 */
class LightsHistoryService {
  /**
   * @constructor
   * @param sseService - Opcjonalny serwis odpowiedzialny za obsługę Server-Sent Events.
   */
  constructor(private sseService?: SseService) {}

  /**
   * Zapisuje nowe zdarzenie przełączenia światła w dzienniku historii
   * oraz rozgłasza zaktualizowaną historię do aktywnych klientów SSE.
   *
   * @param name - Nazwa przełączonego światła (np. 'living_room').
   * @param state - Nowy zarejestrowany stan zasilania: 0 (wyłączone) lub 1 (włączone).
   * @param userId - Opcjonalny identyfikator użytkownika, który dokonał przełączenia.
   * @returns Promise<ILightHistory> Utworzony wpis historii.
   * @throws Error w przypadku niepowodzenia zapisu do bazy danych.
   */
  public async addHistoryEntry(
    name: string,
    state: number,
    userId?: Types.ObjectId,
  ): Promise<ILightHistory> {
    try {
      const entry = await lightsHistoryModel.create({
        name,
        state,
        userId,
      });
      logger.info(`[LightsHistoryService] Saved history entry: ${name} -> state: ${state}`);
      await this.broadcastHistory();
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
  public async getHistory(limit: number = 40): Promise<ILightHistory[]> {
    try {
      return await lightsHistoryModel
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'userName email')
        .lean();
    } catch (error) {
      logger.error('Error fetching lights history:', error);
      throw error;
    }
  }

  /**
   * Usuwa wszystkie wpisy z historii przełączeń świateł (reset dziennika).
   *
   * @returns Promise<{ acknowledged: boolean; deletedCount: number }> Wynik usunięcia dokumentów.
   * @throws Error w przypadku niepowodzenia operacji w bazie danych.
   */
  public async resetHistory(): Promise<{ acknowledged: boolean; deletedCount: number }> {
    try {
      const result = await lightsHistoryModel.deleteMany({});
      logger.info('Successfully reset lights history.');
      if (this.sseService && this.sseService.activeSessionsCount > 0) {
        this.sseService.broadcast('lights', 'history_updated', []);
      }
      return result;
    } catch (error) {
      logger.error('Error resetting lights history:', error);
      throw error;
    }
  }

  /**
   * Pobiera ostatnie 20 wpisów historii świateł i rozgłasza je przez SSE,
   * jeśli istnieje co najmniej jedna aktywna sesja SSE.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async broadcastHistory(): Promise<void> {
    if (!this.sseService || this.sseService.activeSessionsCount === 0) {
      return;
    }

    try {
      const history = await this.getHistory(20);
      this.sseService.broadcast('lights', 'history_updated', history);
    } catch (error) {
      logger.error('Error broadcasting lights history via SSE:', error);
    }
  }
}

export default LightsHistoryService;
