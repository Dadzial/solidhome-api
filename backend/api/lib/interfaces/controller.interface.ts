import { Router } from 'express';

/**
 * @interface Controller
 * @property {string} path - Główna ścieżka bazowa tras obsługiwanych przez kontroler.
 * @property {Router} router - Instancja routera Express rejestrująca trasy kontrolera.
 * @description Bazowy interfejs, który musi implementować każdy kontroler w systemie SolidHome.
 */
interface Controller {
  path: string;
  router: Router;
}

export default Controller;
