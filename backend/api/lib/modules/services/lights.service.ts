import LightModel from '../schemas/lights.schema';
import { ILight } from '../models/lights.model';
import { Types } from 'mongoose';
import logger from '../../utils/logger';

export const ROOM_MAPPING: Record<number, string> = {
    1: 'Living Room',
    2: 'Kitchen',
    3: 'Bedroom',
    4: 'Bathroom',
    5: 'Hallway',
};

class LightsService {

    constructor() {
        this.create().catch(err => logger.error("Background light initialization failed", err));
    }

    public async getAll(): Promise<ILight[]> {
        try {
            return await LightModel.find().lean();
        } catch (error) {
            logger.error("Error fetching lights:", error);
            throw new Error('Error fetching lights');
        }
    }

    public async updateStatus(lightUpdates: Record<number, number>, userId?: Types.ObjectId | null): Promise<void> {
        try {
            for (const [id, state] of Object.entries(lightUpdates)) {
                const lightId = parseInt(id);
                const room = ROOM_MAPPING[lightId];

                if (!room) continue;

                const updateData: any = {
                    state
                };
                if (userId) {
                    updateData.lastUpdatedBy = userId as any;
                }

                if (state === 1) {
                    updateData.turnedOnAt = new Date();
                } else {
                    updateData.turnedOffAt = new Date();
                }

                await LightModel.updateOne({ room }, { $set: updateData });
                logger.info(`Light in ${room} updated to ${state === 1 ? 'ON' : 'OFF'} by ${userId ? 'user ' + userId : 'board'}`);
            }
        } catch (error) {
            logger.error("Error updating lights status:", error);
            throw new Error('Error updating lights status');
        }
    }

    public async create(): Promise<void> {
        try {
            const count = await LightModel.countDocuments();
            if (count === 0) {
                const initialLights = Object.values(ROOM_MAPPING).map(room => ({
                    room,
                    state: 0
                }));
                await LightModel.insertMany(initialLights);
                logger.info("Initial lights created at startup");
            }
        } catch (error) {
            logger.error("Error creating initial lights:", error);
        }
    }
}

export default LightsService;
