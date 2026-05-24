import Controller from '../interfaces/controller.interface'
import {NextFunction, Router,Response} from "express";
import {auth, AuthRequest} from "../middlewares/auth.middleware";
import {LightsLimiter} from "../middlewares/rateLimiter.middleware";
import LightsService, { ROOM_MAPPING } from "../modules/services/lights.service";
import joi from 'joi';
import logger from '../utils/logger';


class LightsController implements Controller {
    path = '/api/lights'
    router = Router()

    constructor(private lightsService : LightsService) {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get(`${this.path}/get-status`, auth as any , LightsLimiter ,this.getLightStatus);
        this.router.post(`${this.path}/update-status`, auth as any , LightsLimiter ,this.updateLightsStatus);
    }

    private getLightStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try{
            const lights = await this.lightsService.getAll();
            const statusMap: Record<number, number> = {};

            Object.entries(ROOM_MAPPING).forEach(([id, roomName]) => {
                const light = lights.find(l => l.room === roomName);
                statusMap[parseInt(id)] = light ? light.state : 0;
            });

            res.status(200).json(statusMap);
            logger.info(`Status is received from database`);
        }catch(err){
            logger.error(`Error getting light status: ${err.message}`);
            res.status(500).json({ error: "Internal server error" });
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

            await this.lightsService.updateStatus(value, req.user.userId);
            
            logger.info(`Status updated successfully in database by user ${req.user.userId}`);
            res.status(200).json({ message: "Status updated" });
        } catch (error) {
            logger.error(`Error updating light status: ${error.message}`);
            next(error);
        }
    }
}

export default  LightsController