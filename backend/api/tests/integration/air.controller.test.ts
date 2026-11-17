import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import AirController from '../../lib/controllers/air.controller';
import AirService from '../../lib/modules/services/air/air.service';
import { createTestUser, TestUserContext } from '../helpers/auth.helper';

describe('AirController (Integration)', () => {
  let app: express.Application;
  let airController: AirController;
  let mockAirService: Partial<AirService>;
  let testUserCtx: TestUserContext;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    testUserCtx = await createTestUser();

    mockAirService = {
      getCurrentAir: vi.fn(),
      getAirHistory: vi.fn(),
      clearHistory: vi.fn(),
    };

    airController = new AirController(mockAirService as AirService);
    app.use(airController.router);
  });

  describe('GET /api/air/current', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app).get('/api/air/current');
      expect(response.status).toBe(401);
    });

    it('should return 200 OK with current air data when authenticated', async () => {
      const sampleAir = {
        temperature: 23.4,
        humidity: 50.1,
        pressure: 1010.2,
        createdAt: new Date(),
      };
      (mockAirService.getCurrentAir as any).mockResolvedValueOnce(sampleAir);

      const response = await request(app)
        .get('/api/air/current')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(200);
      expect(response.body.temperature).toBe(23.4);
      expect(response.body.humidity).toBe(50.1);
      expect(response.body.pressure).toBe(1010.2);
    });

    it('should return 503 Service Unavailable when hardware board is offline', async () => {
      (mockAirService.getCurrentAir as any).mockRejectedValueOnce(new Error('hardware_offline'));

      const response = await request(app)
        .get('/api/air/current')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(503);
      expect(response.body.message).toBe('Hardware board is offline');
    });
  });

  describe('GET /api/air/history', () => {
    it('should return 200 OK with air history', async () => {
      const sampleHistory = [
        { temperature: 21, humidity: 45, pressure: 1000 },
        { temperature: 22, humidity: 46, pressure: 1002 },
      ];
      (mockAirService.getAirHistory as any).mockResolvedValueOnce(sampleHistory);

      const response = await request(app)
        .get('/api/air/history?limit=10')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(mockAirService.getAirHistory).toHaveBeenCalledWith(10);
    });

    it('should return 400 Bad Request for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/air/history?limit=-5')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/air/history/clear', () => {
    it('should return 200 OK with deleted count on clear history', async () => {
      (mockAirService.clearHistory as any).mockResolvedValueOnce({
        acknowledged: true,
        deletedCount: 5,
      });

      const response = await request(app)
        .delete('/api/air/history/clear')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(5);
    });
  });
});
