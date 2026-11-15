import Controller from '../interfaces/controller.interface';
import { Router, Request, Response } from 'express';
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
   * @param _req - Zapytanie Express
   * @param res - Odpowiedź Express z dokumentacją Swaggera
   */
  private getSwaggerDoc = (_req: Request, res: Response): void => {
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>SolidHome API Documentation</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
      <style>
        body { margin: 0; background: #fafafa; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            spec: ${JSON.stringify(swaggerDocument)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  };
}

export default DocController;
