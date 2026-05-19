import { Request, Response, Router, NextFunction } from "express";
import UserService from "../modules/services/user.service";
import PasswordService from "../modules/services/password.service";
import TokenService from "../modules/services/token.service";
import {auth} from "../middlewares/auth.middleware";
import Controller from '../interfaces/controller.interface'
import logger from '../utils/logger';

class UserController implements Controller {
    path = 'api/user';
    router = Router();

    constructor(private userService: UserService,private tokenService: TokenService,private passwordService: PasswordService) {
        this.initializeRouters();
    }

    private initializeRouters() {
        this.router.post(`${this.path}/create`, this.createNewOrUpdate);
        this.router.post(`${this.path}/auth`, this.authenticate);
        this.router.delete(`${this.path}/logout/:userId`,auth, this.removeHashSession);
    }

    private createNewOrUpdate = async (req: Request, res: Response, next: NextFunction) => {
        const userData = req.body;

        try{
            const user = await this.userService.createNewOrUpdate(userData);

            if (!user) {
                return res.status(400).json({ error: "Bad request" });
            }

            if (userData.password) {
                const hashedPassword = await this.passwordService.hashPassword(userData.password);
                await this.passwordService.createOrUpdate({
                    userId: user._id,
                    password: hashedPassword,
                });
            }
            return res.status(200).json(user);

        } catch (error) {
            logger.error("Validation error", error);
            return res.status(400).json({ error: "Bad request", value: error.message });
        }
    }

    private authenticate = async (req: Request, res: Response, next: NextFunction) => {
        const {userName, password} = req.body;

        try {
            const user = await this.userService.getByEmailOrName(userName);

            if (!user) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const isAuthorized = await this.passwordService.authorize(user._id,password);
            if (!isAuthorized) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const token = await this.tokenService.create(user._id);
            res.status(200).json(this.tokenService.getToken(token));

        } catch (error) {
            console.error(`Validation Error: ${(error as Error).message}`);
            return res.status(401).json({ error: "Unauthorized" });
        }
    }

    private removeHashSession = async (req: Request, res: Response, next: NextFunction) => {
        const { userId } = req.params;

        try {
            const result = await this.tokenService.remove(userId);
            logger.info("User removed", result);
            return res.status(200).json(result);
        } catch (error) {
            logger.error("Error removing user session", error);
            return res.status(401).json({ error: "Unauthorized" });
        }
    }
}

export default UserController;