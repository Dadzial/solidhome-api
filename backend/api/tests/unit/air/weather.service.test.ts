import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WeatherService from '../../../lib/modules/services/air/weather.service';
import { config } from '../../../lib/config';

const mockOpenWeatherResponse = {
  name: 'Warszawa',
  sys: {
    country: 'PL',
    sunrise: 1700000000,
    sunset: 1700030000,
  },
  main: {
    temp: 14.26,
    feels_like: 12.84,
    temp_min: 11.12,
    temp_max: 16.58,
    humidity: 62,
    pressure: 1016,
  },
  wind: {
    speed: 4.0,
    deg: 210,
  },
  clouds: {
    all: 40,
  },
  visibility: 10000,
  weather: [
    {
      main: 'Clouds',
      description: 'zachmurzenie umiarkowane',
      icon: '03d',
    },
  ],
};

describe('WeatherService', () => {
  let service: WeatherService;
  const originalApiKey = config.openWeatherMapApiKey;
  const originalDefaultCity = config.defaultCity;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T12:00:00Z'));
    config.openWeatherMapApiKey = 'test_api_key';
    config.defaultCity = 'Warszawa,PL';
    service = new WeatherService();
  });

  afterEach(() => {
    config.openWeatherMapApiKey = originalApiKey;
    config.defaultCity = originalDefaultCity;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should fetch and map weather data from OpenWeatherMap API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOpenWeatherResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await service.getCurrentWeather('pl');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('q=Warszawa%2CPL');
    expect(calledUrl).toContain('appid=test_api_key');
    expect(calledUrl).toContain('units=metric');
    expect(calledUrl).toContain('lang=pl');

    expect(result).toEqual({
      city: 'Warszawa',
      country: 'PL',
      temperature: 14.3,
      feelsLike: 12.8,
      tempMin: 11.1,
      tempMax: 16.6,
      humidity: 62,
      pressure: 1016,
      windSpeed: 14.4,
      windDeg: 210,
      clouds: 40,
      visibility: 10000,
      condition: 'Clouds',
      description: 'zachmurzenie umiarkowane',
      icon: '03d',
      sunrise: 1700000000,
      sunset: 1700030000,
      updatedAt: '2026-11-27T12:00:00.000Z',
    });
  });

  it('should return cached weather within 10 minutes TTL without re-fetching', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOpenWeatherResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await service.getCurrentWeather();
    vi.advanceTimersByTime(5 * 60 * 1000);
    const second = await service.getCurrentWeather();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('should re-fetch weather data after 10 minutes TTL expires', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOpenWeatherResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    await service.getCurrentWeather();
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    await service.getCurrentWeather();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should throw error when OPENWEATHERMAP_API_KEY is not configured', async () => {
    config.openWeatherMapApiKey = undefined;

    await expect(service.getCurrentWeather()).rejects.toThrow(
      'OPENWEATHERMAP_API_KEY is not configured',
    );
  });

  it('should throw error when DEFAULT_CITY is not configured', async () => {
    config.defaultCity = undefined;

    await expect(service.getCurrentWeather()).rejects.toThrow('DEFAULT_CITY is not configured');
  });

  it('should throw error when OpenWeatherMap API responds with non-OK status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Invalid API key'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.getCurrentWeather()).rejects.toThrow(
      'OpenWeatherMap API responded with status 401',
    );
  });
});
