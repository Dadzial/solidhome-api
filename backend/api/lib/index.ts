import App from "./app";
import UserController from "./controllers/user.controller";
import LightsController from "./controllers/lights.controller";
import UserService from "./modules/services/user.service";
import TokenService from "./modules/services/token.service";
import PasswordService from "./modules/services/password.service";
import Controller from "./interfaces/controller.interface";

function createControllers(): Controller[] {
    const userService = new UserService();
    const tokenService = new TokenService();
    const passwordService = new PasswordService();

    return [
        new LightsController(),
        new UserController(userService, tokenService, passwordService)
    ];
}

const app = new App();
const controllers = createControllers();

controllers.forEach(controller => {
    app.app.use("/", controller.router);
});

app.listen();