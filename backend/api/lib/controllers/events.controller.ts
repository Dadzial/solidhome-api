import Controller from '../interfaces/controller.interface';
import { Router, Response } from 'express';
import { auth, AuthRequest } from '../middlewares/auth.middleware';
import SseService from "../modules/services/sse/sse.service";
import logger from "../utils/logger";
import {createSession} from "better-sse";

class EventsController implements Controller {
    /** Główna ścieżka bazowa dla tras zdarzeń */
    public path = '/api/events';
    /** Router Express do rejestracji tras */
    public router = Router();

    /**
     * @constructor
     * @param sseService - Serwis do obsługi SSE (Server-Sent Events)
     */
    constructor(private sseService: SseService) {
        this.initializeRoutes();
    }

    /**
     * Inicjalizuje i rejestruje trasy kontrolera wraz z middleware'ami.
     * @private
     */
    private initializeRoutes(): void {
        this.router.get(`${this.path}`, auth, this.streamEvents);
    }

    /**
     * Tworzy nową sesję SSE i rejestruje ją w serwisie SSE.
     * @route GET /api/events
     * @access Private (Wymaga tokenu JWT)
     * @param req - Zapytanie Express
     * @param res - Ewentualna odpowiedź z błędem, jeśli nie uda się utworzyć sesji SSE
     *
     */
    private streamEvents = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const session = await createSession(req ,res);
            this.sseService.registerSession(session);
        } catch (error) {
            logger.error('Error creating SSE session:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to establish SSE stream' });
            }
        }
    }
}
export default EventsController;