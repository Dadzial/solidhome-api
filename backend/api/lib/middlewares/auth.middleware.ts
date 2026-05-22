import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
    user?: any;
}

export const auth = async (request: AuthRequest, response: Response, next: NextFunction) => {
    let token = request.headers['x-access-token'] || request.headers['authorization'];
    if (token && typeof token === 'string') {
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }
        try {
            const decoded = jwt.verify(token, config.jwtSecret);

            const TokenModel = (await import('../modules/schemas/token.schema')).default;
            const tokenExists = await TokenModel.findOne({ value: token });
            if (!tokenExists) {
                return response.status(401).send('Invalid or expired token.');
            }
            
            request.user = decoded;
            next();
        } catch (ex) {
            return response.status(401).send('Invalid token.');
        }
    } else {
        return response.status(401).send('Access denied. No token provided.');
    }
};