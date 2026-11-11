import { Types } from 'mongoose';

/**
 * @interface ILightScene
 * @description Model danych reprezentujący scenę oświetlenia (Scene).
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (LightSceneSchema).
 */
export interface ILightScene {
  _id?: Types.ObjectId;
  name: string;
  icon: string;
  rooms: string[];
  active?: boolean;
  userId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
