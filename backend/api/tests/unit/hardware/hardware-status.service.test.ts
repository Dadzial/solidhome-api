import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HardwareStatusService from '../../../lib/modules/services/hardware/hardware-status.service';
import MqttService from '../../../lib/modules/services/mqtt/mqtt.service';
import SseService from '../../../lib/modules/services/sse/sse.service';

describe('HardwareStatusService', () => {
  let boardStatusService: HardwareStatusService;
  let mqttServiceMock: Partial<MqttService>;
  let sseServiceMock: Partial<SseService>;
  let mqttHandler: (payload: unknown) => void;

  beforeEach(() => {
    vi.useFakeTimers();

    mqttServiceMock = {
      subscribe: vi.fn().mockImplementation((_topic, handler) => {
        mqttHandler = handler;
        return vi.fn();
      }),
    };

    sseServiceMock = {
      broadcast: vi.fn(),
    };

    boardStatusService = new HardwareStatusService(
      mqttServiceMock as MqttService,
      sseServiceMock as SseService,
      5000,
    );
  });

  afterEach(() => {
    boardStatusService.cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with isBoardOnline false', () => {
    expect(boardStatusService.isBoardOnline).toBe(false);
  });

  it('should subscribe to board/heartbeat on mqttService', () => {
    expect(mqttServiceMock.subscribe).toHaveBeenCalledWith('board/heartbeat', expect.any(Function));
  });

  it('should set isOnline to true and broadcast online when heartbeat arrives', () => {
    mqttHandler({ status: 'online' });

    expect(boardStatusService.isBoardOnline).toBe(true);
    expect(sseServiceMock.broadcast).toHaveBeenCalledWith('hardware', 'status', {
      online: true,
    });
  });

  it('should transition to offline and broadcast offline when heartbeat timeout expires', () => {
    mqttHandler({ status: 'online' });
    expect(boardStatusService.isBoardOnline).toBe(true);

    vi.advanceTimersByTime(5000);

    expect(boardStatusService.isBoardOnline).toBe(false);
    expect(sseServiceMock.broadcast).toHaveBeenCalledWith('hardware', 'status', {
      online: false,
    });
  });

  it('should reset timeout on subsequent heartbeats', () => {
    mqttHandler({ status: 'online' });
    vi.advanceTimersByTime(4000);

    // Another heartbeat before timeout
    mqttHandler({ status: 'online' });
    vi.advanceTimersByTime(4000);

    // Still online because timer was reset
    expect(boardStatusService.isBoardOnline).toBe(true);

    // After remaining 1000ms + 1ms
    vi.advanceTimersByTime(1001);
    expect(boardStatusService.isBoardOnline).toBe(false);
  });
});
