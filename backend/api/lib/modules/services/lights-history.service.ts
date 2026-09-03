import lightsHistoryModel from '../schemas/lights-history.schema'
import {ILightHistory} from "../models/lights-history.model";
import { Types } from 'mongoose';
import logger from '../../utils/logger';

class LightsHistoryService {
    public async addHistoryEntry(name: string, state: number, userId?: Types.ObjectId): Promise<ILightHistory> {
        try {
            const entry = await lightsHistoryModel.create({
                name,
                state,
                userId
            });
            logger.info(`[LightsHistoryService] Zapisano w historii: ${name} -> stan: ${state}`);
            return entry;
        } catch (error) {
            logger.error(`[LightsHistoryService] Błąd zapisu historii dla ${name}:`, error);
            throw error;
        }
    }

    public async getHistory(limit: number = 100) {
        try {
            return await lightsHistoryModel.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('userId', 'userName email')
                .lean();
        } catch (error) {
            logger.error('[LightsHistoryService] Błąd pobierania całej historii:', error);
            throw error;
        }
    }
}

export default LightsHistoryService;