import LightModel from '../schemas/lights.schema';
import { ILight } from '../models/lights.model';
import { Types } from 'mongoose';
import logger from '../../utils/logger';

const ROOM_MAPPING: Record<number, string> = {
    1: 'Living Room',
    2: 'Kitchen',
    3: 'Bedroom',
    4: 'Bathroom',
    5: 'Hallway'
};

class LightsService {
    public async getAll(): Promise<ILight[]> {
        try {
            const dbLights = await LightModel.find().lean();

            return Object.keys(ROOM_MAPPING).map(id => {
                const lightId = parseInt(id);
                const dbLight = dbLights.find(l => l.lightId === lightId);
                
                return dbLight || {
                    lightId,
                    room: ROOM_MAPPING[lightId],
                    state: 0
                } as ILight;
            });
        } catch (error) {
            logger.error("Error fetching lights:", error);
            throw new Error('Error fetching lights');
        }
    }

    public async updateStatus(lightUpdates: Record<number, number>, userId: Types.ObjectId): Promise<void> {
        try {
            for (const [id, state] of Object.entries(lightUpdates)) {
                const lightId = parseInt(id);
                const room = ROOM_MAPPING[lightId];

                if (!room) {
                    logger.warn(`Invalid lightId ${lightId} received`);
                    continue;
                }

                const updateData: any = {
                    state,
                    lastUpdatedBy: userId,
                    room
                };

                if (state === 1) {
                    updateData.turnedOnAt = new Date();
                } else {
                    updateData.turnedOffAt = new Date();
                }

                await LightModel.findOneAndUpdate(
                    { lightId },
                    { $set: updateData },
                    { upsert: true, new: true }
                );

                logger.info(`Light ${lightId} (${room}) updated to ${state === 1 ? 'ON' : 'OFF'} by user ${userId}`);
            }
        } catch (error) {
            logger.error("Error updating lights status:", error);
            throw new Error('Error updating lights status');
        }
    }
}

export default LightsService;
