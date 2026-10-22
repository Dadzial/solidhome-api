import { describe, it, expect, beforeEach, vi } from 'vitest';
import ResetCodeService from '../../lib/modules/services/user/reset-code.service';
import ResetCodeModel from '../../lib/modules/schemas/user/reset-code.schema';
import { Types } from 'mongoose';

describe('ResetCodeService', () => {
    let service: ResetCodeService;
    const testUserId = new Types.ObjectId();
    const testCode = '123456';

    beforeEach(() => {
        service = new ResetCodeService();
    });

    describe('create', () => {
        it('should create new reset code and remove previous codes for the user', async () => {
            const oldCode = await service.create(testUserId, '999999');
            expect(oldCode.code).toBe('999999');

            const newCode = await service.create(testUserId, testCode);
            expect(newCode.code).toBe(testCode);
            expect(newCode.userId.toString()).toBe(testUserId.toString());

            const allUserCodes = await ResetCodeModel.find({ userId: testUserId as any });
            expect(allUserCodes.length).toBe(1);
            expect(allUserCodes[0].code).toBe(testCode);
        });

        it('should throw Error when database saving fails', async () => {
            vi.spyOn(ResetCodeModel.prototype, 'save').mockRejectedValueOnce(new Error('Save error'));

            await expect(service.create(testUserId, testCode)).rejects.toThrow('Error creating reset code');
        });
    });

    describe('getByCode', () => {
        it('should return reset code document when valid code exists', async () => {
            await service.create(testUserId, testCode);

            const found = await service.getByCode(testCode);
            expect(found).not.toBeNull();
            expect(found!.code).toBe(testCode);
            expect(found!.userId.toString()).toBe(testUserId.toString());
        });

        it('should return null when code does not exist', async () => {
            const found = await service.getByCode('000000');
            expect(found).toBeNull();
        });

        it('should throw Error when database query fails', async () => {
            vi.spyOn(ResetCodeModel, 'findOne').mockRejectedValueOnce(new Error('DB error'));

            await expect(service.getByCode(testCode)).rejects.toThrow('Error fetching reset code');
        });
    });

    describe('deleteCode', () => {
        it('should delete reset code by code document ID', async () => {
            const created = await service.create(testUserId, testCode);
            await service.deleteCode(created._id as any);

            const inDb = await ResetCodeModel.findById(created._id);
            expect(inDb).toBeNull();
        });

        it('should throw Error when database delete fails', async () => {
            vi.spyOn(ResetCodeModel, 'deleteOne').mockRejectedValueOnce(new Error('Delete error'));

            await expect(service.deleteCode(new Types.ObjectId())).rejects.toThrow('Error deleting reset code');
        });
    });
});
