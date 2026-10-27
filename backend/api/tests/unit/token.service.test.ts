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
        it('should create and persist access token (15m) and refresh token (24h) when rememberMe is false', async () => {
            const tokens = await service.create(testUserId, testEmail, testUserName, false);

            expect(tokens).toBeDefined();
            expect(typeof tokens.token).toBe('string');
            expect(typeof tokens.refreshToken).toBe('string');

            const decodedAccess = jwt.verify(tokens.token, config.jwtSecret) as any;
            expect(decodedAccess.userId).toBe(testUserId.toString());
            expect(decodedAccess.email).toBe(testEmail);
            expect(decodedAccess.userName).toBe(testUserName);
            expect(decodedAccess.access).toBe('auth');
            expect(decodedAccess.exp - decodedAccess.iat).toBe(900);
            const decodedRefresh = jwt.verify(tokens.refreshToken, config.jwtSecret) as any;
            expect(decodedRefresh.userId).toBe(testUserId.toString());
            expect(decodedRefresh.access).toBe('refresh');
            expect(decodedRefresh.exp - decodedRefresh.iat).toBe(86400);

            const inDbAccess = await TokenModel.findOne({ value: tokens.token, type: 'authorization' });
            expect(inDbAccess).not.toBeNull();
            expect(inDbAccess!.userId.toString()).toBe(testUserId.toString());

            const inDbRefresh = await TokenModel.findOne({ value: tokens.refreshToken, type: 'refresh' });
            expect(inDbRefresh).not.toBeNull();
            expect(inDbRefresh!.userId.toString()).toBe(testUserId.toString());
        });

        it('should create refresh token with 30 days expiration when rememberMe is true', async () => {
            const tokens = await service.create(testUserId, testEmail, testUserName, true);

            expect(tokens.refreshToken).toBeDefined();
            const decodedRefresh = jwt.verify(tokens.refreshToken, config.jwtSecret) as any;
            const diffSeconds = decodedRefresh.exp - decodedRefresh.iat;
            expect(diffSeconds).toBe(2592000);
        });

        it('should throw Error when database saving fails', async () => {
            vi.spyOn(TokenModel.prototype, 'save').mockRejectedValueOnce(new Error('DB failure'));

            await expect(service.create(testUserId, testEmail, testUserName)).rejects.toThrow('Error creating data');
        });
    });

    describe('refresh', () => {
        it('should generate a new access token using a valid refresh token', async () => {
            const created = await service.create(testUserId, testEmail, testUserName, false);
            const refreshResult = await service.refresh(created.refreshToken);

            expect(refreshResult).toBeDefined();
            expect(typeof refreshResult.token).toBe('string');
            expect(refreshResult.refreshToken).toBe(created.refreshToken);

            const decoded = jwt.verify(refreshResult.token, config.jwtSecret) as any;
            expect(decoded.userId).toBe(testUserId.toString());
            expect(decoded.access).toBe('auth');

            const newAccessInDb = await TokenModel.findOne({ value: refreshResult.token, type: 'authorization' });
            expect(newAccessInDb).not.toBeNull();
        });

        it('should throw Error when refresh token is not found in database', async () => {
            const invalidRefreshToken = jwt.sign(
                { userId: testUserId.toString(), access: 'refresh' },
                config.jwtSecret,
                { expiresIn: '1h' }
            );

            await expect(service.refresh(invalidRefreshToken)).rejects.toThrow('Error refreshing token');
        });

        it('should throw Error and delete token when refresh token has expired in database', async () => {
            const expiredDate = new Date(Date.now() - 1000);
            const validJwt = jwt.sign(
                { userId: testUserId.toString(), email: testEmail, userName: testUserName, access: 'refresh' },
                config.jwtSecret,
                { expiresIn: '1h' }
            );

            await TokenModel.create({
                userId: testUserId,
                type: 'refresh',
                value: validJwt,
                createDate: Date.now() - 5000,
                expireAt: expiredDate
            });

            await expect(service.refresh(validJwt)).rejects.toThrow('Error refreshing token');
            const inDb = await TokenModel.findOne({ value: validJwt });
            expect(inDb).toBeNull();
        });

        it('should throw Error when token access type is not refresh', async () => {
            const wrongTypeJwt = jwt.sign(
                { userId: testUserId.toString(), email: testEmail, userName: testUserName, access: 'auth' },
                config.jwtSecret,
                { expiresIn: '1h' }
            );

            await TokenModel.create({
                userId: testUserId,
                type: 'refresh',
                value: wrongTypeJwt,
                createDate: Date.now(),
                expireAt: new Date(Date.now() + 3600000)
            });

            await expect(service.refresh(wrongTypeJwt)).rejects.toThrow('Error refreshing token');
        });
    });

    describe('getToken', () => {
        it('should return object with token and refreshToken properties', () => {
            const result = service.getToken({ token: 'sample_jwt_token', refreshToken: 'sample_refresh_token' });
            expect(result).toEqual({ token: 'sample_jwt_token', refreshToken: 'sample_refresh_token' });
        });

        it('should return object with only token property when refreshToken is not provided', () => {
            const result = service.getToken({ token: 'sample_jwt_token' });
            expect(result).toEqual({ token: 'sample_jwt_token' });
        });
    });

    describe('remove', () => {
        it('should delete existing token by value', async () => {
            const tokens = await service.create(testUserId, testEmail, testUserName);
            const removeResult = await service.remove(tokens.token);

            expect(removeResult.deletedCount).toBe(1);
            const inDb = await TokenModel.findOne({ value: tokens.token });
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
