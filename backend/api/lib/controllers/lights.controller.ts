import Controller from '../interfaces/controller.interface';
import { Router, Response, Request } from "express";
import { auth, AuthRequest } from "../middlewares/auth.middleware";
import { LightsLimiter } from "../middlewares/rate-limiter.middleware";
import LightsService from "../modules/services/lights/lights.service";
import LightsHistoryService from "../modules/services/lights/lights-history.service";
import LightsEnergyService from "../modules/services/lights/lights-energy.service";
import LightsScheduleService from "../modules/services/lights/lights-schedule.service";
import Joi from 'joi';
import logger from '../utils/logger';
import { Types } from 'mongoose';

/**
 * @class LightsController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę punktów świetlnych w systemie SolidHome.
 * Obsługuje synchronizację sprzętową z mikrokontrolerem NXP (SolidHome.c) oraz interfejs
 * aplikacji klienckich (odczyt stanów, sterowanie oświetleniem, odczyt i reset historii, zużycie energii, harmonogramy).
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
     * @param lightsEnergyService - Serwis zarządzania statystykami zużycia energii oświetlenia
     * @param lightsScheduleService - Serwis zarządzania regułami harmonogramu oświetlenia
     */
    constructor(
        private lightsService: LightsService,
        private lightsHistoryService: LightsHistoryService,
        private lightsEnergyService: LightsEnergyService,
        private lightsScheduleService: LightsScheduleService
    ) {
        this.initializeRoutes();
    }

    /**
     * Inicjalizuje i rejestruje trasy kontrolera wraz z middleware'ami.
     * @private
     */
    private initializeRoutes(): void {
        this.router.get(`${this.path}/status/hardware`, this.giveLightStatusToBoard);
        this.router.get(`${this.path}/status/app`, auth, LightsLimiter, this.giveLightStatusToApp);
        this.router.get(`${this.path}/history`, auth, LightsLimiter, this.getLightHistory);
        this.router.get(`${this.path}/energy`, auth, this.getLightEnergyStats);
        this.router.get(`${this.path}/rules`, auth, LightsLimiter, this.getScheduleRules);
        this.router.post(`${this.path}/rules`, auth, LightsLimiter, this.createScheduleRule);
        this.router.put(`${this.path}/rules/:id`, auth, LightsLimiter, this.updateRuleActiveStatus);
        this.router.post(`${this.path}/update`, auth, LightsLimiter, this.updateLightStatus);
        this.router.delete(`${this.path}/history/reset`, auth, LightsLimiter, this.deleteLightHistory);
        this.router.delete(`${this.path}/rules/:id`, auth, LightsLimiter, this.deleteScheduleRule);
    }

    /**
     * Zwraca aktualny stan świateł w postaci płaskiej mapy dla mikrokontrolera NXP (SolidHome.c).
     * @route GET /api/lights/status/hardware (oraz /api/lights/get/status)
     * @access Private (wymaga tokenu JWT)
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
     * Pobiera statystyki zużycia energii oświetlenia dla pojedynczego światła lub całego domu
     * w wybranym przedziale czasu ('today', 'week', 'month').
     * @route GET /api/lights/energy
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express (query: timeframe, room lub name)
     * @param res - Odpowiedź z obiektem statystyk ILightEnergy
     */
    private getLightEnergyStats = async (req: Request, res: Response) => {
        const schema = Joi.object({
            timeframe: Joi.string().valid('today', 'week', 'month').default('today'),
            room: Joi.string().default('entireHouse'),
            name: Joi.string().optional()
        }).unknown(true);

        const { error, value } = schema.validate(req.query);

        if (error) {
            logger.warn(`[LightsController] Validation error on GET /api/lights/energy: ${error.details[0].message}`);
            return res.status(400).json({ message: error.details[0].message });
        }

        try {
            const timeframe = value.timeframe;
            const roomName = value.name || value.room || 'entireHouse';
            const stats = await this.lightsEnergyService.getEnergyStats(timeframe, roomName);
            logger.info(`[LightsController] GET /api/lights/energy (${timeframe}, ${roomName}) -> totalKwh: ${stats.totalKwh}`);
            return res.status(200).json(stats);
        } catch (error) {
            logger.error('Error fetching lights energy stats', error);
            return res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    /**
     * Pobiera listę wszystkich reguł harmonogramu oświetlenia.
     * @route GET /api/lights/rules
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express
     * @param res - Odpowiedź z listą reguł harmonogramu
     */
    private getScheduleRules = async (req: Request, res: Response) => {
        try {
            const rules = await this.lightsScheduleService.getRules();
            res.status(200).json(rules);
        } catch (error) {
            logger.error('Error fetching schedule rules', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    /**
     * Tworzy nową regułę harmonogramu oświetlenia.
     * @route POST /api/lights/rules
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express z ciałem { name, days, startTime, endTime, rooms }
     * @param res - Odpowiedź ze statusem 201 i utworzoną regułą
     */
    private createScheduleRule = async (req: AuthRequest, res: Response) => {
        const schema = Joi.object({
            name: Joi.string().trim().min(1).max(100).required(),
            days: Joi.array().items(Joi.number().min(0).max(6)).min(1).required(),
            startTime: Joi.string().required(),
            endTime: Joi.string().required(),
            rooms: Joi.array().items(Joi.string()).default(['entireHouse']),
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        try {
            const userId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
            const rule = await this.lightsScheduleService.createRule({
                ...value,
                userId,
            });
            return res.status(201).json(rule);
        } catch (error) {
            logger.error('Error creating schedule rule', error);
            return res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    /**
     * Przełącza lub aktualizuje status aktywności reguły harmonogramu oświetlenia.
     * @route PUT /api/lights/rules/:id
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express z parametrem :id i opcjonalnym ciałem { active?: boolean }
     * @param res - Odpowiedź ze zaktualizowaną regułą
     */
    private updateRuleActiveStatus = async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid rule ID format' });
        }

        const schema = Joi.object({
            active: Joi.boolean().optional()
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        try {
            const updatedRule = await this.lightsScheduleService.toggleRule(id, value.active);
            if (!updatedRule) {
                return res.status(404).json({ message: 'Schedule rule not found' });
            }
            return res.status(200).json(updatedRule);
        } catch (error) {
            logger.error(`Error updating rule active status for ${id}`, error);
            return res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
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

    /**
     * Usuwa wybraną regułę harmonogramu oświetlenia.
     * @route DELETE /api/lights/rules/:id
     * @access Private (wymaga tokenu JWT)
     * @param req - Zapytanie Express z parametrem :id
     * @param res - Odpowiedź z potwierdzeniem usunięcia reguły
     */
    private deleteScheduleRule = async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid rule ID format' });
        }

        try {
            const success = await this.lightsScheduleService.deleteRule(id);
            if (!success) {
                return res.status(404).json({ message: 'Schedule rule not found' });
            }
            return res.status(200).json({ message: 'Schedule rule deleted successfully' });
        } catch (error) {
            logger.error(`Error deleting schedule rule ${id}`, error);
            return res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    };
}

export default LightsController;