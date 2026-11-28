/**
 * @interface IWeather
 * @description Model danych reprezentujący dane pogodowe.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (WeatherSchema).
 */
export interface IWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  clouds: number;
  condition: string;
  description: string;
  icon: string;
  updatedAt: string;
}
