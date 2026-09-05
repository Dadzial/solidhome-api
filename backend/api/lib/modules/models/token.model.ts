import { Types } from 'mongoose';

/**
 * @interface IToken
 * @description Model danych reprezentujący aktywną sesję autoryzacyjną użytkownika (token JWT).
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (TokenSchema).
 */
export interface IToken {
    userId: Types.ObjectId;
    createDate: number;
    type: string;
    value: string;
    expireAt?: Date;
}