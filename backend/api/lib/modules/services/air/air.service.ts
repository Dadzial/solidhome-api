import AirModel from '../../schemas/air/air.schema';
import { AirTimeframe, IAir, IAirHistoryResponse } from '../../models/air/air.model';
import logger from '../../../utils/logger';
import MqttService from '../mqtt/mqtt.service';
import SseService from '../sse/sse.service';

/** Maksymalna liczba punktów minutowych zwracanych w widoku dziennym ('today'). */
const MAX_TODAY_POINTS = 60;

/** Etykiety dni tygodnia (spójne z LightsEnergyService). */
const ALL_WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

/** Etykiety tygodni miesiąca (spójne z LightsEnergyService). */
const ALL_MONTH_WEEKS = ['Tydz 1', 'Tydz 2', 'Tydz 3', 'Tydz 4'];

/**
 * Formatuje datę do postaci lokalnego czasu HH:mm (np. '18:05').
 *
 * @param date - Obiekt Date do sformatowania.
 * @returns string
 */
const getTimeString = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * @class AirService
 * @description Serwis odpowiedzialny za zarządzanie danymi z czujnika powietrza w systemie SolidHome.
 * Odpowiada za odbiór pomiarów z mikrokontrolera NXP przez MQTT, zapis do bazy danych MongoDB,
 * rozsyłanie aktualizacji na żywo przez SSE oraz weryfikację dostępności fizycznej płytki.
 */
class AirService {
  /**
   * @constructor
   * @param mqttService - Opcjonalny serwis odpowiedzialny za publikowanie zdarzeń MQTT do urządzeń zewnętrznych.
   * @param sseService - Opcjonalny serwis odpowiedzialny za obsługę Server-Sent Events.
   */
  constructor(
    private mqttService?: MqttService,
    private sseService?: SseService,
  ) {
    this.initMqttSubscription();
  }

  /**
   * Inicjalizuje subskrypcję MQTT dla czujnika powietrza (solidhome/api/air).
   * @returns {void}
   */
  private initMqttSubscription(): void {
    if (!this.mqttService) {
      return;
    }

    this.mqttService.subscribe<IAir>('air', async (payload) => {
      try {
        if (!payload || typeof payload !== 'object') {
          return;
        }

        const { temperature, humidity, pressure } = payload;

        if (
          typeof temperature !== 'number' ||
          typeof humidity !== 'number' ||
          typeof pressure !== 'number'
        ) {
          logger.warn('Error reading air data from MQTT:', payload);
          return;
        }

        const newMeasurement = await AirModel.create({
          temperature,
          humidity,
          pressure,
        });

        if (this.sseService) {
          this.sseService.broadcast('air', 'air_updated', newMeasurement);
        }
      } catch (error) {
        logger.error('Error reading air data from MQTT:', error);
      }
    });
  }

  /**
   * Pobiera bieżące parametry powietrza z bazy danych.
   * Weryfikuje czy fizyczna płytka jest online.
   *
   * @returns {Promise<IAir | null>}
   */
  public async getCurrentAir(): Promise<IAir | null> {
    return await AirModel.findOne().sort({ createdAt: -1 }).lean();
  }

