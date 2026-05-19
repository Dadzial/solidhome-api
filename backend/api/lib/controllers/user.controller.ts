import { Request, Response, Router, NextFunction } from "express";
import UserService from "../modules/services/user.service";
import PasswordService from "../modules/services/password.service";
import TokenService from "../modules/services/token.service";
import {auth, AuthRequest} from "../middlewares/auth.middleware";
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
        this.router.delete(`${this.path}/logout/:userId`, auth as any, this.removeHashSession);
    }

    private createNewOrUpdate = async (req: Request, res: Response, next: NextFunction) => {
        const { email, userName, password } = req.body;

        try{
            const user = await this.userService.createNewOrUpdate({ email, userName });

            if (!user || !user._id) {
                return res.status(400).json({ error: "Bad request" });
            }

            if (password) {
                await this.passwordService.createOrUpdate({
                    userId: user._id,
                    password: password,
                });
            }
            return res.status(200).json(user);

        } catch (error) {
            logger.error("Validation error", error);
            return res.status(400).json({ error: "Bad request", value: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    private authenticate = async (req: Request, res: Response, next: NextFunction) => {
        const {userName, password} = req.body;

        try {
            const user = await this.userService.getByEmailOrName(userName);

            if (!user || !user._id) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const isAuthorized = await this.passwordService.authorize(user._id, password);
            if (!isAuthorized) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const token = await this.tokenService.create(user._id, user.email);
            res.status(200).json(this.tokenService.getToken(token));

        } catch (error) {
            console.error(`Validation Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(401).json({ error: "Unauthorized" });
        }
    }

    private removeHashSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
        const { userId } = req.params;

        if (req.user.userId !== userId) {
            return res.status(403).json({ error: "Forbidden: You can only logout yourself" });
        }

        try {
            const result = await this.tokenService.remove(userId);
            logger.info("User session removed", result);
            return res.status(200).json({ message: "Logged out successfully" });
        } catch (error) {
            logger.error("Error removing user session", error);
            return res.status(401).json({ error: "Unauthorized" });
        }
    }
}

export default UserController;