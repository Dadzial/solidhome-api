import ResetCodeModel from '../schemas/resetCode.schema';
import { IResetCode } from '../models/resetCode.model';
import logger from '../../utils/logger';
import { Types } from 'mongoose';

class ResetCodeService {
    public async create(userId: Types.ObjectId, code: string): Promise<IResetCode> {
        try {
            await ResetCodeModel.deleteMany({ userId: userId as any });

            const dataModel = new ResetCodeModel({ userId: userId as any, code });
            const result = await dataModel.save();
            return result.toObject() as IResetCode;
        } catch (error) {
            logger.error("Error creating reset code:", error);
            throw new Error('Error creating reset code');
        }
    }

    public async getByCode(code: string): Promise<IResetCode | null> {
        try {
            const result = await ResetCodeModel.findOne({ code });
            return result ? (result.toObject() as IResetCode) : null;
        } catch (error) {
            logger.error("Error fetching reset code:", error);
            throw new Error('Error fetching reset code');
        }
    }

    public async deleteCode(codeId: Types.ObjectId): Promise<void> {
        try {
            await ResetCodeModel.deleteOne({ _id: codeId });
        } catch (error) {
            logger.error("Error deleting reset code:", error);
            throw new Error('Error deleting reset code');
        }
    }
}

export default ResetCodeService;
