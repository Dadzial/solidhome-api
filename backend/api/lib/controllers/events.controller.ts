import Controller from '../interfaces/controller.interface';
import { Router, Response } from 'express';
import { auth, AuthRequest } from '../middlewares/auth.middleware';
import SseService from '../modules/services/sse/sse.service';
import logger from '../utils/logger';
import { createSession } from 'better-sse';

/**
 * @class EventsController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę zdarzeń w systemie SolidHome.
 * Udostępnia endpoint REST do strumieniowania zdarzeń w czasie rzeczywistym przy użyciu SSE (Server-Sent Events).
 */
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
   * @returns {void}
   */
  private initializeRoutes(): void {
    this.router.get(`${this.path}`, auth, this.streamEvents);
  }

  /**
   * Tworzy nową sesję SSE, konfiguruje nagłówki anty-buforujące dla reverse proxy
   * (Render/Nginx/Cloudflare) oraz keep-alive (15s) i rejestruje sesję w serwisie SSE.
   *
   * @route GET /api/events
   * @access Private (Wymaga tokenu JWT)
   * @param req - Zapytanie Express
   * @param res - Odpowiedź Express ze strumieniem zdarzeń lub komunikatem błędu
   * @returns {Promise<void>}
   */
  private streamEvents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Cache-Control', 'no-cache, no-transform');

      const session = await createSession(req, res);
      this.sseService.registerSession(session);
    } catch (error) {
      logger.error('Error creating SSE session:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to establish SSE stream' });
      }
    }
  };
}
export default EventsController;
