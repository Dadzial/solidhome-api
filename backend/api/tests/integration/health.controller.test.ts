import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import HealthController from "../../lib/controllers/health.controller";

describe('HealthController', () => {
    let app: express.Application;
    let healthController: HealthController

    beforeEach(() => {
        app = express();
        healthController = new HealthController();
        app.use('/health', healthController.router);
    });

    it('should return 200 OK with status "ok"', async () => {
        const response = await request(app).get('/health');
        expect(response.body).toEqual({
            status: 'ok',
            message: 'SolidHome API is running'
        });
    });
});