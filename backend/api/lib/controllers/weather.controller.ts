import Controller from '../interfaces/controller.interface';
import { Router, Request, Response } from 'express';
import WeatherService from '../modules/services/air/weather.service';
import { auth } from '../middlewares/auth.middleware';
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
   * @param weatherService - Serwis zarządzający danymi pogodowymi.
   */
  constructor(private weatherService: WeatherService) {
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
   * @param _req - Obiekt żądania HTTP.
   * @param res - Obiekt odpowiedzi HTTP.
   * @returns {void}
   */
  private getWeatherData = async (_req: Request, res: Response): Promise<void> => {
    try {
      const weatherData = await this.weatherService.getCurrentWeather();
      res.status(200).json(weatherData);
    } catch (error) {
      logger.error(`Error fetching weather data: ${error}`);
      res.status(500).json({ message: 'Failed to fetch weather data' });
    }
  };
}

export default WeatherController;
