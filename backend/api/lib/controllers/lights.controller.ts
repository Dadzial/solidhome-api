import Controller from '../interfaces/controller.interface'
import {NextFunction, Router,Response} from "express";
import {auth, AuthRequest} from "../middlewares/auth.middleware";
import {LightsLimiter} from "../middlewares/rate-limiter.middleware";
import LightsService from "../modules/services/lights.service";
import LightsHistoryService from "../modules/services/lights-history.service";
import joi from 'joi';
import logger from '../utils/logger';
import {Types} from 'mongoose';


class LightsController implements Controller {
    path = '/api/lights'
    router = Router()

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {

    }
}

export default  LightsController