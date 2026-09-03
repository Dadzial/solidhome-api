import LightModel from '../schemas/lights.schema';
import { ILight } from '../models/lights.model';
import { Types } from 'mongoose';
import logger from '../../utils/logger';
import LightsHistoryService from "./lights-history.service";

export const DEFAULT_LIGHTS = [
    { name: 'living_room', appLabel: 'Salon' },
    { name: 'kitchen', appLabel: 'Kuchnia' },
    { name: 'boiler_room', appLabel: 'Kotłownia' },
    { name: 'bathroom', appLabel: 'Łazienka' },
    { name: 'hallway', appLabel: 'Korytarz' },
    { name: 'garage', appLabel: 'Garaż' },
]

class LightsService {

    constructor(private  lightsHistoryService: LightsHistoryService) {
        this.initDefaultLights();
    }

    private async initDefaultLights() {
        try {
            for (const room of DEFAULT_LIGHTS) {
                await LightModel.updateOne(
                    { name : room.name},
                    { $setOnInsert: { name: room.name, appLabel: room.appLabel, state: 0 } },
                    { upsert: true }
                );
            }
        } catch (error) {
            logger.error('Error initializing default lights:', error);
        }
    }

    public async getLightsForHardware(): Promise<Record<string, number>> {
        const lights = await LightModel.find({}, 'name state').lean();

        const statusMap: Record<string, number> = {};
        for (const light of lights) {
            statusMap[light.name] = light.state;
        }

        return statusMap;
    }

    public async getLightsForApps(): Promise<ILight[]> {
        return await LightModel.find().lean();
    }

    public async updateLightState(name: string, newState: number, userId?: Types.ObjectId): Promise<ILight> {
        const light = await LightModel.findOne({ name });
        if (!light) {
            throw new Error(`Lights width "${name}" not found`);
        }

        if (light.state !== newState) {
            light.state = newState;
            await light.save();

            await this.lightsHistoryService.addHistoryEntry(name, newState, userId);
        }
        return light;
    }
}

export default LightsService;
