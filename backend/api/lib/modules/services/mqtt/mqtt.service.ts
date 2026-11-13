import mqtt, { MqttClient } from 'mqtt';
import { config } from '../../../config';
import logger from '../../../utils/logger';

/**
 * Typ funkcji obsługującej przychodzące komunikaty MQTT.
 *
 * @template T - Typ przetworzonego ładunku wiadomości (np. sparsowany obiekt JSON lub string).
 * @param payload - Sparsowany ładunek wiadomości (JSON lub ciąg znaków).
 * @param topic - Pełna nazwa tematu, z którego odebrano wiadomość.
 * @param raw - Surowy bufor odebranej wiadomości.
 */
export type MqttMessageHandler<T = unknown> = (
  payload: T,
  topic: string,
  raw: Buffer,
) => void | Promise<void>;

/**
 * @class MqttService
 * @description Centralny serwis infrastruktury odpowiedzialny za komunikację z brokerem MQTT.
 * Zapewnia uniwersalny mechanizm Pub/Sub dla wszystkich modułów.
 *
 * ### Funkcjonalności:
 * - Zarządza pojedynczym, współdzielonym połączeniem z brokerem MQTT.
 * - Umożliwia dowolnemu modułowi rejestrację subskrypcji na wybrane tematy z automatyczną resubskrypcją po wznowieniu połączenia.
 * - Automatycznie dopasowuje prefiks tematu (`config.mqttTopicPrefix`).
 * - Obsługuje bezpieczną publikację komunikatów (QoS 0/1/2) oraz czyste zamykanie połączeń.
 */
export class MqttService {
  /** Instancja klienta MQTT biblioteki `mqtt` */
  private client: MqttClient | null = null;

  /** Flaga informująca, czy klient jest aktualnie połączony z brokerem */
  private isConnected = false;

  /** Rejestr subskrybentów przypisanych do pełnych nazw tematów MQTT */
  private subscribers = new Map<string, Set<MqttMessageHandler>>();

  /**
   * @constructor
   * Inicjalizuje połączenie z brokerem MQTT.
   */
  constructor() {
    this.connect();
  }

  /**
   * Flaga wskazująca, czy klient jest połączony z brokerem.
   */
  public get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Ustanawia połączenie z brokerem MQTT i konfiguruje obsługę zdarzeń.
   * @private
   */
  private connect(): void {
    const clientId = `solidhome_api_${Math.random().toString(16).substring(2, 8)}`;

    logger.info(`Connecting to broker ${config.mqttBrokerUrl}...`);

    this.client = mqtt.connect(config.mqttBrokerUrl, {
      clientId,
      username: config.mqttUsername || undefined,
      password: config.mqttPassword || undefined,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info(`Connected to broker (clientId: ${clientId})`);

      this.subscribers.forEach((_, fullTopic) => {
        this.client?.subscribe(fullTopic, (err) => {
          if (err) {
            logger.error(`Subscribe to ${fullTopic}:`, err);
          } else {
            logger.info(`Subscribed to ${fullTopic}`);
          }
        });
      });
    });

    this.client.on('message', async (topic: string, rawPayload: Buffer) => {
      logger.info(`Get message from ${topic}: ${rawPayload.toString()}`);

      const handlers = this.subscribers.get(topic);
      if (!handlers || handlers.size === 0) {
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawPayload.toString());
      } catch {
        parsed = rawPayload.toString();
      }

      handlers.forEach(async (handler) => {
        try {
          await handler(parsed, topic, rawPayload);
        } catch (err) {
          logger.error(`[MQTT] Error in handler for topic ${topic}:`, err);
        }
      });
    });

    this.client.on('error', (err) => {
      logger.error('Error:', err);
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        logger.warn('Connection closed. Attempting to reconnect...');
        this.isConnected = false;
      }
    });
  }

  /**
   * Rejestruje funkcję nasłuchującą na wiadomości z określonego tematu MQTT.
   *
   * @template T - Typ oczekiwanego ładunku wiadomości.
   * @param subTopic - Subtemat (np. `'lights/status'`) lub pełna ścieżka tematu.
   * @param handler - Funkcja wywoływana przy odebraniu wiadomości.
   * @returns Funkcja wyrejestrowująca subskrybenta (unsubscribe).
   */
  public subscribe<T = unknown>(subTopic: string, handler: MqttMessageHandler<T>): () => void {
    const fullTopic = this.resolveFullTopic(subTopic);

    let handlers = this.subscribers.get(fullTopic);
    if (!handlers) {
      handlers = new Set();
      this.subscribers.set(fullTopic, handlers);

      if (this.client && this.isConnected) {
        this.client.subscribe(fullTopic, (err) => {
          if (err) {
            logger.error(`Subscribe to ${fullTopic}:`, err);
          } else {
            logger.info(`Subscribed to ${fullTopic}`);
          }
        });
      }
    }

    handlers.add(handler as MqttMessageHandler);

    return () => {
      this.unsubscribe(subTopic, handler as MqttMessageHandler);
    };
  }

  /**
   * Wyrejestrowuje funkcję nasłuchującą lub cały temat, jeśli brak kolejnych subskrybentów.
   *
   * @param subTopic - Subtemat lub pełna ścieżka tematu.
   * @param handler - Opcjonalny konkretny handler do usunięcia. Jeśli pominięty, usuwa wszystkie handlery danego tematu.
   * @returns {void}
   */
  public unsubscribe(subTopic: string, handler?: MqttMessageHandler): void {
    const fullTopic = this.resolveFullTopic(subTopic);
    const handlers = this.subscribers.get(fullTopic);

    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
    } else {
      handlers.clear();
    }

    if (handlers.size === 0) {
      this.subscribers.delete(fullTopic);
      if (this.client && this.isConnected) {
        this.client.unsubscribe(fullTopic, (err) => {
          if (err) {
            logger.error(`Unsubscribe from ${fullTopic}:`, err);
          } else {
            logger.info(`Unsubscribed from ${fullTopic}`);
          }
        });
      }
    }
  }

  /**
   * Publikuje wiadomość na określonym subtemacie MQTT.
   *
   * @param subTopic - Subtemat, na który ma zostać opublikowana wiadomość (np. `'lights/set'`).
   * @param payload - Dane do opublikowania (obiekt lub string).
   * @param qos - Poziom Quality of Service (domyślnie 1).
   */
  public publish(subTopic: string, payload: object | string, qos: 0 | 1 | 2 = 1): void {
    if (!this.client || !this.isConnected) {
      logger.warn(`Cannot publish to ${subTopic}: MQTT client is not connected.`);
      return;
    }

    const fullTopic = this.resolveFullTopic(subTopic);
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    this.client.publish(fullTopic, message, { qos }, (err) => {
      if (err) {
        logger.error(`Error publishing to ${fullTopic}:`, err);
      } else {
        logger.info(`Published to ${fullTopic}: ${message}`);
      }
    });
  }

  /**
   * Pomocnicza metoda zamieniająca subtemat na pełny temat z uwzględnieniem prefiksu.
   *
   * @param subTopic - Subtemat (np. `'lights/status'`) lub pełna ścieżka tematu.
   * @returns Pełna ścieżka tematu z prefiksem (np. `'solidhome/lights/status'`).
   */
  private resolveFullTopic(subTopic: string): string {
    const prefix = config.mqttTopicPrefix;
    if (subTopic === prefix || subTopic.startsWith(`${prefix}/`)) {
      return subTopic;
    }
    return `${prefix}/${subTopic.replace(/^\//, '')}`;
  }
}

export default MqttService;
