import Controller from 'interfaces/controller.interface'
import {NextFunction, Router,Request,Response} from "express";
import logger from 'utils/logger';

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
        try {
            const data = req.body;
            this.lightStatus = { ...this.lightStatus, ...data };
            logger.info(`Status is received`);
            res.status(200).json({ message: "Status updated" });
        } catch (error) {
            next(error);
            logger.error(error.message);
        }
    }

    private toggleLight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    }
}

export default  LightsController