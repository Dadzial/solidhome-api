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
