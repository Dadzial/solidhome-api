/**
 * @interface IWeatherForecastItem
 * @description Pojedynczy punkt prognozy pogody (przedział 3-godzinny z OpenWeatherMap).
 */
export interface IWeatherForecastItem {
  timestamp: number;
  dateTime: string;
  temperature: number;
  condition: string;
  icon: string;
}

/**
 * @interface IWeatherForecast
 * @description Odpowiedź zawierająca prognozę pogody dla wybranego miasta.
 */
export interface IWeatherForecast {
  items: IWeatherForecastItem[];
  updatedAt: string;
}
