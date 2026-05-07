import Controller from 'interfaces/controller.interface'
import {Router} from "express";

class LightsController implements Controller {
    path = 'api/lights'
    router = Router()
}

export default  LightsController