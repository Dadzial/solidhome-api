import { config } from '../../../config';
import { IWeather } from '../../models/air/weather.model';
import logger from '../../../utils/logger';

/** Czas życia danych pogodowych w pamięci podręcznej (10 minut). */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * @class WeatherService
 * @description Serwis zarządzający danymi o pogodzie w systemie SolidHome.
 */
class WeatherService {
  /** Zapisane dane pogodowe w pamięci podręcznej. */
  private cachedWeather: IWeather | null = null;

  /** Znacznik czasu ostatniego pobrania danych pogodowych. */
  private cachedAt = 0;

  /**
   * Pobiera aktualne dane pogodowe dla domyślnego miasta z serwisu OpenWeatherMap.
   *
   * @param lang
   * @returns {Promise<IWeather>} Zwraca aktualne dane pogodowe dla domyślnego miasta.
   * @throws {Error} W przypadku braku klucza API lub błędu w odpowiedzi z OpenWeatherMap.
   */
  public async getCurrentWeather(lang: 'pl' | 'en' = 'pl'): Promise<IWeather> {
    const now = Date.now();

    if (this.cachedWeather && now - this.cachedAt < CACHE_TTL_MS) {
      return this.cachedWeather;
    }

    const apiKey = config.openWeatherMapApiKey;
    if (!apiKey) {
      throw new Error('OPENWEATHERMAP_API_KEY is not configured');
    }

    const defaultCity = config.defaultCity;
    if (!defaultCity) {
      throw new Error('DEFAULT_CITY is not configured');
    }

    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('q', defaultCity);
    url.searchParams.set('appid', apiKey);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', lang);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OpenWeatherMap API error (${response.status}): ${errorText}`);
      throw new Error(`OpenWeatherMap API responded with status ${response.status}`);
    }

    const rawData = await response.json();

    const weather: IWeather = {
      city: rawData.name,
      country: rawData.sys?.country ?? '',
      temperature: Number(rawData.main.temp.toFixed(1)),
      feelsLike: Number(rawData.main.feels_like.toFixed(1)),
      tempMin: Number(rawData.main.temp_min.toFixed(1)),
      tempMax: Number(rawData.main.temp_max.toFixed(1)),
      humidity: rawData.main.humidity,
      pressure: rawData.main.pressure,
      windSpeed: Number(((rawData.wind?.speed ?? 0) * 3.6).toFixed(1)),
      windDeg: rawData.wind?.deg ?? 0,
      clouds: rawData.clouds?.all ?? 0,
      visibility: rawData.visibility ?? 0,
      condition: rawData.weather?.[0]?.main ?? '',
      description: rawData.weather?.[0]?.description ?? '',
      icon: rawData.weather?.[0]?.icon ?? '',
      sunrise: rawData.sys?.sunrise ?? 0,
      sunset: rawData.sys?.sunset ?? 0,
      updatedAt: new Date().toISOString(),
    };

    this.cachedWeather = weather;
    this.cachedAt = now;

    return weather;
  }
}
export default WeatherService;
