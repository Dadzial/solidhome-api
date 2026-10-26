import { describe, it, expect, beforeEach, vi } from 'vitest';
import LightsEnergyService from '../../lib/modules/services/lights/lights-energy.service';
import LightEnergyModel from '../../lib/modules/schemas/lights/lights-energy.schema';
import LightModel from '../../lib/modules/schemas/lights/lights.schema';
import { seedDefaultLights } from '../helpers/lights.helper';

describe('LightsEnergyService', () => {
    let service: LightsEnergyService;

    beforeEach(async () => {
        await seedDefaultLights();
        await LightEnergyModel.deleteMany({});
        service = new LightsEnergyService();
    });

    describe('getEnergyStats', () => {
        it('should return initial live energy stats for today for entireHouse', async () => {
            const stats = await service.getEnergyStats('today', 'entireHouse');

            expect(stats).toBeDefined();
            expect(stats.name).toBe('entireHouse');
            expect(stats.timeframe).toBe('today');
            expect(stats.totalKwh).toBeGreaterThanOrEqual(0);
            expect(stats.totalHouseKwh).toBeGreaterThanOrEqual(0);
            expect(stats.categories.length).toBe(20);
            expect(stats.chartData.length).toBe(20);
            expect(stats.topRooms.length).toBe(3);
        });

        it('should return room-specific chart data when roomName is specified', async () => {
            const stats = await service.getEnergyStats('today', 'kitchen');

            expect(stats).toBeDefined();
            expect(stats.name).toBe('kitchen');
            expect(stats.chartData.length).toBe(20);
            expect(stats.categories.length).toBe(20);
        });

        it('should return week stats with Polish weekday labels', async () => {
            const stats = await service.getEnergyStats('week', 'entireHouse');

            expect(stats).toBeDefined();
            expect(stats.timeframe).toBe('week');
            expect(stats.categories.length).toBeGreaterThanOrEqual(1);
            expect(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']).toContain(stats.categories[0]);
        });

        it('should return month stats with week labels', async () => {
            const stats = await service.getEnergyStats('month', 'entireHouse');

            expect(stats).toBeDefined();
            expect(stats.timeframe).toBe('month');
            expect(stats.categories[0]).toContain('Tydz');
        });

        it('should reflect active light in chartData when light is turned on', async () => {
            await LightModel.updateOne({ name: 'living_room' }, { state: 1 });

            const stats = await service.getEnergyStats('today', 'entireHouse');
            // living_room is 60W = 0.06 kW
            expect(stats.chartData[stats.chartData.length - 1]).toBe(0.06);
        });
    });

    describe('accumulateEnergyOnStateChange', () => {
        it('should record energy burst and update live chart point when turning light ON (state=1)', async () => {
            await service.accumulateEnergyOnStateChange('living_room', 1);

            const stats = await service.getEnergyStats('today', 'entireHouse');
            expect(stats.lightsKwh['living_room']).toBeGreaterThan(0);

            const dayRecord = await LightEnergyModel.findOne();
            expect(dayRecord).not.toBeNull();
            expect(dayRecord!.topRooms.some((r) => r.name === 'living_room')).toBe(true);
        });

        it('should calculate session kWh and drop active point when turning light OFF (state=0)', async () => {
            // Turn on
            await service.accumulateEnergyOnStateChange('kitchen', 1);

            // Turn off
            await service.accumulateEnergyOnStateChange('kitchen', 0);

            const stats = await service.getEnergyStats('today', 'entireHouse');
            expect(stats.lightsKwh['kitchen']).toBeGreaterThan(0);
        });

        it('should catch and log errors gracefully without throwing', async () => {
            vi.spyOn(LightEnergyModel, 'findOne').mockRejectedValueOnce(new Error('Energy DB error'));

            await expect(service.accumulateEnergyOnStateChange('garage', 1)).resolves.not.toThrow();
        });
    });

    describe('resetEnergyStats', () => {
        it('should delete all energy records and reset turnedOnTimestamps', async () => {
            await service.accumulateEnergyOnStateChange('kitchen', 1);
            const beforeReset = await LightEnergyModel.countDocuments();
            expect(beforeReset).toBeGreaterThan(0);

            const result = await service.resetEnergyStats();
            expect(result.acknowledged).toBe(true);
            expect(result.deletedCount).toBeGreaterThan(0);

            const afterReset = await LightEnergyModel.countDocuments();
            expect(afterReset).toBe(0);
        });

        it('should throw an error when database delete fails', async () => {
            vi.spyOn(LightEnergyModel, 'deleteMany').mockRejectedValueOnce(new Error('Delete error'));

            await expect(service.resetEnergyStats()).rejects.toThrow('Error resetting lights energy stats');
        });
    });
});
