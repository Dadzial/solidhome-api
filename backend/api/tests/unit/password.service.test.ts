import { describe, it, expect, beforeEach, vi } from 'vitest';
import PasswordService from '../../lib/modules/services/user/password.service';
import PasswordModel from '../../lib/modules/schemas/user/password.schema';
import { Types } from 'mongoose';
import bcrypt from 'bcrypt';

describe('PasswordService', () => {
    let service: PasswordService;
    const testUserId = new Types.ObjectId();
    const testPlainPassword = 'MySecretPassword123!';

    beforeEach(() => {
        service = new PasswordService();
    });

    describe('hashPassword', () => {
        it('should hash plain password using bcrypt', async () => {
            const hash = await service.hashPassword(testPlainPassword);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(testPlainPassword);
            const isValid = await bcrypt.compare(testPlainPassword, hash);
            expect(isValid).toBe(true);
        });

        it('should throw Error when bcrypt hashing fails', async () => {
            vi.spyOn(bcrypt, 'hash').mockImplementationOnce(() => {
                throw new Error('Bcrypt hashing error');
            });

            await expect(service.hashPassword(testPlainPassword)).rejects.toThrow('Failed to hash password');
        });
    });

    describe('createOrUpdate', () => {
        it('should create new password record if user has none', async () => {
            await service.createOrUpdate({ userId: testUserId, password: testPlainPassword });

            const record = await PasswordModel.findOne({ userId: testUserId as any });
            expect(record).not.toBeNull();
            const isMatch = await bcrypt.compare(testPlainPassword, record!.password);
            expect(isMatch).toBe(true);
        });

        it('should update existing password record with new hashed password', async () => {
            await service.createOrUpdate({ userId: testUserId, password: testPlainPassword });

            const newPassword = 'NewlyUpdatedPassword456!';
            await service.createOrUpdate({ userId: testUserId, password: newPassword });

            const records = await PasswordModel.find({ userId: testUserId as any });
            expect(records.length).toBe(1);

            const isOldMatch = await bcrypt.compare(testPlainPassword, records[0].password);
            expect(isOldMatch).toBe(false);

            const isNewMatch = await bcrypt.compare(newPassword, records[0].password);
            expect(isNewMatch).toBe(true);
        });

        it('should throw Error when database operation fails', async () => {
            vi.spyOn(PasswordModel, 'findOne').mockRejectedValueOnce(new Error('DB failure'));

            await expect(
                service.createOrUpdate({ userId: testUserId, password: testPlainPassword })
            ).rejects.toThrow('Failed to save password');
        });
    });

    describe('authorize', () => {
        it('should return true when plain password matches stored hash', async () => {
            await service.createOrUpdate({ userId: testUserId, password: testPlainPassword });

            const isAuthorized = await service.authorize(testUserId, testPlainPassword);
            expect(isAuthorized).toBe(true);
        });

        it('should return false when plain password does not match stored hash', async () => {
            await service.createOrUpdate({ userId: testUserId, password: testPlainPassword });

            const isAuthorized = await service.authorize(testUserId, 'WrongPassword');
            expect(isAuthorized).toBe(false);
        });

        it('should return false when no password record exists for user', async () => {
            const nonExistentUserId = new Types.ObjectId();
            const isAuthorized = await service.authorize(nonExistentUserId, testPlainPassword);
            expect(isAuthorized).toBe(false);
        });

        it('should return false when database query throws an error', async () => {
            vi.spyOn(PasswordModel, 'findOne').mockRejectedValueOnce(new Error('DB query error'));

            const isAuthorized = await service.authorize(testUserId, testPlainPassword);
            expect(isAuthorized).toBe(false);
        });
    });
});