  /**
   * Pobiera zagregowaną historię pomiarów powietrza dla wykresów w wybranym przedziale czasu.
   * Format odpowiedzi i podział kategorii są spójne z `LightsEnergyService`:
   * - `today` — punkty minutowe `HH:mm` z bieżącego dnia (maksymalnie `MAX_TODAY_POINTS` ostatnich minut),
   * - `week` — średnie dzienne dla dni bieżącego tygodnia od poniedziałku do dziś (`Pn..Nd`),
   * - `month` — średnie tygodniowe dla tygodni bieżącego miesiąca (`Tydz 1..Tydz 4`).
   *
   * @param timeframe - Wybrany przedział czasu ('today', 'week', 'month').
   * @param now - Opcjonalna data odniesienia (ułatwia testy jednostkowe).
   * @returns {Promise<IAirHistoryResponse>}
   */
  public async getAirHistory(
    timeframe: AirTimeframe = 'today',
    now: Date = new Date(),
  ): Promise<IAirHistoryResponse> {
    if (timeframe === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const records = await AirModel.find({ createdAt: { $gte: startOfToday, $lte: now } })
        .sort({ createdAt: 1 })
        .lean();

      const buckets = new Map<string, IAir[]>();
      for (const rec of records) {
        if (!rec.createdAt) continue;
        const label = getTimeString(new Date(rec.createdAt));
        const list = buckets.get(label) ?? [];
        list.push(rec);
        buckets.set(label, list);
      }

      const entries = Array.from(buckets.entries()).slice(-MAX_TODAY_POINTS);
      return this.buildBucketAverages(entries, timeframe);
    }

    if (timeframe === 'week') {
      const currentDayIndex = (now.getDay() + 6) % 7;
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - currentDayIndex,
      );
      const records = await AirModel.find({ createdAt: { $gte: startOfWeek, $lte: now } })
        .sort({ createdAt: 1 })
        .lean();

      const categories = ALL_WEEKDAYS.slice(0, currentDayIndex + 1);
      const buckets = new Map<string, IAir[]>(categories.map((day) => [day, []]));

      for (const rec of records) {
        if (!rec.createdAt) continue;
        const dayIndex = (new Date(rec.createdAt).getDay() + 6) % 7;
        const label = categories[dayIndex];
        if (label) {
          buckets.get(label)?.push(rec);
        }
      }

      return this.buildBucketAverages(Array.from(buckets.entries()), timeframe);
    }

    const currentWeekIndex = Math.min(Math.floor((now.getDate() - 1) / 7), 3);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const records = await AirModel.find({ createdAt: { $gte: startOfMonth, $lte: now } })
      .sort({ createdAt: 1 })
      .lean();

    const categories = ALL_MONTH_WEEKS.slice(0, currentWeekIndex + 1);
    const buckets = new Map<string, IAir[]>(categories.map((week) => [week, []]));

    for (const rec of records) {
      if (!rec.createdAt) continue;
      const weekIndex = Math.min(Math.floor((new Date(rec.createdAt).getDate() - 1) / 7), 3);
      const label = categories[weekIndex];
      if (label) {
        buckets.get(label)?.push(rec);
      }
    }

    return this.buildBucketAverages(Array.from(buckets.entries()), timeframe);
  }

  /**
   * Oblicza średnie wartości temperatury, wilgotności i ciśnienia dla przekazanych przedziałów (bucketów).
   *
   * @param entries - Tablica par [etykieta, pomiary].
   * @param timeframe - Wybrany przedział czasu.
   * @returns {IAirHistoryResponse}
   */
  private buildBucketAverages(
    entries: [string, IAir[]][],
    timeframe: AirTimeframe,
  ): IAirHistoryResponse {
    const categories: string[] = [];
    const temperature: (number | null)[] = [];
    const humidity: (number | null)[] = [];
    const pressure: (number | null)[] = [];

    const avg = (values: number[]): number =>
      Number((values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1));

    for (const [label, items] of entries) {
      categories.push(label);
      if (items.length === 0) {
        temperature.push(null);
        humidity.push(null);
        pressure.push(null);
        continue;
      }

      temperature.push(avg(items.map((item) => item.temperature)));
      humidity.push(avg(items.map((item) => item.humidity)));
      pressure.push(avg(items.map((item) => item.pressure)));
    }

    return {
      timeframe,
      categories,
      temperature,
      humidity,
      pressure,
    };
  }

  /**
   * Czyści całą zapisaną historię pomiarów powietrza z bazy danych.
   *
   * @returns {Promise<{ acknowledged: boolean; deletedCount: number }>}
   */
  public async clearHistory(): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const result = await AirModel.deleteMany({});

    if (this.sseService) {
      this.sseService.broadcast('air', 'history_cleared', { deletedCount: result.deletedCount });
    }

    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
  }
}

export default AirService;
