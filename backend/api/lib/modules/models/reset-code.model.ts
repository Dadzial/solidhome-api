import { Types } from 'mongoose';

/**
 * @interface IResetCode
 * @description Model danych reprezentujący tymczasowy kod weryfikacyjny do procedury resetu hasła.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (ResetCodeSchema).
 */
export interface IResetCode {
    _id?: Types.ObjectId;
    userId: Types.ObjectId;
    code: string;
    createdAt?: Date;
}
