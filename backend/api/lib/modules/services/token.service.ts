import jwt from 'jsonwebtoken';
import  TokenModel  from '../schemas/token.schema';
import logger from "../../utils/logger";
import {config} from '../../config';

class TokenService {
    public async create(user: any) {
        const access = 'auth';
        const userData = {
            userId: user.id,
            name: user.email,
            access: access
        };

        const value = jwt.sign(
            userData,
            config.jwtSecret,
            {
                expiresIn: '1h'
            });

        try {
            const result = await new TokenModel({
                userId: user.id,
                type: 'authorization',
                value,
                createDate: new Date().getTime()
            }).save();
            if (result) {
                return result;
            }
        } catch (error) {
            logger.error(`Error creating token for userId ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error creating data');
        }
    }

    public getToken(token: any) {
        return {token: token.value};
    }
    public async remove(userId: string) {
        try {
            const result = await TokenModel.deleteOne({ userId: userId });

            if (result.deletedCount === 0) {
                throw new Error('Error while removing token');
            }
            return result;
        } catch (error) {
            logger.error(`Error removing token for userId ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Error while removing token');
        }
    }
}

export default TokenService;