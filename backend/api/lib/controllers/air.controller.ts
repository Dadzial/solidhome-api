import Controller from '../interfaces/controller.interface';
import {Router, Response, Request} from "express";
import {auth, AuthRequest} from "../middlewares/auth.middleware";
import Joi from 'joi';
import logger from '../utils/logger';

/**
 * @class AirController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę danych jakości powietrza w systemie SolidHome.
 * Przygotowanie do wdrożenia
 */
class AirController implements Controller {
    /** Główna ścieżka bazowa dla odczytów i zapisów danych jakości powietrza */
    path = '/api/air';
    /** Router Express do rejestracji tras */
    router = Router();

    /**
     * @constructor
     */
    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() : void {
        // Inicjalizacja tras
    }
}

export default AirController;
