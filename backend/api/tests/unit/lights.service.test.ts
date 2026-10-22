import { describe, it, expect, beforeEach, vi } from 'vitest';
import LightsService, { DEFAULT_LIGHTS } from '../../lib/modules/services/lights/lights.service';
import LightModel from '../../lib/modules/schemas/lights/lights.schema';
import LightsHistoryService from '../../lib/modules/services/lights/lights-history.service';
import LightsEnergyService from '../../lib/modules/services/lights/lights-energy.service';
import { seedDefaultLights } from '../helpers/lights.helper';
import { Types } from 'mongoose';

describe('LightsService', () => {
    let service: LightsService;
    let mockHistoryService: LightsHistoryService;
    let mockEnergyService: LightsEnergyService;

    beforeEach(async () => {
        await seedDefaultLights();

        mockHistoryService = {
            addHistoryEntry: vi.fn().mockResolvedValue({}),
            getHistory: vi.fn(),
            resetHistory: vi.fn(),
        } as unknown as LightsHistoryService;

        mockEnergyService = {
            accumulateEnergyOnStateChange: vi.fn().mockResolvedValue(undefined),
        } as unknown as LightsEnergyService;

        service = new LightsService(mockHistoryService, mockEnergyService);
    });

    describe('initDefaultLights', () => {
        it('should ensure all default lights exist in database with state 0', async () => {
            await LightModel.deleteMany({});
            const s = new LightsService(mockHistoryService);
            // Czekamy chwilę na zakończenie asynchronicznej pętli initDefaultLights
            await new Promise((r) => setTimeout(r, 100));

            const lights = await LightModel.find();
            expect(lights.length).toBe(DEFAULT_LIGHTS.length);

            for (const name of DEFAULT_LIGHTS) {
                const found = lights.find((l) => l.name === name);
                expect(found).toBeDefined();
                expect(found!.state).toBe(0);
            }
        });

        it('should handle database error during initialization without throwing', async () => {
            vi.spyOn(LightModel, 'updateOne').mockRejectedValueOnce(new Error('Init lights failure'));

            const newService = new LightsService(mockHistoryService);
            expect(newService).toBeDefined();
        });
    });

    describe('sendLightsStatusToHardware', () => {
        it('should return record mapping room name to state integer', async () => {
            await LightModel.updateOne({ name: 'kitchen' }, { state: 1 });

            const hardwareMap = await service.sendLightsStatusToHardware();

            expect(hardwareMap.kitchen).toBe(1);
            expect(hardwareMap.living_room).toBe(0);
            expect(Object.keys(hardwareMap)).toEqual(expect.arrayContaining(DEFAULT_LIGHTS));
        });
    });

    describe('sendLightsStatusToApps', () => {
        it('should return full list of light objects for client applications', async () => {
            const lights = await service.sendLightsStatusToApps();

            expect(Array.isArray(lights)).toBe(true);
            expect(lights.length).toBe(DEFAULT_LIGHTS.length);
            expect(lights[0]).toHaveProperty('name');
            expect(lights[0]).toHaveProperty('state');
        });
    });

    describe('updateLightState', () => {
        it('should update light state, save to db, and call history and energy services when state changes', async () => {
            const userId = new Types.ObjectId();
            const updated = await service.updateLightState('living_room', 1, userId);

            expect(updated.state).toBe(1);

            const inDb = await LightModel.findOne({ name: 'living_room' });
            expect(inDb!.state).toBe(1);

            expect(mockHistoryService.addHistoryEntry).toHaveBeenCalledWith('living_room', 1, userId);
            expect(mockEnergyService.accumulateEnergyOnStateChange).toHaveBeenCalledWith('living_room', 1);
        });

        it('should NOT call history or energy services if light state is unchanged', async () => {
            const result = await service.updateLightState('living_room', 0);

            expect(result.state).toBe(0);
            expect(mockHistoryService.addHistoryEntry).not.toHaveBeenCalled();
            expect(mockEnergyService.accumulateEnergyOnStateChange).not.toHaveBeenCalled();
        });

        it('should work properly when energyService is omitted in constructor', async () => {
            const serviceWithoutEnergy = new LightsService(mockHistoryService);
            const updated = await serviceWithoutEnergy.updateLightState('garage', 1);

            expect(updated.state).toBe(1);
            expect(mockHistoryService.addHistoryEntry).toHaveBeenCalledWith('garage', 1, undefined);
        });

        it('should throw Error when light name does not exist', async () => {
            await expect(service.updateLightState('swimming_pool', 1)).rejects.toThrow(
                'Light with "swimming_pool" not found'
            );
        });
    });
});
