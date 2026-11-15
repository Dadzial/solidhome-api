import Controller from '../interfaces/controller.interface';
import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from '../docs/swagger';

class DocController implements Controller {
  /** Główna ścieżka bazowa dla tras dokumentacji */
  public path = '/api/docs';

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
    this.router.get(`${this.path}`, this.getSwaggerDoc);
  }

  /**
   * Endpoint zwracający dokumentację Swaggera.
   * @route GET /api/docs
   * @access Private (Wymaga tokenu JWT)
   * @param req - Zapytanie Express
   * @param res - Odpowiedź Express z dokumentacją Swaggera
   */
  private getSwaggerDoc = (req: Request, res: Response): void => {
    const html = swaggerUi.generateHTML(swaggerDocument, {
      customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
      ],
    });

    res.send(html);
  };
}
export default DocController;
