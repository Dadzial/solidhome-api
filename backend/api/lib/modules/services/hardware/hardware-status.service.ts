import MqttService from '../mqtt/mqtt.service';
import SseService from '../sse/sse.service';
import logger from '../../../utils/logger';

/**
 * @class HardwareStatusService
 * @description Serwis monitorujący status obecności fizycznej płytki mikrokontrolera (NXP) w sieci domowej...
 */
export class HardwareStatusService {
  /** Flaga określająca bieżący stan połączenia z fizyczną płytką */
  private isOnline = false;

  /** Uchwyt timera wykrywającego brak odpowiedzi (heartbeat timeout) */
  private heartbeatTimeout: NodeJS.Timeout | null = null;

  /** Czas bez sygnału heartbeat (w milisekundach), po którym płytka uznawana jest za offline */
  private readonly timeoutMs: number;

  /** Funkcja wyrejestrowująca subskrypcję MQTT */
  private unsubscribeMqtt: (() => void) | null = null;

  /**
   * @param mqttService Serwis komunikacji MQTT
   * @param sseService Serwis rozgłaszania zdarzeń SSE
   * @param timeoutMs Czas oczekiwania na kolejny heartbeat (domyślnie 6000 ms)
   * @constructor
   */
  constructor(
    private mqttService: MqttService,
    private sseService: SseService,
    timeoutMs = 6000,
  ) {
    this.timeoutMs = timeoutMs;
    this.initializeSubscription();
  }

  /**
   * Zwraca aktualny stan aktywności płytki mikrokontrolera.
   * @returns {boolean}
   */
  public get isBoardOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Inicjalizuje subskrypcję tematu MQTT dla sygnałów heartbeat.
   * @returns {void}
   */
  private initializeSubscription(): void {
    this.unsubscribeMqtt = this.mqttService.subscribe('board/heartbeat', () => {
      this.handleHeartbeat();
    });
  }

  /**
   * Obsługuje odebrany sygnał heartbeat z płytki.
   * @returns {void}
   */
  public handleHeartbeat(): void {
    if (!this.isOnline) {
      this.isOnline = true;
      logger.info('Hardware board is now ONLINE');
      this.sseService.broadcast('hardware', 'status', { online: true });
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      this.isOnline = false;
      logger.warn('Hardware board HEARTBEAT TIMEOUT -> OFFLINE');
      this.sseService.broadcast('hardware', 'status', { online: false });
    }, this.timeoutMs);
  }

  /**
   * Ustawia stan płytki na potrzeby testów jednostkowych.
   * @param status Nowy stan płytki (true = online, false = offline)
   * @returns {void}
   */
  public setBoardOnlineForTest(status: boolean): void {
    this.isOnline = status;
  }

  /**
   * Czyści zasoby i aktywne timery (przydatne przy zamykaniu aplikacji i w testach).
   * @returns {void}
   */
  public cleanup(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    if (this.unsubscribeMqtt) {
      this.unsubscribeMqtt();
      this.unsubscribeMqtt = null;
    }
  }
}

export default HardwareStatusService;
