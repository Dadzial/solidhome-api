import { Types } from 'mongoose';

/**
 * @interface ILightSchedule
 * @description Model danych reprezentujący pojedynczą regułę harmonogramu oświetlenia (Schedule Rule).
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (LightScheduleSchema).
 */
export interface ILightSchedule {
    _id?: Types.ObjectId;
    name: string;
    days: number[];
    startTime: string;
    endTime: string;
    active: boolean;
    userId?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
