import { Request, Response, Router, NextFunction } from "express";
import UserService from "../modules/services/user.service";
import PasswordService from "../modules/services/password.service";
import TokenService from "../modules/services/token.service";
import {auth, AuthRequest} from "../middlewares/auth.middleware";
import {authLimiter , createAccountLimiter} from "../middlewares/rateLimiter.middleware";
import Controller from '../interfaces/controller.interface'
import logger from '../utils/logger';
import Joi from 'joi';

class UserController implements Controller {
    path = 'api/user';
    router = Router();

    constructor(private userService: UserService,private tokenService: TokenService,private passwordService: PasswordService) {
        this.initializeRouters();
    }

    private initializeRouters() {
        this.router.post(`${this.path}/create`,createAccountLimiter, this.createNew);
        this.router.post(`${this.path}/auth`, authLimiter , this.authenticate);
        this.router.delete(`${this.path}/logout/:userId`, auth as any, this.removeHashSession);
    }

    private createNew = async (req: Request, res: Response, next: NextFunction) => {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            userName: Joi.string().alphanum().min(3).max(30).required(),
            password: Joi.string().min(8).required()
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            logger.error(`Validation error during user creation: ${error.message}`);
            return res.status(400).json({ error: "Validation failed", details: error.details.map(d => d.message) });
        }

        const { email, userName, password } = value;

        try{
            const user = await this.userService.create({ email, userName });

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
            logger.error("Error creating user:", error);
            return res.status(400).json({ error: "Bad request", value: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    private authenticate = async (req: Request, res: Response, next: NextFunction) => {
        const schema = Joi.object({
            userName: Joi.string().required(),
            password: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: "Invalid input", details: error.details.map(d => d.message) });
        }

        const { userName, password } = value;

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
            logger.error(`Authentication Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(401).json({ error: "Unauthorized" });
        }
    }

    private removeHashSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
        const { userId } = req.params;

        if (req.user.userId !== userId) {
            return res.status(403).json({ error: "Forbidden: You can only logout yourself" });
        }

        try {
            let token = req.headers['x-access-token'] || req.headers['authorization'];
            if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
                token = token.slice(7, token.length);
            }
            if (!token || typeof token !== 'string') {
                return res.status(400).json({ error: "No token provided" });
            }
            
            const result = await this.tokenService.remove(token);
            logger.info("User session removed", result);
            return res.status(200).json({ message: "Logged out successfully" });
        } catch (error) {
            logger.error("Error removing user session", error);
            return res.status(401).json({ error: "Unauthorized" });
        }
    }
}

export default UserController;