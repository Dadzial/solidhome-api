import { describe, it, expect, vi, beforeEach } from 'vitest';
import AirService from '../../../lib/modules/services/air/air.service';
import AirModel from '../../../lib/modules/schemas/air/air.schema';
import MqttService from '../../../lib/modules/services/mqtt/mqtt.service';
import SseService from '../../../lib/modules/services/sse/sse.service';

describe('AirService', () => {
  let service: AirService;
  let mockMqttService: Partial<MqttService>;
  let mockSseService: Partial<SseService>;
  let mqttHandler: (payload: unknown) => Promise<void>;

  beforeEach(async () => {
    await AirModel.deleteMany({});

    mockMqttService = {
      subscribe: vi.fn().mockImplementation((_topic, handler) => {
        mqttHandler = handler;
        return vi.fn();
      }),
    };

    mockSseService = {
      broadcast: vi.fn(),
    };

    service = new AirService(mockMqttService as MqttService, mockSseService as SseService);
  });

  describe('initMqttSubscription', () => {
    it('should subscribe to topic "air" on initialization', () => {
      expect(mockMqttService.subscribe).toHaveBeenCalledWith('air', expect.any(Function));
    });

    it('should save valid air metrics to database and broadcast via SSE', async () => {
      const payload = {
        temperature: 24.5,
        humidity: 48.2,
        pressure: 1012.3,
      };

      await mqttHandler(payload);

      const saved = await AirModel.findOne({ temperature: 24.5 });
      expect(saved).toBeDefined();
      expect(saved!.humidity).toBe(48.2);
      expect(saved!.pressure).toBe(1012.3);

      expect(mockSseService.broadcast).toHaveBeenCalledWith(
        'air',
        'air_updated',
        expect.objectContaining({
          temperature: 24.5,
          humidity: 48.2,
          pressure: 1012.3,
        }),
      );
    });

    it('should ignore invalid or non-numeric payload without saving or broadcasting', async () => {
      await mqttHandler(null);
      await mqttHandler({ temperature: 'not-a-number', humidity: 40, pressure: 1000 });
      await mqttHandler({ temperature: 20 }); // missing humidity & pressure

      const count = await AirModel.countDocuments();
      expect(count).toBe(0);
      expect(mockSseService.broadcast).not.toHaveBeenCalled();
    });

    it('should catch database errors gracefully without throwing', async () => {
      vi.spyOn(AirModel, 'create').mockRejectedValueOnce(new Error('DB failure'));

      await expect(
        mqttHandler({ temperature: 21, humidity: 45, pressure: 1005 }),
      ).resolves.not.toThrow();
    });

    it('should not initialize subscription if mqttService is not provided', () => {
      const standaloneService = new AirService();
      expect(standaloneService).toBeDefined();
    });
  });

  describe('getCurrentAir', () => {
    it('should return the latest air metrics when board is online', async () => {
      await AirModel.create({ temperature: 20.0, humidity: 50.0, pressure: 1000.0 });
      // Small pause to guarantee distinct createdAt timestamps
      await new Promise((r) => setTimeout(r, 10));
      await AirModel.create({ temperature: 25.5, humidity: 42.0, pressure: 1015.0 });

      const current = await service.getCurrentAir();
      expect(current).toBeDefined();
      expect(current!.temperature).toBe(25.5);
      expect(current!.humidity).toBe(42.0);
      expect(current!.pressure).toBe(1015.0);
    });

    it('should return null if database has no records', async () => {
      const current = await service.getCurrentAir();
      expect(current).toBeNull();
    });
  });

  describe('getAirHistory', () => {
    it('should aggregate today measurements by minute HH:mm chronologically', async () => {
      const now = new Date(2026, 10, 26, 18, 5, 30);
      await AirModel.create({
        temperature: 20.0,
        humidity: 50.0,
        pressure: 1000.0,
        createdAt: new Date(2026, 10, 26, 18, 1, 10),
      });
      await AirModel.create({
        temperature: 22.0,
        humidity: 52.0,
        pressure: 1002.0,
        createdAt: new Date(2026, 10, 26, 18, 1, 45),
      });
      await AirModel.create({
        temperature: 23.5,
        humidity: 48.0,
        pressure: 1005.0,
        createdAt: new Date(2026, 10, 26, 18, 3, 15),
      });

      const history = await service.getAirHistory('today', now);
      expect(history.timeframe).toBe('today');
      expect(history.categories).toEqual(['18:01', '18:03']);
      expect(history.temperature).toEqual([21.0, 23.5]);
      expect(history.humidity).toEqual([51.0, 48.0]);
      expect(history.pressure).toEqual([1001.0, 1005.0]);
    });

    it('should aggregate week measurements into weekday buckets up to today', async () => {
      // Czwartek 2026-11-26 -> Pn, Wt, Śr, Cz
      const now = new Date(2026, 10, 26, 18, 0, 0);
      await AirModel.create({
        temperature: 20.0,
        humidity: 40.0,
        pressure: 1010.0,
        createdAt: new Date(2026, 10, 23, 12, 0, 0), // Pn
      });
      await AirModel.create({
        temperature: 24.0,
        humidity: 50.0,
        pressure: 1014.0,
        createdAt: new Date(2026, 10, 26, 10, 0, 0), // Cz
      });

      const history = await service.getAirHistory('week', now);
      expect(history.timeframe).toBe('week');
      expect(history.categories).toEqual(['Pn', 'Wt', 'Śr', 'Cz']);
      expect(history.temperature).toEqual([20.0, null, null, 24.0]);
      expect(history.humidity).toEqual([40.0, null, null, 50.0]);
      expect(history.pressure).toEqual([1010.0, null, null, 1014.0]);
    });

    it('should aggregate month measurements into week buckets up to current week', async () => {
      // 26 dzień miesiąca -> Tydz 1..Tydz 4
      const now = new Date(2026, 10, 26, 18, 0, 0);
      await AirModel.create({
        temperature: 19.0,
        humidity: 45.0,
        pressure: 1008.0,
        createdAt: new Date(2026, 10, 3, 12, 0, 0), // Tydz 1
      });
      await AirModel.create({
        temperature: 21.0,
        humidity: 49.0,
        pressure: 1012.0,
        createdAt: new Date(2026, 10, 5, 12, 0, 0), // Tydz 1
      });
      await AirModel.create({
        temperature: 23.0,
        humidity: 55.0,
        pressure: 1016.0,
        createdAt: new Date(2026, 10, 25, 12, 0, 0), // Tydz 4
      });

      const history = await service.getAirHistory('month', now);
      expect(history.timeframe).toBe('month');
      expect(history.categories).toEqual(['Tydz 1', 'Tydz 2', 'Tydz 3', 'Tydz 4']);
      expect(history.temperature).toEqual([20.0, null, null, 23.0]);
      expect(history.humidity).toEqual([47.0, null, null, 55.0]);
      expect(history.pressure).toEqual([1010.0, null, null, 1016.0]);
    });
  });

  describe('clearHistory', () => {
    it('should delete all air records from database and broadcast history_cleared via SSE', async () => {
      await AirModel.create({ temperature: 22, humidity: 50, pressure: 1000 });
      await AirModel.create({ temperature: 23, humidity: 52, pressure: 1002 });

      const result = await service.clearHistory();
      expect(result.deletedCount).toBe(2);

      const count = await AirModel.countDocuments();
      expect(count).toBe(0);
      expect(mockSseService.broadcast).toHaveBeenCalledWith('air', 'history_cleared', {
        deletedCount: 2,
      });
    });
  });
});
