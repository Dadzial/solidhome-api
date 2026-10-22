import { Router, Request, Response } from "express";
import Controller from "../interfaces/controller.interface";

class HealthController implements Controller {
    public path = "/";
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}`, this.healthCheck);
    }

    private healthCheck = (req: Request, res: Response) => {
        res.status(200).json({ status: "ok", message: "SolidHome API is running" });
    };
}

export default HealthController;
