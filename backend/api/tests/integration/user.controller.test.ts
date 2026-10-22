import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import UserController from '../../lib/controllers/user.controller';
import UserService from '../../lib/modules/services/user/user.service';
import TokenService from '../../lib/modules/services/user/token.service';
import PasswordService from '../../lib/modules/services/user/password.service';
import EmailService from '../../lib/modules/services/user/email.service';
import ResetCodeService from '../../lib/modules/services/user/reset-code.service';
import { createTestUser } from '../helpers/auth.helper';
import ResetCodeModel from '../../lib/modules/schemas/user/reset-code.schema';
import TokenModel from '../../lib/modules/schemas/user/token.schema';

describe('UserController (Integration)', () => {
    let app: express.Application;
    let userService: UserService;
    let tokenService: TokenService;
    let passwordService: PasswordService;
    let emailService: EmailService;
    let resetCodeService: ResetCodeService;
    let userController: UserController;

    beforeEach(() => {
        app = express();
        app.use(express.json());

        userService = new UserService();
        tokenService = new TokenService();
        passwordService = new PasswordService();
        emailService = new EmailService();
        resetCodeService = new ResetCodeService();

        vi.spyOn(emailService, 'sendPasswordResetCode').mockResolvedValue(undefined);

        userController = new UserController(
            userService,
            tokenService,
            passwordService,
            emailService,
            resetCodeService
        );

        app.use('/', userController.router);
    });

    describe('POST /api/user/create', () => {
        it('should register a new user and return the user document', async () => {
            const res = await request(app)
                .post('/api/user/create')
                .send({
                    userName: 'nowyUser123',
                    email: 'nowy@example.com',
                    password: 'SecurePassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.userName).toBe('nowyUser123');
            expect(res.body.email).toBe('nowy@example.com');
        });

        it('should return 400 when payload fails Joi validation (e.g. short password or invalid email)', async () => {
            const res = await request(app)
                .post('/api/user/create')
                .send({
                    userName: 'a', // too short
                    email: 'invalid-email',
                    password: '123' // too short
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('details');
        });

        it('should return 400 when user with email or username already exists', async () => {
            await createTestUser({ email: 'existing@example.com', userName: 'existingUser' });

            const res = await request(app)
                .post('/api/user/create')
                .send({
                    userName: 'existingUser',
                    email: 'different@example.com',
                    password: 'Password123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Bad request');
        });
    });

    describe('POST /api/user/auth', () => {
        it('should authenticate user with valid credentials and return token', async () => {
            await createTestUser({
                email: 'login@example.com',
                userName: 'loginUser',
                password: 'MyPassword123!'
            });

            const res = await request(app)
                .post('/api/user/auth')
                .send({
                    userName: 'loginUser',
                    password: 'MyPassword123!',
                    rememberMe: false
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should authenticate user using email instead of username', async () => {
            await createTestUser({
                email: 'loginemail@example.com',
                userName: 'loginEmailUser',
                password: 'MyPassword123!'
            });

            const res = await request(app)
                .post('/api/user/auth')
                .send({
                    userName: 'loginemail@example.com',
                    password: 'MyPassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 401 when user does not exist', async () => {
            const res = await request(app)
                .post('/api/user/auth')
                .send({
                    userName: 'ghostUser',
                    password: 'SomePassword123!'
                });

            expect(res.status).toBe(401);
        });

        it('should return 401 when password is wrong', async () => {
            await createTestUser({
                email: 'wrongpass@example.com',
                userName: 'wrongPassUser',
                password: 'CorrectPassword123!'
            });

            const res = await request(app)
                .post('/api/user/auth')
                .send({
                    userName: 'wrongPassUser',
                    password: 'WrongPassword999!'
                });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/user/reset/code', () => {
        it('should generate 6-digit verification code and dispatch email for existing user', async () => {
            await createTestUser({ email: 'recover@example.com' });

            const res = await request(app)
                .post('/api/user/reset/code')
                .send({ email: 'recover@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Verification code sent successfully');
            expect(emailService.sendPasswordResetCode).toHaveBeenCalledWith('recover@example.com', expect.any(String));

            const codeInDb = await ResetCodeModel.findOne();
            expect(codeInDb).not.toBeNull();
            expect(codeInDb!.code.length).toBe(6);
        });

        it('should return 200 neutral message for security when email is not found without dispatching email', async () => {
            const res = await request(app)
                .post('/api/user/reset/code')
                .send({ email: 'unknown@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('If a user with that email exists');
            expect(emailService.sendPasswordResetCode).not.toHaveBeenCalled();
        });
    });

    describe('POST /api/user/reset/password', () => {
        it('should reset password when valid 6-digit code is provided and delete code afterwards', async () => {
            const testUser = await createTestUser({ email: 'resetme@example.com' });
            await resetCodeService.create(testUser.user._id, '123456');

            const res = await request(app)
                .post('/api/user/reset/password')
                .send({
                    code: '123456',
                    password: 'BrandNewPassword123!'
                });

            expect(res.status).toBe(200);

            // Verify password was updated
            const isAuthorized = await passwordService.authorize(testUser.user._id, 'BrandNewPassword123!');
            expect(isAuthorized).toBe(true);

            // Code should be deleted
            const codeInDb = await ResetCodeModel.findOne({ code: '123456' });
            expect(codeInDb).toBeNull();
        });

        it('should return 400 when code is invalid or expired', async () => {
            const res = await request(app)
                .post('/api/user/reset/password')
                .send({
                    code: '999999',
                    password: 'BrandNewPassword123!'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/user/update', () => {
        it('should update authenticated user profile data', async () => {
            const testUser = await createTestUser();

            const res = await request(app)
                .post('/api/user/update')
                .set('Authorization', `Bearer ${testUser.token}`)
                .send({
                    userName: 'updatedName'
                });

            expect(res.status).toBe(200);
            expect(res.body.userName).toBe('updatedName');
        });

        it('should return 409 if requested username is already taken by another user', async () => {
            await createTestUser({ userName: 'otherPerson', email: 'other@example.com' });
            const testUser = await createTestUser({ userName: 'me', email: 'me@example.com' });

            const res = await request(app)
                .post('/api/user/update')
                .set('Authorization', `Bearer ${testUser.token}`)
                .send({
                    userName: 'otherPerson'
                });

            expect(res.status).toBe(409);
        });

        it('should return 401 when request is unauthenticated', async () => {
            const res = await request(app)
                .post('/api/user/update')
                .send({ userName: 'unauthorizedChange' });

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/user/logout', () => {
        it('should remove user session token on logout', async () => {
            const testUser = await createTestUser();

            const res = await request(app)
                .delete('/api/user/logout')
                .set('Authorization', `Bearer ${testUser.token}`);

            expect(res.status).toBe(200);

            const tokenInDb = await TokenModel.findOne({ value: testUser.token });
            expect(tokenInDb).toBeNull();
        });

        it('should return 401 when no token is provided for logout', async () => {
            const res = await request(app).delete('/api/user/logout');
            expect(res.status).toBe(401);
        });
    });
});
