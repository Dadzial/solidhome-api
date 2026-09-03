import { Types } from 'mongoose';

export interface ILight {
    _id?: Types.ObjectId;
    name: string;
    appLabel: string;
    state: number;
    updatedAt?: Date;
}
