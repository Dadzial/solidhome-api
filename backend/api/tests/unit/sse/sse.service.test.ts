import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SseService from '../../../lib/modules/services/sse/sse.service';
import logger from '../../../lib/utils/logger';

let mockChannel: {
  register: ReturnType<typeof vi.fn>;
  broadcast: ReturnType<typeof vi.fn>;
  sessionCount: number;
};

vi.mock('better-sse', () => ({
  createChannel: vi.fn(() => mockChannel),
}));

describe('SseService', () => {
  let service: SseService;

  beforeEach(() => {
    mockChannel = {
      register: vi.fn(),
      broadcast: vi.fn(),
      sessionCount: 0,
    };
    vi.spyOn(logger, 'info').mockImplementation(() => logger);
    service = new SseService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize channel and log creation', () => {
      expect(logger.info).toHaveBeenCalledWith('Channel for SSE created');
      expect(service.activeSessionsCount).toBe(0);
    });
  });

  describe('registerSession', () => {
    it('should register a session in the channel and log active session count', () => {
      const mockSession = { id: 'session-123' } as any;
      mockChannel.sessionCount = 1;

      service.registerSession(mockSession);

      expect(mockChannel.register).toHaveBeenCalledTimes(1);
      expect(mockChannel.register).toHaveBeenCalledWith(mockSession);
      expect(logger.info).toHaveBeenCalledWith('See session registered. Active sessions: 1');
    });

    it('should handle registering multiple sessions sequentially', () => {
      const session1 = { id: 'sess-1' } as any;
      const session2 = { id: 'sess-2' } as any;

      mockChannel.sessionCount = 1;
      service.registerSession(session1);
      mockChannel.sessionCount = 2;
      service.registerSession(session2);

      expect(mockChannel.register).toHaveBeenCalledTimes(2);
      expect(mockChannel.register).toHaveBeenNthCalledWith(1, session1);
      expect(mockChannel.register).toHaveBeenNthCalledWith(2, session2);
      expect(service.activeSessionsCount).toBe(2);
    });
  });

  describe('broadcast', () => {
    it('should broadcast an event with formatted payload and domain-prefixed event name', () => {
      const fakeNow = new Date('2026-11-14T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow);

      mockChannel.sessionCount = 2;
      const payloadData = { name: 'living_room', state: true };

      service.broadcast('lights', 'light_updated', payloadData);

      expect(mockChannel.broadcast).toHaveBeenCalledTimes(1);
      expect(mockChannel.broadcast).toHaveBeenCalledWith(
        {
          domain: 'lights',
          event: 'light_updated',
          data: payloadData,
          timestamp: '2026-11-14T12:00:00.000Z',
        },
        'lights:light_updated',
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Broadcast event "lights:light_updated" sent to 2 sessions',
      );
    });

    it('should broadcast air domain events correctly', () => {
      const airData = { temperature: 21.5, humidity: 45 };

      service.broadcast('air', 'climate_updated', airData);

      expect(mockChannel.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'air',
          event: 'climate_updated',
          data: airData,
          timestamp: expect.any(String),
        }),
        'air:climate_updated',
      );
    });

    it('should handle primitive and null data payloads', () => {
      service.broadcast('lights', 'all_off', null);
      expect(mockChannel.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'lights',
          event: 'all_off',
          data: null,
        }),
        'lights:all_off',
      );

      service.broadcast('lights', 'count', 42);
      expect(mockChannel.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'lights',
          event: 'count',
          data: 42,
        }),
        'lights:count',
      );
    });

    it('should generate valid ISO 8601 timestamps', () => {
      service.broadcast('lights', 'ping', {});

      const sentPayload = mockChannel.broadcast.mock.calls[0][0];
      expect(sentPayload).toHaveProperty('timestamp');
      expect(new Date(sentPayload.timestamp).toISOString()).toBe(sentPayload.timestamp);
    });
  });

  describe('activeSessionsCount', () => {
    it('should return the current session count from channel', () => {
      expect(service.activeSessionsCount).toBe(0);

      mockChannel.sessionCount = 5;
      expect(service.activeSessionsCount).toBe(5);

      mockChannel.sessionCount = 12;
      expect(service.activeSessionsCount).toBe(12);
    });
  });
});
