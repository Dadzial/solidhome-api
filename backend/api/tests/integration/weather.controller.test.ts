import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import WeatherController from '../../lib/controllers/weather.controller';
import WeatherService from '../../lib/modules/services/air/weather.service';
import { IWeather } from '../../lib/modules/models/air/weather.model';
import { IWeatherForecast } from '../../lib/modules/models/air/weather-forecast.model';
import { createTestUser, TestUserContext } from '../helpers/auth.helper';

describe('WeatherController (Integration)', () => {
  let app: express.Application;
  let weatherController: WeatherController;
  let mockWeatherService: Partial<WeatherService>;
  let testUserCtx: TestUserContext;

  const sampleWeather: IWeather = {
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
  };

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    testUserCtx = await createTestUser();

    mockWeatherService = {
      getCurrentWeather: vi.fn(),
      getWeatherForecast: vi.fn(),
    };

    weatherController = new WeatherController(mockWeatherService as WeatherService);
    app.use(weatherController.router);
  });

  describe('GET /api/weather/current', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app).get('/api/weather/current');
      expect(response.status).toBe(401);
    });

    it('should return 200 OK with current weather data when authenticated', async () => {
      vi.mocked(mockWeatherService.getCurrentWeather!).mockResolvedValueOnce(sampleWeather);

      const response = await request(app)
        .get('/api/weather/current')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(sampleWeather);
      expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledTimes(1);
    });

    it('should return 500 Internal Server Error when WeatherService throws', async () => {
      vi.mocked(mockWeatherService.getCurrentWeather!).mockRejectedValueOnce(
        new Error('OpenWeatherMap API responded with status 500'),
      );

      const response = await request(app)
        .get('/api/weather/current')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch weather data');
    });
  });

  describe('GET /api/weather/forecast', () => {
    const sampleForecast: IWeatherForecast = {
      city: 'Warszawa',
      country: 'PL',
      items: [
        {
          timestamp: 1700010800,
          dateTime: '2026-11-27 15:00:00',
          temperature: 15.4,
          feelsLike: 14.1,
          humidity: 58,
          pressure: 1015,
          windSpeed: 12.6,
          pop: 35,
          condition: 'Rain',
          description: 'słabe opady deszczu',
          icon: '10d',
        },
      ],
      updatedAt: '2026-11-27T12:00:00.000Z',
    };

    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app).get('/api/weather/forecast');
      expect(response.status).toBe(401);
    });

    it('should return 200 OK with weather forecast when authenticated', async () => {
      vi.mocked(mockWeatherService.getWeatherForecast!).mockResolvedValueOnce(sampleForecast);

      const response = await request(app)
        .get('/api/weather/forecast')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(sampleForecast);
      expect(mockWeatherService.getWeatherForecast).toHaveBeenCalledTimes(1);
    });

    it('should return 500 Internal Server Error when WeatherService throws', async () => {
      vi.mocked(mockWeatherService.getWeatherForecast!).mockRejectedValueOnce(
        new Error('OpenWeatherMap Forecast API responded with status 500'),
      );

      const response = await request(app)
        .get('/api/weather/forecast')
        .set('Authorization', `Bearer ${testUserCtx.token}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch weather forecast');
    });
  });
});
