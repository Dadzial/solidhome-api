/**
 * @interface IWeather
 * @description Model danych reprezentujący dane pogodowe.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (WeatherSchema).
 */
export interface IWeather {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  clouds: number;
  visibility: number;
  condition: string;
  description: string;
  icon: string;
  sunrise: number;
  sunset: number;
  updatedAt: string;
}