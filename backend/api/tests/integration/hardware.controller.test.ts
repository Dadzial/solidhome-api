import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import HardwareController from '../../lib/controllers/hardware.controller';
import HardwareStatusService from '../../lib/modules/services/hardware/hardware-status.service';

describe('HardwareController (Integration)', () => {
  let app: express.Application;
  let hardwareController: HardwareController;
  let hardwareStatusServiceMock: Partial<HardwareStatusService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    hardwareStatusServiceMock = {
      isBoardOnline: false,
    };

    hardwareController = new HardwareController(hardwareStatusServiceMock as HardwareStatusService);
    app.use(hardwareController.router);
  });

  it('should return 200 OK with online: false when board is offline', async () => {
    const response = await request(app).get('/api/hardware/status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ online: false });
  });

  it('should return 200 OK with online: true when board is online', async () => {
    Object.defineProperty(hardwareStatusServiceMock, 'isBoardOnline', {
      get: () => true,
    });

    const response = await request(app).get('/api/hardware/status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ online: true });
  });
});
