import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import DocController from '../../lib/controllers/doc.controller';

describe('DocController (Integration)', () => {
  let app: express.Application;
  let docController: DocController;

  beforeEach(() => {
    app = express();
    docController = new DocController();
    app.use(docController.router);
  });

  it('should return 200 OK and render HTML with swagger-ui', async () => {
    const response = await request(app).get('/api/docs');

    expect(response.status).toBe(200);
    expect(response.header['content-type']).toMatch(/html/);
    expect(response.text).toContain('SolidHome API Documentation');
    expect(response.text).toContain('id="swagger-ui"');
  });
});
