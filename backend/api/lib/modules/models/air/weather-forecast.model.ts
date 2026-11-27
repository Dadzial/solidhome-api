/**
 * @interface IWeatherForecastItem
 * @description Pojedynczy punkt prognozy pogody (przedział 3-godzinny z OpenWeatherMap).
 */
export interface IWeatherForecastItem {
  timestamp: number;
  dateTime: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  pop: number;
  condition: string;
  description: string;
  icon: string;
}

/**
 * @interface IWeatherForecast
 * @description Odpowiedź zawierająca prognozę pogody dla wybranego miasta.
 */
export interface IWeatherForecast {
  city: string;
  country: string;
  items: IWeatherForecastItem[];
  updatedAt: string;
}
