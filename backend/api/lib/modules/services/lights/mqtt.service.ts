import mqtt, { MqttClient } from 'mqtt';
import { config } from '../../../config';
import logger from '../../../utils/logger';

/**
 * @class MqttService
 * @description Serwis odpowiedzialny za komunikację z brokerem MQTT, umożliwiający publikowanie i subskrybowanie wiadomości.
 * Obsługuje połączenie, ponowne łączenie oraz logowanie zdarzeń związanych z komunikacją MQTT.
 */
class MqttService {
  /**
   * @private
   * @property {MqttClient | null} client - Instancja klienta MQTT, używana do publikowania i subskrybowania wiadomości.
   */
  private client: MqttClient | null = null;
  /**
   * @private
   * @property {boolean} isConnected - Flaga wskazująca, czy klient MQTT jest obecnie połączony z brokerem.
   */
  private isConnected = false;

  /**
   * @constructor
   * @description Inicjalizuje połączenie z brokerem MQTT przy tworzeniu instancji serwisu.
   */
  constructor() {
    this.connect();
  }

  /**
   * Odpowiedzialna za ustanowienie połączenia z brokerem MQTT, subskrybowanie tematów oraz obsługę zdarzeń połączenia i błędów.
   */
  private connect(): void {
    const clientId = `solidhome_api_${Math.random().toString(16).substring(2, 8)}`;

    logger.info(`[MQTT] Connecting to broker ${config.mqttBrokerUrl}...`);

    this.client = mqtt.connect(config.mqttBrokerUrl, {
      clientId,
      username: config.mqttUsername || undefined,
      password: config.mqttPassword || undefined,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info(`[MQTT] Connected to broker (clientId: ${clientId})`);

      const statusTopic = `${config.mqttTopicPrefix}/lights/status`;
      this.client?.subscribe(statusTopic, (err) => {
        if (err) {
          logger.error(`[MQTT] Subscribe to ${statusTopic}:`, err);
        } else {
          logger.info(`[MQTT] Subscribed to ${statusTopic}`);
        }
      });
    });

    this.client.on('message', (topic: string, payload: Buffer) => {
      logger.info(`[MQTT] Get message from ${topic}: ${payload.toString()}`);
      // Tutaj w przyszłości zapis z pytki do mongoDB
    });

    this.client.on('error', (err) => {
      logger.error('[MQTT] Error:', err);
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        logger.warn('[MQTT] Connection closed. Attempting to reconnect...');
        this.isConnected = false;
      }
    });
  }

  /**
   * Publikuje wiadomość na określonym subtemacie MQTT. Jeśli klient nie jest połączony, loguje ostrzeżenie.
   *
   * @param subTopic - Subtemat, na który ma zostać opublikowana wiadomość (np. "lights/status").
   * @param payload - Dane do opublikowania, mogą być w postaci obiektu lub stringu.
   */
  public publish(subTopic: string, payload: object | string): void {
    if (!this.client || !this.isConnected) {
      logger.warn(`[MQTT] Cannot publish to ${subTopic}: MQTT client is not connected.`);
      return;
    }

    const fullTopic = `${config.mqttTopicPrefix}/${subTopic}`;
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    this.client.publish(fullTopic, message, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`[MQTT] Error publishing to ${fullTopic}:`, err);
      } else {
        logger.info(`[MQTT] Published to ${fullTopic}: ${message}`);
      }
    });
  }

  /**
   * Zamyka połączenie z brokerem MQTT. Jeśli klient jest połączony, wywołuje metodę end() i loguje zdarzenie rozłączenia.
   */
  public disconnect(): void {
    if (this.client) {
      this.client.end(false, () => {
        logger.info('[MQTT] Disconnected from broker');
      });
    }
  }
}

export default MqttService;
