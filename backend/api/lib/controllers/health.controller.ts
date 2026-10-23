import { Router, Request, Response } from "express";
import Controller from "../interfaces/controller.interface";

/**
 * @class HealthController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę endpointu zdrowia aplikacji SolidHome API.
 */
class HealthController implements Controller {
    /** Główna ścieżka bazowa dla endpointu zdrowia */
    public path = "/";
    /** Router Express do rejestracji trasy */
    public router = Router();

    /**
     * @constructor
     */
    constructor() {
        this.initializeRoutes();
    }

    /**
     * Inicjalizuje i rejestruje trasy kontrolera wraz z middleware'ami.
     * @private
     * @returns void
     */
    private initializeRoutes() : void {
        this.router.get(`${this.path}`, this.healthCheck);
    }

    /**
     * Endpoint zdrowia aplikacji.
     * Zwraca status 200 OK z informacją, że SolidHome API działa poprawnie.
     * @access Private
     * @param req - Obiekt żądania Express
     * @param res - Obiekt odpowiedzi Express
     * @returns void
     */
    private healthCheck = (req: Request, res: Response) : void => {
        res.status(200).json({ status: "ok", message: "SolidHome API is running" });
    };
}

export default HealthController;
