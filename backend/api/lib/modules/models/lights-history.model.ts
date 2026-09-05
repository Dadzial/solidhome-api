import {Types} from 'mongoose';

/**
 * @interface ILightHistory
 * @description Model danych reprezentujący pojedynczy wpis w dzienniku zdarzeń przełączeń świateł.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (LightHistorySchema).
 */
export interface ILightHistory {
    _id?: Types.ObjectId;
    name: string;
    state: number;
    userId?: Types.ObjectId;
    createdAt?: Date;
}