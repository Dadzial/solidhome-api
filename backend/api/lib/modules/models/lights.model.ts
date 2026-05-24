import { Types } from 'mongoose';

export interface ILight {
    _id?: Types.ObjectId;
    lightId: number;
    room: string;
    state: number;
    lastUpdatedBy?: Types.ObjectId;
    turnedOnAt?: Date;
    turnedOffAt?: Date;
}
