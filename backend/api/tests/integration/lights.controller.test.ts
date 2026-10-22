import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import LightsController from '../../lib/controllers/lights.controller';
import LightsService, { DEFAULT_LIGHTS } from '../../lib/modules/services/lights/lights.service';
import LightsHistoryService from '../../lib/modules/services/lights/lights-history.service';
import LightsEnergyService from '../../lib/modules/services/lights/lights-energy.service';
import LightsScheduleService from '../../lib/modules/services/lights/lights-schedule.service';
import { createTestUser } from '../helpers/auth.helper';
import { seedDefaultLights } from '../helpers/lights.helper';
import LightModel from '../../lib/modules/schemas/lights/lights.schema';
import LightScheduleModel from '../../lib/modules/schemas/lights/lights-schedule.schema';
import { Types } from 'mongoose';

describe('LightsController (Integration)', () => {
    let app: express.Application;
    let lightsService: LightsService;
    let lightsHistoryService: LightsHistoryService;
    let lightsEnergyService: LightsEnergyService;
    let lightsScheduleService: LightsScheduleService;
    let lightsController: LightsController;
    let authToken: string;

    beforeEach(async () => {
        await seedDefaultLights();

        app = express();
        app.use(express.json());

        lightsHistoryService = new LightsHistoryService();
        lightsEnergyService = new LightsEnergyService();
        lightsScheduleService = new LightsScheduleService();
        lightsService = new LightsService(lightsHistoryService, lightsEnergyService);

        lightsController = new LightsController(
            lightsService,
            lightsHistoryService,
            lightsEnergyService,
            lightsScheduleService
        );

        app.use('/', lightsController.router);

        const testUser = await createTestUser();
        authToken = testUser.token;
    });

    describe('GET /api/lights/status/hardware', () => {
        it('should return 200 and flat dictionary of light states for embedded hardware without authentication', async () => {
            const res = await request(app).get('/api/lights/status/hardware');

            expect(res.status).toBe(200);
            expect(typeof res.body).toBe('object');
            expect(res.body.living_room).toBe(0);
            expect(Object.keys(res.body)).toEqual(expect.arrayContaining(DEFAULT_LIGHTS));
        });
    });

    describe('GET /api/lights/status/app', () => {
        it('should return 200 and list of light objects for authenticated client application', async () => {
            const res = await request(app)
                .get('/api/lights/status/app')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(DEFAULT_LIGHTS.length);
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('state');
        });

        it('should return 401 Unauthorized when request lacks token', async () => {
            const res = await request(app).get('/api/lights/status/app');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/lights/update', () => {
        it('should update light state and return updated light object', async () => {
            const res = await request(app)
                .post('/api/lights/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'living_room',
                    state: 1
                });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('living_room');
            expect(res.body.state).toBe(1);

            const inDb = await LightModel.findOne({ name: 'living_room' });
            expect(inDb!.state).toBe(1);
        });

        it('should return 400 when body fails validation (missing name or invalid state)', async () => {
            const res = await request(app)
                .post('/api/lights/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'living_room',
                    state: 5 // valid states are 0 or 1
                });

            expect(res.status).toBe(400);
        });

        it('should return 400 when light name does not exist', async () => {
            const res = await request(app)
                .post('/api/lights/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'non_existent_room',
                    state: 1
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/lights/history', () => {
        it('should return light history logs for authenticated user', async () => {
            // Trigger a state change to generate history
            await request(app)
                .post('/api/lights/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'kitchen', state: 1 });

            const res = await request(app)
                .get('/api/lights/history')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            expect(res.body[0].name).toBe('kitchen');
        });
    });

    describe('DELETE /api/lights/history/reset', () => {
        it('should reset light history logs', async () => {
            await request(app)
                .post('/api/lights/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'bathroom', state: 1 });

            const res = await request(app)
                .delete('/api/lights/history/reset')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('History reset successfully');

            const check = await request(app)
                .get('/api/lights/history')
                .set('Authorization', `Bearer ${authToken}`);
            expect(check.body.length).toBe(0);
        });
    });

    describe('GET /api/lights/energy', () => {
        it('should return energy consumption statistics for authenticated user', async () => {
            const res = await request(app)
                .get('/api/lights/energy?timeframe=today&room=entireHouse')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalKwh');
            expect(res.body).toHaveProperty('chartData');
            expect(res.body).toHaveProperty('categories');
            expect(res.body).toHaveProperty('topRooms');
        });

        it('should return 400 for invalid timeframe query param', async () => {
            const res = await request(app)
                .get('/api/lights/energy?timeframe=invalid_period')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(400);
        });
    });

    describe('Schedule Rules CRUD (/api/lights/rules)', () => {
        it('should create new rule on POST /api/lights/rules', async () => {
            const res = await request(app)
                .post('/api/lights/rules')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Nocne gaszenie',
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: '23:00',
                    endTime: '06:00',
                    rooms: ['kitchen', 'living_room']
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.name).toBe('Nocne gaszenie');
            expect(res.body.active).toBe(true);
        });

        it('should return 400 when creating rule with missing fields', async () => {
            const res = await request(app)
                .post('/api/lights/rules')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Brak danych'
                });

            expect(res.status).toBe(400);
        });

        it('should list all rules on GET /api/lights/rules', async () => {
            await lightsScheduleService.createRule({
                name: 'Regula A',
                days: [1],
                startTime: '10:00',
                endTime: '11:00',
                rooms: ['garage']
            });

            const res = await request(app)
                .get('/api/lights/rules')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        it('should toggle rule active state on PUT /api/lights/rules/:id', async () => {
            const rule = await lightsScheduleService.createRule({
                name: 'Do przelaczenia',
                days: [1],
                startTime: '10:00',
                endTime: '11:00',
                rooms: ['garage']
            });

            const res = await request(app)
                .put(`/api/lights/rules/${rule._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ active: false });

            expect(res.status).toBe(200);
            expect(res.body.active).toBe(false);
        });

        it('should return 404 on PUT /api/lights/rules/:id when rule not found', async () => {
            const nonExistentId = new Types.ObjectId();
            const res = await request(app)
                .put(`/api/lights/rules/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ active: false });

            expect(res.status).toBe(404);
        });

        it('should return 400 on PUT /api/lights/rules/:id for invalid ID format', async () => {
            const res = await request(app)
                .put('/api/lights/rules/not_an_id')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(400);
        });

        it('should delete rule on DELETE /api/lights/rules/:id', async () => {
            const rule = await lightsScheduleService.createRule({
                name: 'Do usuniecia',
                days: [1],
                startTime: '10:00',
                endTime: '11:00',
                rooms: ['garage']
            });

            const res = await request(app)
                .delete(`/api/lights/rules/${rule._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Schedule rule deleted successfully');

            const inDb = await LightScheduleModel.findById(rule._id);
            expect(inDb).toBeNull();
        });

        it('should return 404 on DELETE /api/lights/rules/:id when rule not found', async () => {
            const nonExistentId = new Types.ObjectId();
            const res = await request(app)
                .delete(`/api/lights/rules/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });

        it('should return 400 on DELETE /api/lights/rules/:id for invalid ID format', async () => {
            const res = await request(app)
                .delete('/api/lights/rules/not_an_id')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(400);
        });
    });
});
