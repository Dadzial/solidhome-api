import { Types } from 'mongoose';

export interface IToken {
    userId: Types.ObjectId | string;
    createDate: number;
    type: string;
    value: string;
}