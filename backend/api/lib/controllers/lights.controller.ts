import Controller from '../interfaces/controller.interface'
import {NextFunction, Router,Response} from "express";
import {auth, AuthRequest} from "../middlewares/auth.middleware";
import {LightsLimiter} from "../middlewares/rateLimiter.middleware";
import joi from 'joi';
import logger from '../utils/logger';


class LightsController implements Controller {
    path = '/api/lights'
    router = Router()
    private lightStatus : Record <number,number> = {}

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get(`${this.path}/get-status`, auth as any , LightsLimiter ,this.getLightStatus);
        this.router.post(`${this.path}/update-status`, auth as any , LightsLimiter ,this.updateLightsStatus);
    }

    private getLightStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try{
            res.status(200).json(this.lightStatus);
            logger.info(`Status is received`);
        }catch(err){
            res.status(500).json(err);
            logger.error(err.message);
        }
    }

    private updateLightsStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

        const schema = joi.object().pattern(
            joi.string().regex(/^[1-5]$/),
            joi.number().valid(0, 1).required()
        ).min(1);

        try {
            const {error,value} = schema.validate(req.body);

            if(error){
                logger.error(`Validation error: ${error.message}`);
                res.status(400).json({ message: "Invalid request body", details: error.message });
                return;
            }

            this.lightStatus = { ...this.lightStatus, ...value };
            logger.info(`Status updated successfully`);
            res.status(200).json({ message: "Status updated" });
        } catch (error) {
            logger.error(error.message);
            next(error);
        }
    }
}

export default  LightsController