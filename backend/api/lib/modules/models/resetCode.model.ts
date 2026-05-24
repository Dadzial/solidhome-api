import { Types } from 'mongoose';

export interface IResetCode {
    _id?: Types.ObjectId;
    userId: Types.ObjectId;
    code: string;
    createdAt?: Date;
}
