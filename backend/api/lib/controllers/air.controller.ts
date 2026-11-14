import Controller from '../interfaces/controller.interface';
import { Router } from 'express';

/**
 * @class AirController
 * @implements Controller
 * @description Kontroler odpowiedzialny za obsługę danych jakości powietrza w systemie SolidHome.
 * Przygotowanie do wdrożenia
 */
class AirController implements Controller {
  /** Główna ścieżka bazowa dla odczytów i zapisów danych jakości powietrza */
  public path = '/api/air';
  /** Router Express do rejestracji tras */
  public router = Router();

  /**
   * @constructor
   */
  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Inicjalizacja tras
  }
}

export default AirController;
