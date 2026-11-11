import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import LightsController from '../../lib/controllers/lights.controller';
import LightsControlService, { DEFAULT_LIGHTS } from '../../lib/modules/services/lights/lights-control.service';
import LightsHistoryService from '../../lib/modules/services/lights/lights-history.service';
import LightsEnergyService from '../../lib/modules/services/lights/lights-energy.service';
import LightsScheduleService from '../../lib/modules/services/lights/lights-schedule.service';
import LightsScenesService from '../../lib/modules/services/lights/lights-scenes.service';
import { createTestUser } from '../helpers/auth.helper';
import { seedDefaultLights } from '../helpers/lights.helper';
import LightModel from '../../lib/modules/schemas/lights/lights.schema';
import LightScheduleModel from '../../lib/modules/schemas/lights/lights-schedule.schema';
import LightSceneModel from '../../lib/modules/schemas/lights/lights-scene.schema';
import { Types } from 'mongoose';

describe('LightsController (Integration)', () => {
  let app: express.Application;
  let lightsService: LightsControlService;
  let lightsHistoryService: LightsHistoryService;
  let lightsEnergyService: LightsEnergyService;
  let lightsScheduleService: LightsScheduleService;
  let lightsScenesService: LightsScenesService;
  let lightsController: LightsController;
  let authToken: string;

  beforeEach(async () => {
    await seedDefaultLights();

    app = express();
    app.use(express.json());

    lightsHistoryService = new LightsHistoryService();
    lightsEnergyService = new LightsEnergyService();
    lightsScheduleService = new LightsScheduleService();
    lightsScenesService = new LightsScenesService();
    lightsService = new LightsControlService(lightsHistoryService, lightsEnergyService);

    lightsController = new LightsController(
      lightsService,
      lightsHistoryService,
      lightsEnergyService,
      lightsScheduleService,
      lightsScenesService,
    );

    app.use('/', lightsController.router);

    const testUser = await createTestUser();
    authToken = testUser.token;
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
          state: 1,
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
          state: 5, // valid states are 0 or 1
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when light name does not exist', async () => {
      const res = await request(app)
        .post('/api/lights/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'non_existent_room',
          state: 1,
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

  describe('DELETE /api/lights/energy/reset', () => {
    it('should reset light energy records and return 200', async () => {
      const res = await request(app)
        .delete('/api/lights/energy/reset')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Energy stats reset successfully');
      expect(res.body).toHaveProperty('deletedCount');
    });

    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).delete('/api/lights/energy/reset');

      expect(res.status).toBe(401);
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
          rooms: ['kitchen', 'living_room'],
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
          name: 'Brak danych',
        });

      expect(res.status).toBe(400);
    });

    it('should list all rules on GET /api/lights/rules', async () => {
      await lightsScheduleService.createRule({
        name: 'Regula A',
        days: [1],
        startTime: '10:00',
        endTime: '11:00',
        rooms: ['garage'],
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
        rooms: ['garage'],
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
        rooms: ['garage'],
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

  describe('Light Scenes CRUD (/api/lights/scenes)', () => {
    it('should create new scene on POST /api/lights/scenes', async () => {
      const res = await request(app)
        .post('/api/lights/scenes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Wieczor filmowy',
          icon: 'assets/icons/film.svg',
          rooms: ['living_room', 'kitchen'],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Wieczor filmowy');
      expect(res.body.icon).toBe('assets/icons/film.svg');
      expect(res.body.rooms).toEqual(['living_room', 'kitchen']);
      expect(res.body.active).toBe(false);
      expect(res.body._id).toBeDefined();
    });

    it('should return 400 when creating scene with missing name or icon', async () => {
      const res = await request(app)
        .post('/api/lights/scenes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rooms: ['living_room'],
        });

      expect(res.status).toBe(400);
    });

    it('should list all scenes on GET /api/lights/scenes', async () => {
      await lightsScenesService.createScene({
        name: 'Scena A',
        icon: 'assets/icons/heart.svg',
        rooms: ['bedroom'],
      });

      const res = await request(app)
        .get('/api/lights/scenes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should toggle scene active state on PUT /api/lights/scenes/:id', async () => {
      const scene = await lightsScenesService.createScene({
        name: 'Do przelaczenia',
        icon: 'assets/icons/film.svg',
        rooms: ['living_room'],
      });

      const res = await request(app)
        .put(`/api/lights/scenes/${scene._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ active: true });

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(true);
    });

    it('should return 404 on PUT /api/lights/scenes/:id when scene not found', async () => {
      const nonExistentId = new Types.ObjectId();
      const res = await request(app)
        .put(`/api/lights/scenes/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ active: true });

      expect(res.status).toBe(404);
    });

    it('should return 400 on PUT /api/lights/scenes/:id for invalid ID format', async () => {
      const res = await request(app)
        .put('/api/lights/scenes/not_an_id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it('should delete scene on DELETE /api/lights/scenes/:id', async () => {
      const scene = await lightsScenesService.createScene({
        name: 'Do usuniecia',
        icon: 'assets/icons/film.svg',
        rooms: ['garage'],
      });

      const res = await request(app)
        .delete(`/api/lights/scenes/${scene._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Light scene deleted successfully');

      const inDb = await LightSceneModel.findById(scene._id);
      expect(inDb).toBeNull();
    });

    it('should return 404 on DELETE /api/lights/scenes/:id when scene not found', async () => {
      const nonExistentId = new Types.ObjectId();
      const res = await request(app)
        .delete(`/api/lights/scenes/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 on DELETE /api/lights/scenes/:id for invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/lights/scenes/not_an_id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });
});
