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
  domain: 'lights' | 'air';
  event: string;
  data: T;
  timestamp: string;
}

/**
 * @class SseService
 * @description Serwis odpowiedzialny za obsługę Server-Sent Events (SSE) w systemie.
 * Umożliwia rejestrację klientów SSE, wysyłanie zdarzeń do wszystkich lub wybranych klientów,
 * oraz zarządzanie połączeniami SSE.
 */
class SseService {
  /** Kanał komunikacyjny SSE, umożliwiający wysyłanie zdarzeń do klientów. */
  private channel: Channel;

  /**
   * @constructor
   */
  constructor() {
    this.channel = createChannel();
    logger.info('Channel for SSE created');
  }

  /**
   * Rejestruje nową sesję SSE w kanale komunikacyjnym.
   * @param session - Obiekt sesji SSE do zarejestrowania.
   * @returns {void}
   */
  public registerSession(session: Session): void {
    this.channel.register(session);
    logger.info(`See session registered. Active sessions: ${this.channel.sessionCount}`);
  }

  /**
   * Wysyła zdarzenie do wszystkich otwartych sesji SSE.
   *
   * @param domain Domena zdarzenia ('lights', 'air', 'gates', 'security')
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
   * Zwraca liczbę aktywnych sesji SSE w kanale komunikacyjnym.
   * @returns {number} Liczba aktywnych sesji SSE.
   */
  public get activeSessionsCount(): number {
    return this.channel.sessionCount;
  }
}
export default SseService;
