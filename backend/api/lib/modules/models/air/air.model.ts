import { Types } from 'mongoose';

/**
 * @interface IAir
 * @description Model danych reprezentujący dane z czujnika powietrza.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (AirSchema).
 */
export interface IAir {
  _id?: Types.ObjectId;
  temperature: number;
  humidity: number;
  pressure: number;
  createdAt?: Date;
}

/**
 * Dostępne przedziały czasowe dla zagregowanej historii pomiarów powietrza.
 */
export type AirTimeframe = 'today' | 'week' | 'month';

/**
 * @interface IAirHistoryResponse
 * @description Znormalizowana odpowiedź historii pomiarów powietrza do wyświetlenia na wykresach
 */
export interface IAirHistoryResponse {
  timeframe: AirTimeframe;
  categories: string[];
  temperature: (number | null)[];
  humidity: (number | null)[];
  pressure: (number | null)[];
}
