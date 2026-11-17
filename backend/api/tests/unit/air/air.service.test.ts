import { describe, it, expect, vi, beforeEach } from 'vitest';
import AirService from '../../../lib/modules/services/air/air.service';
import AirModel from '../../../lib/modules/schemas/air/air.schema';
import MqttService from '../../../lib/modules/services/mqtt/mqtt.service';
import SseService from '../../../lib/modules/services/sse/sse.service';
import HardwareStatusService from '../../../lib/modules/services/hardware/hardware-status.service';

describe('AirService', () => {
  let service: AirService;
  let mockMqttService: Partial<MqttService>;
  let mockSseService: Partial<SseService>;
  let mockBoardStatusService: Partial<HardwareStatusService>;
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

    mockBoardStatusService = {
      isBoardOnline: true,
    };

    service = new AirService(
      mockMqttService as MqttService,
      mockSseService as SseService,
      mockBoardStatusService as HardwareStatusService,
    );
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

    it('should return null if database has no records and board is online', async () => {
      const current = await service.getCurrentAir();
      expect(current).toBeNull();
    });

    it('should throw hardware_offline error when board is offline', async () => {
      Object.defineProperty(mockBoardStatusService, 'isBoardOnline', {
        get: () => false,
      });

      await expect(service.getCurrentAir()).rejects.toThrow('hardware_offline');
    });
  });

  describe('getAirHistory', () => {
    it('should return history records sorted chronologically (oldest to newest)', async () => {
      await AirModel.create({ temperature: 18.0, humidity: 55.0, pressure: 990.0 });
      await new Promise((r) => setTimeout(r, 10));
      await AirModel.create({ temperature: 19.0, humidity: 54.0, pressure: 995.0 });
      await new Promise((r) => setTimeout(r, 10));
      await AirModel.create({ temperature: 20.0, humidity: 53.0, pressure: 1000.0 });

      const history = await service.getAirHistory(10);
      expect(history.length).toBe(3);
      expect(history[0].temperature).toBe(18.0);
      expect(history[1].temperature).toBe(19.0);
      expect(history[2].temperature).toBe(20.0);
    });

    it('should respect the limit parameter', async () => {
      for (let i = 1; i <= 5; i++) {
        await AirModel.create({ temperature: 20 + i, humidity: 50, pressure: 1000 });
        await new Promise((r) => setTimeout(r, 5));
      }

      const history = await service.getAirHistory(3);
      expect(history.length).toBe(3);
      expect(history[0].temperature).toBe(23);
      expect(history[1].temperature).toBe(24);
      expect(history[2].temperature).toBe(25);
    });
  });

  describe('clearHistory', () => {
    it('should delete all air records from database', async () => {
      await AirModel.create({ temperature: 22, humidity: 50, pressure: 1000 });
      await AirModel.create({ temperature: 23, humidity: 52, pressure: 1002 });

      const result = await service.clearHistory();
      expect(result.deletedCount).toBe(2);

      const count = await AirModel.countDocuments();
      expect(count).toBe(0);
    });
  });
});
