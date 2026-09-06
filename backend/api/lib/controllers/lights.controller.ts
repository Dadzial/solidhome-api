import Controller from '../interfaces/controller.interface';
import { Router, Response, Request } from "express";
import { auth, AuthRequest } from "../middlewares/auth.middleware";
import { LightsLimiter } from "../middlewares/rate-limiter.middleware";
import LightsService from "../modules/services/lights.service";
import LightsHistoryService from "../modules/services/lights-history.service";
import Joi from 'joi';
import logger from '../utils/logger';
import { Types } from 'mongoose';

/**
 * @class LightsController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę punktów świetlnych w systemie SolidHome.
 * Obsługuje synchronizację sprzętową z mikrokontrolerem NXP (SolidHome.c) oraz interfejs
 * aplikacji klienckich (odczyt stanów, sterowanie oświetleniem, odczyt i reset historii).
 */
class LightsController implements Controller {
    /** Główna ścieżka bazowa dla tras świateł */
    path = '/api/lights';
    /** Router Express do rejestracji tras */
    router = Router();

    /**
     * @constructor
     * @param lightsService - Serwis operacji na bieżącym stanie świateł
     * @param lightsHistoryService - Serwis zarządzania historią zdarzeń oświetlenia
     */
    constructor(
        private lightsService: LightsService,
        private lightsHistoryService: LightsHistoryService
    ) {
        this.initializeRoutes();
    }

    /**
     * Inicjalizuje i rejestruje trasy kontrolera wraz z middleware'ami.
     * @private
     */
    private initializeRoutes(): void {
        this.router.get(`${this.path}/status/hardware`, this.giveLightStatusToBoard);
        this.router.get(`${this.path}/status/app`, auth as any, LightsLimiter, this.giveLightStatusToApp);
        this.router.get(`${this.path}/history`, auth as any, LightsLimiter, this.getLightHistory);
        this.router.post(`${this.path}/update`, auth as any, LightsLimiter, this.updateLightStatus);
        this.router.delete(`${this.path}/history/reset`, auth as any, LightsLimiter, this.deleteLightHistory);
    }

    /**
     * Zwraca aktualny stan świateł w postaci płaskiej mapy dla mikrokontrolera NXP (SolidHome.c).
     * @route GET /api/lights/status/hardware (oraz /api/lights/get/status)
     * @access Public
     * @param req - Zapytanie Express
     * @param res - Odpowiedź ze słownikiem stanów { [nazwa]: 0 | 1 }
     */
    private giveLightStatusToBoard = async (req: Request, res: Response) => {
        try {
            const status = await this.lightsService.sendLightsStatusToHardware();
            res.status(200).json(status);
        } catch (error) {
            logger.error('Error fetching lights status for hardware', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    /**
     * Zwraca listę wszystkich świateł dla interfejsu aplikacji klienckiej.
     * @route GET /api/lights/status/app
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express
     * @param res - Odpowiedź z listą dokumentów świateł
     */
    private giveLightStatusToApp = async (req: Request, res: Response) => {
        try {
            const status = await this.lightsService.sendLightsStatusToApps();
            res.status(200).json(status);
        } catch (error) {
            logger.error('Error fetching lights status for app', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    /**
     * Pobiera zarejestrowaną historię przełączeń świateł posortowaną od najnowszych wpisów.
     * @route GET /api/lights/history
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express (opcjonalny parametr query ?limit=)
     * @param res - Odpowiedź z listą wpisów historii
     */
    private getLightHistory = async (req: Request, res: Response) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
            const history = await this.lightsHistoryService.getHistory(limit);
            res.status(200).json(history);
        } catch (error) {
            logger.error('Error fetching lights history', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    /**
     * Zmienia stan fizyczny światła i rejestruje to zdarzenie w historii.
     * @route POST /api/lights/update
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express zawierające { name: string, state: 0 | 1 }
     * @param res - Odpowiedź z zaktualizowanym obiektem światła
     */
    private updateLightStatus = async (req: AuthRequest, res: Response) => {
        const schema = Joi.object({
            name: Joi.string().required(),
            state: Joi.number().valid(0, 1).required()
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, state } = value;

        try {
            const userId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
            const updatedLight = await this.lightsService.updateLightState(name, state, userId);
            return res.status(200).json(updatedLight);
        } catch (error) {
            logger.error(`Error updating light state for "${name}"`, error);
            return res.status(400).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    /**
     * Czyści całą historię zdarzeń przełączeń świateł w systemie.
     * @route DELETE /api/lights/history/reset
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express
     * @param res - Odpowiedź z potwierdzeniem wyczyszczenia historii
     */
    private deleteLightHistory = async (req: Request, res: Response) => {
        try {
            const result = await this.lightsHistoryService.resetHistory();
            return res.status(200).json({ message: 'History reset successfully', deletedCount: result.deletedCount });
        } catch (error) {
            logger.error('Error resetting lights history', error);
            return res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };
}

export default LightsController;