import { describe, it, expect, beforeEach, vi } from 'vitest';
import TokenService from '../../lib/modules/services/user/token.service';
import TokenModel from '../../lib/modules/schemas/user/token.schema';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../../lib/config';

describe('TokenService', () => {
    let service: TokenService;
    const testUserId = new Types.ObjectId();
    const testEmail = 'test@example.com';
    const testUserName = 'tester';

    beforeEach(() => {
        service = new TokenService();
    });

    describe('create', () => {
        it('should create and persist authorization token for 1 hour when rememberMe is false', async () => {
            const tokenDoc = await service.create(testUserId, testEmail, testUserName, false);

            expect(tokenDoc).toBeDefined();
            expect(tokenDoc.userId.toString()).toBe(testUserId.toString());
            expect(tokenDoc.type).toBe('authorization');
            expect(typeof tokenDoc.value).toBe('string');

            const decoded = jwt.verify(tokenDoc.value, config.jwtSecret) as any;
            expect(decoded.userId).toBe(testUserId.toString());
            expect(decoded.email).toBe(testEmail);
            expect(decoded.userName).toBe(testUserName);

            const inDb = await TokenModel.findOne({ value: tokenDoc.value });
            expect(inDb).not.toBeNull();
        });

        it('should create token with 30 days expiration when rememberMe is true', async () => {
            const tokenDoc = await service.create(testUserId, testEmail, testUserName, true);

            const decoded = jwt.verify(tokenDoc.value, config.jwtSecret) as any;
            const diffSeconds = decoded.exp - decoded.iat;
            // 30 days = 30 * 24 * 60 * 60 = 2592000 seconds
            expect(diffSeconds).toBe(2592000);
        });

        it('should throw Error when database saving fails', async () => {
            vi.spyOn(TokenModel.prototype, 'save').mockRejectedValueOnce(new Error('DB failure'));

            await expect(service.create(testUserId, testEmail, testUserName)).rejects.toThrow('Error creating data');
        });
    });

    describe('getToken', () => {
        it('should return object with token value property', () => {
            const result = service.getToken({ value: 'sample_jwt_token' });
            expect(result).toEqual({ token: 'sample_jwt_token' });
        });
    });

    describe('remove', () => {
        it('should delete existing token by value', async () => {
            const tokenDoc = await service.create(testUserId, testEmail, testUserName);
            const removeResult = await service.remove(tokenDoc.value);

            expect(removeResult.deletedCount).toBe(1);
            const inDb = await TokenModel.findOne({ value: tokenDoc.value });
            expect(inDb).toBeNull();
        });

        it('should throw Error when token does not exist in database', async () => {
            await expect(service.remove('non_existent_token_value')).rejects.toThrow('Error while removing token');
        });

        it('should throw Error when database delete fails', async () => {
            vi.spyOn(TokenModel, 'deleteOne').mockRejectedValueOnce(new Error('DB delete failure'));

            await expect(service.remove('any_token')).rejects.toThrow('Error while removing token');
        });
    });
});
