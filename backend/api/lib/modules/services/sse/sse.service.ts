import { createChannel, Channel, Session } from 'better-sse';
import logger from '../../../utils/logger';

/**
 * @interface SseEvent
 * @param domain - Domenę, do której należy zdarzenie (np. 'lights', 'air').
 * @param event - Typ zdarzenia (np. 'lightStateChanged').
 * @param data - Dane związane ze zdarzeniem, mogące być dowolnego typu.
 * @param timestamp - Znacznik czasu w formacie ISO 8601, określający moment wygenerowania zdarzenia.
 * @description Interfejs reprezentujący zdarzenie Server-Sent Events w systemie.
 * Zawiera informacje o domenie, typie zdarzenia, danych oraz znaczniku czasu.
 */
interface SseEvent<T = unknown> {
  domain: 'lights' | 'air' | 'hardware' | 'api';
  event: string;
  data: T;
  timestamp: string;
}

/**
 * @class SseService
 * @description Serwis odpowiedzialny za obsługę Server-Sent Events (SSE) w systemie.
 * Umożliwia rejestrację klientów SSE, wysyłanie zdarzeń do wszystkich lub wybranych klientów,
 * okresowe rozgłaszanie sygnału heartbeat (`api:ping`) oraz zarządzanie połączeniami SSE.
 */
class SseService {
  /** Kanał komunikacyjny SSE, umożliwiający wysyłanie zdarzeń do klientów. */
  private channel: Channel;

  /** Uchwyt interwału wysyłającego cykliczne zdarzenie `api:ping` do aktywnych sesji. */
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * @constructor
   * @param heartbeatIntervalMs - Interwał wysyłania zdarzenia heartbeat w ms (domyślnie 4000 ms).
   */
  constructor(heartbeatIntervalMs = 4000) {
    this.channel = createChannel();
    logger.info('Channel for SSE created');
    this.startHeartbeat(heartbeatIntervalMs);
  }

  /**
   * Rejestruje nową sesję SSE w kanale komunikacyjnym oraz nasłuchuje jej rozłączenia.
   * @param session - Obiekt sesji SSE do zarejestrowania.
   * @returns {void}
   */
  public registerSession(session: Session): void {
    this.channel.register(session);
    logger.info(`SSE session registered. Active sessions: ${this.channel.sessionCount}`);

    if (typeof session.on === 'function') {
      session.on('disconnected', () => {
        logger.info(`SSE session disconnected. Active sessions: ${this.channel.sessionCount}`);
      });
    }
  }

  /**
   * Wysyła zdarzenie do wszystkich otwartych sesji SSE.
   *
   * @param domain Domena zdarzenia ('lights', 'air', 'hardware', 'api')
   * @param event Nazwa zdarzenia (np. 'light_updated')
   * @param data Ładunek danych
   */
  public broadcast<T>(domain: SseEvent['domain'], event: string, data: T): void {
    const payload: SseEvent<T> = {
      domain,
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    this.channel.broadcast(payload, `${domain}:${event}`);
    logger.info(
      `Broadcast event "${domain}:${event}" sent to ${this.channel.sessionCount} sessions`,
    );
  }

  /**
   * Uruchamia cykliczne wysyłanie zdarzenia `api:ping` do aktywnych sesji SSE,
   * umożliwiając klientom niezawodne wykrywanie zerwania połączenia (watchdog).
   *
   * @private
   * @param intervalMs - Interwał w milisekundach.
   * @returns {void}
   */
  private startHeartbeat(intervalMs: number): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.channel.sessionCount > 0) {
        this.channel.broadcast(
          {
            domain: 'api',
            event: 'ping',
            data: null,
            timestamp: new Date().toISOString(),
          },
          'api:ping',
        );
      }
    }, intervalMs);

    if (this.heartbeatInterval?.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Zatrzymuje cykliczny interwał heartbeat.
   *
   * @returns {void}
   */
  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Zwraca liczbę aktywnych sesji SSE w kanale komunikacyjnym.
   * @returns {number} Liczba aktywnych sesji SSE.
   */
  public get activeSessionsCount(): number {
    return this.channel.sessionCount;
  }
}
export default SseService;
