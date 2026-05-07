import Controller from 'interfaces/controller.interface'
import {Router} from "express";

class UserController implements Controller {
    path = 'api/user';
    router = Router();
}

export default UserController;