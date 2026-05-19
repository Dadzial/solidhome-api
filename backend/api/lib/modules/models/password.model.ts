import { Types } from 'mongoose';

export interface IPassword {
    userId: Types.ObjectId | string;
    password: string;
}