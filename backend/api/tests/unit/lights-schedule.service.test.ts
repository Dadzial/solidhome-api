import { describe, it, expect, beforeEach, vi } from 'vitest';
import LightsScheduleService from '../../lib/modules/services/lights/lights-schedule.service';
import LightScheduleModel from '../../lib/modules/schemas/lights/lights-schedule.schema';
import { Types } from 'mongoose';

describe('LightsScheduleService', () => {
    let service: LightsScheduleService;
    const testUserId = new Types.ObjectId();

    beforeEach(() => {
        service = new LightsScheduleService();
    });

    describe('createRule', () => {
        it('should create a schedule rule with specified rooms and active=true', async () => {
            const rule = await service.createRule({
                name: 'Wieczorny relaks',
                days: [1, 2, 3, 4, 5],
                startTime: '20:00',
                endTime: '22:30',
                rooms: ['living_room', 'kitchen'],
                userId: testUserId
            });

            expect(rule).toBeDefined();
            expect(rule.name).toBe('Wieczorny relaks');
            expect(rule.days).toEqual([1, 2, 3, 4, 5]);
            expect(rule.startTime).toBe('20:00');
            expect(rule.endTime).toBe('22:30');
            expect(rule.rooms).toEqual(['living_room', 'kitchen']);
            expect(rule.active).toBe(true);
            expect(rule.userId?.toString()).toBe(testUserId.toString());

            const inDb = await LightScheduleModel.findById(rule._id);
            expect(inDb).not.toBeNull();
        });

        it('should default rooms to ["entireHouse"] when empty array or no rooms provided', async () => {
            const rule = await service.createRule({
                name: 'Caly Dom',
                days: [0, 6],
                startTime: '08:00',
                endTime: '10:00',
                rooms: []
            });

            expect(rule.rooms).toEqual(['entireHouse']);
        });

        it('should throw error when database create fails', async () => {
            vi.spyOn(LightScheduleModel, 'create').mockRejectedValueOnce(new Error('Rule creation failed'));

            await expect(
                service.createRule({
                    name: 'Test Error',
                    days: [1],
                    startTime: '10:00',
                    endTime: '11:00',
                    rooms: ['kitchen']
                })
            ).rejects.toThrow('Rule creation failed');
        });
    });

    describe('getRules', () => {
        it('should return rules sorted by createdAt descending', async () => {
            await service.createRule({
                name: 'Regula 1',
                days: [1],
                startTime: '07:00',
                endTime: '08:00',
                rooms: ['kitchen']
            });
            await new Promise((r) => setTimeout(r, 10));
            await service.createRule({
                name: 'Regula 2',
                days: [2],
                startTime: '09:00',
                endTime: '10:00',
                rooms: ['garage']
            });

            const rules = await service.getRules();
            expect(rules.length).toBe(2);
            expect(rules[0].name).toBe('Regula 2');
            expect(rules[1].name).toBe('Regula 1');
        });

        it('should throw error when query fails', async () => {
            vi.spyOn(LightScheduleModel, 'find').mockImplementationOnce(() => {
                throw new Error('Find rules error');
            });

            await expect(service.getRules()).rejects.toThrow('Find rules error');
        });
    });

    describe('toggleRule', () => {
        it('should toggle active boolean to opposite when explicit value is not passed', async () => {
            const rule = await service.createRule({
                name: 'Do przelaczenia',
                days: [1],
                startTime: '12:00',
                endTime: '13:00',
                rooms: ['hallway']
            });
            expect(rule.active).toBe(true);

            const toggledOff = await service.toggleRule(rule._id.toString());
            expect(toggledOff).not.toBeNull();
            expect(toggledOff!.active).toBe(false);

            const toggledOn = await service.toggleRule(rule._id.toString());
            expect(toggledOn!.active).toBe(true);
        });

        it('should set active to explicit boolean value when provided', async () => {
            const rule = await service.createRule({
                name: 'Explicit',
                days: [1],
                startTime: '12:00',
                endTime: '13:00',
                rooms: ['hallway']
            });

            const updated = await service.toggleRule(rule._id.toString(), false);
            expect(updated!.active).toBe(false);

            const againFalse = await service.toggleRule(rule._id.toString(), false);
            expect(againFalse!.active).toBe(false);
        });

        it('should return null when ID is invalid ObjectId', async () => {
            const result = await service.toggleRule('invalid_id');
            expect(result).toBeNull();
        });

        it('should return null when rule is not found', async () => {
            const result = await service.toggleRule(new Types.ObjectId().toString());
            expect(result).toBeNull();
        });

        it('should propagate error when database save fails', async () => {
            const rule = await service.createRule({
                name: 'Test save error',
                days: [1],
                startTime: '12:00',
                endTime: '13:00',
                rooms: ['hallway']
            });

            vi.spyOn(LightScheduleModel.prototype, 'save').mockRejectedValueOnce(new Error('Save error'));

            await expect(service.toggleRule(rule._id.toString())).rejects.toThrow('Save error');
        });
    });

    describe('deleteRule', () => {
        it('should delete rule by valid ID and return true', async () => {
            const rule = await service.createRule({
                name: 'Do usuniecia',
                days: [1],
                startTime: '12:00',
                endTime: '13:00',
                rooms: ['hallway']
            });

            const deleted = await service.deleteRule(rule._id.toString());
            expect(deleted).toBe(true);

            const inDb = await LightScheduleModel.findById(rule._id);
            expect(inDb).toBeNull();
        });

        it('should return false when ID is invalid', async () => {
            const deleted = await service.deleteRule('not_an_object_id');
            expect(deleted).toBe(false);
        });

        it('should return false when rule does not exist', async () => {
            const deleted = await service.deleteRule(new Types.ObjectId().toString());
            expect(deleted).toBe(false);
        });

        it('should propagate error when delete fails', async () => {
            vi.spyOn(LightScheduleModel, 'deleteOne').mockRejectedValueOnce(new Error('Delete rule error'));

            await expect(service.deleteRule(new Types.ObjectId().toString())).rejects.toThrow('Delete rule error');
        });
    });
});
