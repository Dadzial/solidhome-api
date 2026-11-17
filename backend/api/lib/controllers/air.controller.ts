import Controller from '../interfaces/controller.interface';
import { Router, Request, Response } from 'express';
import { auth } from '../middlewares/auth.middleware';
import AirService from '../modules/services/air/air.service';
import Joi from 'joi';
import logger from '../utils/logger';

/**
 * @class AirController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę danych jakości powietrza w systemie SolidHome.
 * Udostępnia endpointy REST do pobierania bieżących odczytów, historii pomiarów oraz czyszczenia historii.
 */
class AirController implements Controller {
  /** Główna ścieżka bazowa dla odczytów i zapisów danych jakości powietrza */
  public path = '/api/air';

  /** Router Express do rejestracji tras */
  public router = Router();

  /**
   * @constructor
   * @param airService - Serwis odpowiedzialny za zarządzanie danymi z czujnika powietrza.
   */
  constructor(private airService: AirService) {
    this.initializeRoutes();
  }

  /**
   * Inicjalizuje i rejestruje trasy kontrolera wraz z middleware'ami.
   * @returns {void}
   */
  private initializeRoutes(): void {
    this.router.get(`${this.path}/current`, auth, this.getCurrentAirData);
    this.router.get(`${this.path}/history`, auth, this.getAirHistory);
    this.router.delete(`${this.path}/history/clear`, auth, this.deleteAirHistory);
  }

  /**
   * Pobiera najświeższy odczyt parametrów powietrza z czujnika.
   * @route GET /api/air/current
   * @access Private (wymaga tokenu JWT)
   * @param _req - Zapytanie Express
   * @param res - Odpowiedź z bieżącymi danymi powietrza lub kod 503 gdy płytka offline
   */
  private getCurrentAirData = async (_req: Request, res: Response): Promise<void> => {
    try {
      const airData = await this.airService.getCurrentAir();
      res.status(200).json(airData);
    } catch (error) {
      if (error instanceof Error && error.message === 'hardware_offline') {
        logger.warn('Hardware board is offline');
        res.status(503).json({ message: 'Hardware board is offline' });
        return;
      }
      logger.error('Error fetching current air data', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  /**
   * Pobiera zarejestrowaną historię pomiarów powietrza posortowaną chronologicznie.
   * @route GET /api/air/history
   * @access Private (wymaga tokenu JWT)
   * @param req - Zapytanie Express (opcjonalny query param ?limit=)
   * @param res - Odpowiedź z listą punktów pomiarowych
   */
  private getAirHistory = async (req: Request, res: Response): Promise<void> => {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).max(1000).default(50),
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      logger.warn(`Validation error on GET /api/air/history: ${error.details[0].message}`);
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    try {
      const history = await this.airService.getAirHistory(value.limit);
      res.status(200).json(history);
    } catch (error) {
      logger.error('Error fetching air history', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  /**
   * Usuwa całą zapisaną historię pomiarów powietrza z bazy danych.
   * @route DELETE /api/air/history/clear
   * @access Private (wymaga tokenu JWT)
   * @param _req - Zapytanie Express
   * @param res - Odpowiedź z potwierdzeniem wyczyszczenia bazy
   */
  private deleteAirHistory = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.airService.clearHistory();
      res.status(200).json({
        message: 'History cleared successfully',
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      logger.error('Error clearing air history', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}

export default AirController;
