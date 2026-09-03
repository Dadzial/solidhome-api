import {Types} from 'mongoose';

export interface ILightHistory {
    _id?: Types.ObjectId;
    name: string;
    state: number;
    userId?: Types.ObjectId;
    createdAt?: Date;
}