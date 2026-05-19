import bcrypt from 'bcrypt';
import PasswordModel from '../schemas/password.schema';
import logger from '../../utils/logger';
import { Types } from 'mongoose';

class PasswordService {
    public async authorize(userId: Types.ObjectId, plainPassword: string): Promise<boolean> {
        try {
            const record = await PasswordModel.findOne({ userId: userId as any });
            if (!record) return false;

            const isMatch = await bcrypt.compare(plainPassword, record.password);
            return isMatch;
        } catch (error) {
            logger.error(`Authorization Error for userId ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    public async hashPassword(password: string): Promise<string> {
        try {
            const saltRounds = 10;
            return await bcrypt.hash(password, saltRounds);
        } catch (error) {
            logger.error(`Hashing Password Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to hash password');
        }
    }

    public async createOrUpdate({ userId, password }: { userId: Types.ObjectId; password: string }): Promise<void> {
        try {
            const hashedPassword = await this.hashPassword(password);
            const existing = await PasswordModel.findOne({ userId: userId as any });
            if (existing) {
                existing.password = hashedPassword;
                await existing.save();
            } else {
                await PasswordModel.create({ userId: userId as any, password: hashedPassword });
            }
        } catch (error) {
            logger.error(`Create/Update Password Error for userId ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to save password');
        }
    }

}

export default PasswordService;