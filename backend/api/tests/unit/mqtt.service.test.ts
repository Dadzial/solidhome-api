import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import mqtt from 'mqtt';
import MqttService from '../../lib/modules/services/mqtt/mqtt.service';
import { config } from '../../lib/config';

type Listener = (...args: any[]) => void;

class MockMqttClient {
  private listeners: Record<string, Listener[]> = {};
  public subscribe = vi.fn((topic: string, cb?: (err: Error | null) => void) => {
    if (cb) cb(null);
  });
  public unsubscribe = vi.fn((topic: string, cb?: (err: Error | null) => void) => {
    if (cb) cb(null);
  });
  public publish = vi.fn(
    (topic: string, message: string | Buffer, opts: any, cb?: (err: Error | null) => void) => {
      if (typeof opts === 'function') {
        opts(null);
      } else if (cb) {
        cb(null);
      }
    },
  );
  public end = vi.fn((_force: boolean, cb?: () => void) => {
    if (cb) cb();
  });

  public on(event: string, cb: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(cb);
    return this;
  }

  public emit(event: string, ...args: any[]) {
    this.listeners[event]?.forEach((cb) => cb(...args));
  }
}

describe('MqttService', () => {
  let mockClient: MockMqttClient;
  let service: MqttService;

  beforeEach(() => {
    mockClient = new MockMqttClient();
    vi.spyOn(mqtt, 'connect').mockReturnValue(mockClient as any);
    service = new MqttService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('connection lifecycle', () => {
    it('should initialize connection to broker URL defined in config', () => {
      expect(mqtt.connect).toHaveBeenCalledWith(
        config.mqttBrokerUrl,
        expect.objectContaining({
          reconnectPeriod: 5000,
          connectTimeout: 10000,
        }),
      );
      expect(service.connected).toBe(false);
    });

    it('should set connected to true on connect event', () => {
      mockClient.emit('connect');
      expect(service.connected).toBe(true);
    });

    it('should set connected to false on close event', () => {
      mockClient.emit('connect');
      expect(service.connected).toBe(true);

      mockClient.emit('close');
      expect(service.connected).toBe(false);
    });
  });

  describe('subscribe & message handling', () => {
    it('should register subscriber and call client.subscribe when already connected', () => {
      mockClient.emit('connect');

      const handler = vi.fn();
      service.subscribe('lights/status', handler);

      expect(mockClient.subscribe).toHaveBeenCalledWith(
        `${config.mqttTopicPrefix}/lights/status`,
        expect.any(Function),
      );
    });

    it('should re-subscribe existing topics upon connect event', () => {
      const handler = vi.fn();
      service.subscribe('gates/state', handler);

      // Client not connected yet, so subscribe not called immediately
      expect(mockClient.subscribe).not.toHaveBeenCalled();

      // Now connect event fires
      mockClient.emit('connect');

      expect(mockClient.subscribe).toHaveBeenCalledWith(
        `${config.mqttTopicPrefix}/gates/state`,
        expect.any(Function),
      );
    });

    it('should dispatch incoming JSON message to matching topic handlers', async () => {
      mockClient.emit('connect');

      const handler = vi.fn();
      service.subscribe('lights/status', handler);

      const topic = `${config.mqttTopicPrefix}/lights/status`;
      const payloadObj = { name: 'living_room', state: 1 };
      const rawPayload = Buffer.from(JSON.stringify(payloadObj));

      mockClient.emit('message', topic, rawPayload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payloadObj, topic, rawPayload);
    });

    it('should fallback to string payload when message is not valid JSON', () => {
      mockClient.emit('connect');

      const handler = vi.fn();
      service.subscribe('air/ping', handler);

      const topic = `${config.mqttTopicPrefix}/air/ping`;
      const rawPayload = Buffer.from('plain text ping');

      mockClient.emit('message', topic, rawPayload);

      expect(handler).toHaveBeenCalledWith('plain text ping', topic, rawPayload);
    });

    it('should allow unsubscribing specific handler or entire topic', () => {
      mockClient.emit('connect');

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = service.subscribe('lights/status', handler1);
      service.subscribe('lights/status', handler2);

      // Unsubscribe only handler1
      unsubscribe1();

      const topic = `${config.mqttTopicPrefix}/lights/status`;
      mockClient.emit('message', topic, Buffer.from('{}'));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);

      // Unsubscribe all for topic
      service.unsubscribe('lights/status');
      expect(mockClient.unsubscribe).toHaveBeenCalledWith(topic, expect.any(Function));
    });
  });

  describe('publish', () => {
    it('should publish JSON serialized message with topic prefix', () => {
      mockClient.emit('connect');

      service.publish('lights/set', { name: 'kitchen', state: 1 });

      const expectedTopic = `${config.mqttTopicPrefix}/lights/set`;
      const expectedMessage = JSON.stringify({ name: 'kitchen', state: 1 });

      expect(mockClient.publish).toHaveBeenCalledWith(
        expectedTopic,
        expectedMessage,
        { qos: 1 },
        expect.any(Function),
      );
    });

    it('should not publish if client is disconnected', () => {
      // not connected
      service.publish('lights/set', { name: 'kitchen', state: 1 });
      expect(mockClient.publish).not.toHaveBeenCalled();
    });
  });
});
