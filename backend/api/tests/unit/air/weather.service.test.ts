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
      temperature: 14.3,
      feelsLike: 12.8,
      humidity: 62,
      pressure: 1016,
      windSpeed: 14.4,
      clouds: 40,
      condition: 'Clouds',
      description: 'zachmurzenie umiarkowane',
      icon: '03d',
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

  describe('getWeatherForecast', () => {
    const mockForecastResponse = {
      city: {
        name: 'Warszawa',
        country: 'PL',
      },
      list: [
        {
          dt: 1700010800,
          dt_txt: '2026-11-27 15:00:00',
          main: {
            temp: 15.44,
            feels_like: 14.12,
            humidity: 58,
            pressure: 1015,
          },
          wind: { speed: 3.5 },
          pop: 0.35,
          weather: [
            {
              main: 'Rain',
              description: 'słabe opady deszczu',
              icon: '10d',
            },
          ],
        },
      ],
    };

    it('should fetch and map forecast items from OpenWeatherMap Forecast API', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockForecastResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await service.getWeatherForecast('pl');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = String(fetchMock.mock.calls[0][0]);
      expect(calledUrl).toContain('/data/2.5/forecast');
      expect(calledUrl).toContain('q=Warszawa%2CPL');
      expect(calledUrl).toContain('appid=test_api_key');

      expect(result).toEqual({
        items: [
          {
            timestamp: 1700010800,
            dateTime: '2026-11-27 15:00:00',
            temperature: 15.4,
            condition: 'Rain',
            icon: '10d',
          },
        ],
        updatedAt: '2026-11-27T12:00:00.000Z',
      });
    });

    it('should return cached forecast within 30 minutes TTL without re-fetching', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockForecastResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      const first = await service.getWeatherForecast();
      vi.advanceTimersByTime(15 * 60 * 1000);
      const second = await service.getWeatherForecast();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    it('should re-fetch forecast after 30 minutes TTL expires', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockForecastResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await service.getWeatherForecast();
      vi.advanceTimersByTime(30 * 60 * 1000 + 1);
      await service.getWeatherForecast();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw error when OPENWEATHERMAP_API_KEY is not configured', async () => {
      config.openWeatherMapApiKey = undefined;

      await expect(service.getWeatherForecast()).rejects.toThrow(
        'OPENWEATHERMAP_API_KEY is not configured',
      );
    });

    it('should throw error when DEFAULT_CITY is not configured', async () => {
      config.defaultCity = undefined;

      await expect(service.getWeatherForecast()).rejects.toThrow('DEFAULT_CITY is not configured');
    });

    it('should throw error when OpenWeatherMap Forecast API responds with non-OK status', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: vi.fn().mockResolvedValue('Bad Gateway'),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(service.getWeatherForecast()).rejects.toThrow(
        'OpenWeatherMap Forecast API responded with status 502',
      );
    });
  });
});
