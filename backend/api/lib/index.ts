import App from "./app";
import UserController from "./controllers/user.controller";
import LightsController from "./controllers/lights.controller";
import UserService from "./modules/services/user.service";
import TokenService from "./modules/services/token.service";
import PasswordService from "./modules/services/password.service";
import EmailService from "./modules/services/email.service";
import ResetCodeService from "./modules/services/reset-code.service";
import Controller from "./interfaces/controller.interface";
import LightsService from "./modules/services/lights.service";
import LightsHistoryService from "./modules/services/lights-history.service";

/**
 * Fabryka inicjalizująca instancje serwisów oraz wstrzykująca je jako zależności do kontrolerów.
 *
 * @returns Tablica skonfigurowanych kontrolerów aplikacji implementujących interfejs Controller.
 */
function createControllers(): Controller[] {
    const userService = new UserService();
    const tokenService = new TokenService();
    const passwordService = new PasswordService();
    const emailService = new EmailService();
    const resetCodeService = new ResetCodeService();
    const lightsHistoryService = new LightsHistoryService();
    const lightsService = new LightsService(lightsHistoryService);

    return [
        new LightsController(lightsService, lightsHistoryService),
        new UserController(userService, tokenService, passwordService, emailService, resetCodeService)
    ];
}

/**
 * Główna instancja aplikacji serwera SolidHome API.
 */
const app = new App();

/**
 * Lista zarejestrowanych kontrolerów aplikacji.
 */
const controllers = createControllers();

controllers.forEach(controller => {
    app.app.use("/", controller.router);
});

app.listen();