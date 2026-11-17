import { Types } from 'mongoose';
/**
 * @interface ILight
 * @description Model danych reprezentujący pojedyncze światło w systemie.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (LightSchema).
 */
export interface ILight {
  _id?: Types.ObjectId;
  name: string;
  state: number;
  updatedAt?: Date;
}
