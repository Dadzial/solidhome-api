import { describe, it, expect, beforeEach, vi } from 'vitest';
import UserService from '../../lib/modules/services/user/user.service';
import UserModel from '../../lib/modules/schemas/user/user.schema';
import { Types } from 'mongoose';

describe('UserService', () => {
    let service: UserService;

    beforeEach(() => {
        service = new UserService();
    });

    describe('create', () => {
        it('should create and return new user document', async () => {
            const user = await service.create({
                email: 'jan@example.com',
                userName: 'jankowalski'
            });

            expect(user).toBeDefined();
            expect(user.email).toBe('jan@example.com');
            expect(user.userName).toBe('jankowalski');
            expect(user._id).toBeDefined();

            const inDb = await UserModel.findById(user._id);
            expect(inDb).not.toBeNull();
        });

        it('should throw Error when creating user fails due to schema validation or db error', async () => {
            vi.spyOn(UserModel.prototype, 'save').mockRejectedValueOnce(new Error('Validation failed'));

            await expect(service.create({ email: 'bad_email' })).rejects.toThrow('Error creating data');
        });
    });

    describe('getById', () => {
        it('should return user document by valid ObjectId', async () => {
            const created = await service.create({
                email: 'anna@example.com',
                userName: 'annakowalska'
            });

            const found = await service.getById(created._id);
            expect(found).not.toBeNull();
            expect(found!.email).toBe('anna@example.com');
            expect(found!.userName).toBe('annakowalska');
        });

        it('should return null when user is not found by ID', async () => {
            const nonExistentId = new Types.ObjectId();
            const found = await service.getById(nonExistentId);
            expect(found).toBeNull();
        });

        it('should throw Error when database query throws', async () => {
            vi.spyOn(UserModel, 'findById').mockRejectedValueOnce(new Error('DB failure'));

            await expect(service.getById(new Types.ObjectId())).rejects.toThrow('Error downloading data');
        });
    });

    describe('getByEmailOrName', () => {
        it('should find user by exact email', async () => {
            const created = await service.create({
                email: 'tomek@example.com',
                userName: 'tomek123'
            });

            const found = await service.getByEmailOrName('tomek@example.com');
            expect(found).not.toBeNull();
            expect(found!._id.toString()).toBe(created._id.toString());
        });

        it('should find user by exact userName', async () => {
            const created = await service.create({
                email: 'piotr@example.com',
                userName: 'piotrek99'
            });

            const found = await service.getByEmailOrName('piotrek99');
            expect(found).not.toBeNull();
            expect(found!._id.toString()).toBe(created._id.toString());
        });

        it('should return null when neither email nor userName matches', async () => {
            const found = await service.getByEmailOrName('non_existent');
            expect(found).toBeNull();
        });

        it('should throw Error when query throws error', async () => {
            vi.spyOn(UserModel, 'findOne').mockRejectedValueOnce(new Error('Query error'));

            await expect(service.getByEmailOrName('any')).rejects.toThrow('Error downloading data');
        });
    });

    describe('update', () => {
        it('should update user fields and return updated user object', async () => {
            const created = await service.create({
                email: 'adam@example.com',
                userName: 'adam'
            });

            const updated = await service.update(created._id, {
                userName: 'adam_nowy'
            });

            expect(updated).not.toBeNull();
            expect(updated!.userName).toBe('adam_nowy');
            expect(updated!.email).toBe('adam@example.com');

            const inDb = await UserModel.findById(created._id);
            expect(inDb!.userName).toBe('adam_nowy');
        });

        it('should return null if user to update does not exist', async () => {
            const result = await service.update(new Types.ObjectId(), { userName: 'ghost' });
            expect(result).toBeNull();
        });

        it('should propagate error if findByIdAndUpdate fails', async () => {
            vi.spyOn(UserModel, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('Update error'));

            await expect(service.update(new Types.ObjectId(), { userName: 'err' })).rejects.toThrow('Update error');
        });
    });

    describe('isEmailOrNameTakenByOther', () => {
        it('should return false if neither email nor userName is provided', async () => {
            const result = await service.isEmailOrNameTakenByOther(new Types.ObjectId());
            expect(result).toBe(false);
        });

        it('should return true if email is already taken by another user', async () => {
            const user1 = await service.create({ email: 'occupied@example.com', userName: 'user1' });
            const user2Id = new Types.ObjectId();

            const isTaken = await service.isEmailOrNameTakenByOther(user2Id, 'occupied@example.com', 'user2');
            expect(isTaken).toBe(true);
        });

        it('should return true if userName is already taken by another user', async () => {
            const user1 = await service.create({ email: 'u1@example.com', userName: 'occupied_name' });
            const user2Id = new Types.ObjectId();

            const isTaken = await service.isEmailOrNameTakenByOther(user2Id, 'unique@example.com', 'occupied_name');
            expect(isTaken).toBe(true);
        });

        it('should return false if email and userName belong to the SAME user (no other user has them)', async () => {
            const user = await service.create({ email: 'myemail@example.com', userName: 'myname' });

            const isTaken = await service.isEmailOrNameTakenByOther(user._id, 'myemail@example.com', 'myname');
            expect(isTaken).toBe(false);
        });

        it('should return false if email and userName are completely unique in database', async () => {
            const isTaken = await service.isEmailOrNameTakenByOther(
                new Types.ObjectId(),
                'completely_new@example.com',
                'completely_new'
            );
            expect(isTaken).toBe(false);
        });
    });
});
