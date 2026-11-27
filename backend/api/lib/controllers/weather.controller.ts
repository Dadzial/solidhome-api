import Controller from "../interfaces/controller.interface";
import { Router, Request, Response } from 'express';
import { auth } from '../middlewares/auth.middleware';
import Joi from 'joi';
import logger from '../utils/logger';

/**
 * @class WeatherController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę danych pogody w systemie SolidHome.
 * Udostępnia endpointy REST do pobierania bieżących odczytów.
 */
class WeatherController implements Controller {
    /** Główna ścieżka bazowa dla odczytów pogody */
    public path = '/api/weather';

    /** Router Express do rejestracji tras */
    public router = Router();

    /**
     * @constructor
     */
    constructor() {
        this.initializeRoutes();
    }

    /**
     * Inicjalizuje i rejestruje trasy kontrolera wraz z middleware'ami.
     * @returns {void}
     */
    private initializeRoutes(): void {
        this.router.get(`${this.path}/current`, auth, this.getWeatherData);
    }

    /**
     * Pobiera bieżące dane pogody.
     * @route GET /api/weather/current
     * @access Private
     * @param req - Obiekt żądania HTTP.
     * @param res - Obiekt odpowiedzi HTTP.
     * @returns {void}
     */
    private getWeatherData = async (req: Request, res: Response): Promise<void> => {

    }
}

export default WeatherController;