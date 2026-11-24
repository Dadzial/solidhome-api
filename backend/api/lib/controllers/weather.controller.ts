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

    }
}

export default WeatherController;