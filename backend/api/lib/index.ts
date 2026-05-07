import App from "./app";
import UserController from "./controllers/user.controller";
import LightsController from "./controllers/lights.controller";

const app = new App();

const controllers = [
    new LightsController(),
    new UserController()
]

controllers.forEach(controller => {
    app.app.use("/", controller.router);
});

app.listen();