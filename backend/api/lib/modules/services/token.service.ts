import jwt from 'jsonwebtoken';
import  TokenModel  from '../schemas/token.schema';
import logger from "../../utils/logger";
import {config} from '../../config';
import { Types } from 'mongoose';

class TokenService {
    public async create(userId: Types.ObjectId, email: string, userName:string, rememberMe: boolean = false) {
        const access = 'auth';
        const userData = {
            userId: userId.toString(),
            email: email,
            userName: userName,
            access: access
        };

        const expiresIn = rememberMe ? '30d' : '1h';

        const value = jwt.sign(
            userData,
            config.jwtSecret,
            {
                expiresIn: expiresIn
            });

        try {
            const result = await new TokenModel({
                userId: userId as any,
                type: 'authorization',
                value,
                createDate: new Date().getTime()
            }).save();
            if (result) {
                return result;
            }
        } catch (error) {
            logger.error(`Error creating token for userId ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error creating data');
        }
    }

    public getToken(token: any) {
        return {token: token.value};
    }

    public async remove(tokenValue: string) {
        try {
            const result = await TokenModel.deleteOne({ value: tokenValue });

            if (result.deletedCount === 0) {
                throw new Error('Error while removing token');
            }
            return result;
        } catch (error) {
            logger.error(`Error removing token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error while removing token');
        }
    }
}

export default TokenService;