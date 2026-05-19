import { Types } from 'mongoose';

export interface IToken {
    userId: Types.ObjectId;
    createDate: number;
    type: string;
    value: string;
}