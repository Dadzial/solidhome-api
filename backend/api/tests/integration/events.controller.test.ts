import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createSession } from 'better-sse';
import jwt from 'jsonwebtoken';
import EventsController from '../../lib/controllers/events.controller';
import SseService from '../../lib/modules/services/sse/sse.service';
import { createTestUser } from '../helpers/auth.helper';
import { config } from '../../lib/config';
import logger from '../../lib/utils/logger';

vi.mock('better-sse', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-sse')>();
  return {
    ...actual,
    createSession: vi.fn(),
  };
});

describe('EventsController (Integration)', () => {
  let app: express.Application;
  let sseService: SseService;
  let eventsController: EventsController;
  let authToken: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    sseService = new SseService();
    eventsController = new EventsController(sseService);
    app.use('/', eventsController.router);

    const testUser = await createTestUser();
    authToken = testUser.token;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 Unauthorized when request has no token', async () => {
      const res = await request(app).get('/api/events');

      expect(res.status).toBe(401);
      expect(res.text).toBe('Access denied. No token provided.');
      expect(createSession).not.toHaveBeenCalled();
    });

    it('should return 401 Unauthorized when request has invalid token string', async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.text).toBe('Invalid token.');
      expect(createSession).not.toHaveBeenCalled();
    });

    it('should return 401 Unauthorized when token signature is valid but token does not exist in DB', async () => {
      const orphanToken = jwt.sign(
        { userId: '507f1f77bcf86cd799439011', access: 'auth' },
        config.jwtSecret,
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${orphanToken}`);

      expect(res.status).toBe(401);
      expect(res.text).toBe('Invalid or expired token.');
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/events', () => {
    it('should establish SSE session and register it with SseService for authenticated user via Bearer header', async () => {
      const mockSession = {
        isConnected: true,
        on: vi.fn(),
        once: vi.fn(),
        push: vi.fn(),
      };

      vi.mocked(createSession).mockImplementation(async (_req: any, res: any) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.end();
        return mockSession as any;
      });

      const registerSpy = vi.spyOn(sseService, 'registerSession');

      const res = await request(app).get('/api/events').set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(createSession).toHaveBeenCalledTimes(1);
      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(registerSpy).toHaveBeenCalledWith(mockSession);
      expect(sseService.activeSessionsCount).toBe(1);
    });

    it('should authenticate and establish session via x-access-token header', async () => {
      const mockSession = {
        isConnected: true,
        on: vi.fn(),
        once: vi.fn(),
        push: vi.fn(),
      };

      vi.mocked(createSession).mockImplementation(async (_req: any, res: any) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.end();
        return mockSession as any;
      });

      const registerSpy = vi.spyOn(sseService, 'registerSession');

      const res = await request(app).get('/api/events').set('x-access-token', authToken);

      expect(res.status).toBe(200);
      expect(createSession).toHaveBeenCalledTimes(1);
      expect(registerSpy).toHaveBeenCalledWith(mockSession);
    });

    it('should return 500 when createSession fails before headers are sent', async () => {
      const sseError = new Error('Failed to create SSE connection');
      vi.mocked(createSession).mockRejectedValueOnce(sseError);
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

      const res = await request(app).get('/api/events').set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ message: 'Failed to establish SSE stream' });
      expect(loggerSpy).toHaveBeenCalledWith('Error creating SSE session:', sseError);
      expect(sseService.activeSessionsCount).toBe(0);
    });

    it('should catch error and avoid double response if headers were already sent', async () => {
      const lateError = new Error('Stream broken after headers');
      vi.mocked(createSession).mockImplementationOnce(async (_req: any, res: any) => {
        res.writeHead(200);
        res.end();
        throw lateError;
      });

      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

      const res = await request(app).get('/api/events').set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(loggerSpy).toHaveBeenCalledWith('Error creating SSE session:', lateError);
      expect(sseService.activeSessionsCount).toBe(0);
    });
  });
});
