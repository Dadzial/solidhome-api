import Controller from '../interfaces/controller.interface'
import {NextFunction, Router,Request,Response} from "express";
import joi from 'joi';
import logger from '../utils/logger';
import Joi from "joi";

class LightsController implements Controller {
    path = '/api/lights'
    router = Router()
    private lightStatus : Record <number,number> = {}

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get(`${this.path}/get-status`, this.getLightStatus);
        this.router.post(`${this.path}/status`, this.updateNxpStatus);
        this.router.post(`${this.path}/toggle`, this.toggleLight);
    }

    private getLightStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try{
            res.status(200).json(this.lightStatus);
            logger.info(`Status is received`);
        }catch(err){
            res.status(500).json(err);
            logger.error(err.message);
        }
    }

    private updateNxpStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

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

    private toggleLight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    }
}

export default  LightsController