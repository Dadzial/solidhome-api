import Controller from '../interfaces/controller.interface';
import { Router, Request, Response } from 'express';
import HardwareStatusService from '../modules/services/hardware/hardware-status.service';

/**
 * Kontroler udostępniający informacje o stanie systemu i podłączonym sprzęcie IoT.
 */
class HardwareController implements Controller {
  /** Główna ścieżka bazowa dla tras systemowych */
  public path = '/api/hardware';

  /** Router Express do rejestracji tras */
  public router = Router();

  /**
   * @param boardStatusService Serwis monitorujący status fizycznej płytki mikrokontrolera
   * @constructor
   */
  constructor(private boardStatusService: HardwareStatusService) {
    this.initializeRoutes();
  }

  /**
   * Inicjalizuje trasy kontrolera.
   * @returns {void}
   */
  private initializeRoutes(): void {
    this.router.get(`${this.path}/status`, this.getBoardStatus);
  }

  /**
   * Zwraca bieżący stan obecności fizycznej płytki w sieci (online / offline).
   * @route GET /api/hardware/status
   * @access Public
   * @param _req - Obiekt żądania Express (nieużywane)
   * @param res - Obiekt odpowiedzi Express z informacją o stanie płytki
   * @returns {void}
   */
  private getBoardStatus = (_req: Request, res: Response): void => {
    res.status(200).json({
      online: this.boardStatusService.isBoardOnline,
    });
  };
}

export default HardwareController;
