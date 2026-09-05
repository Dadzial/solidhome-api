import { Types } from 'mongoose';

/**
 * @interface IUser
 * @description Model danych reprezentujący konto i profil użytkownika w systemie SolidHome.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (UserSchema).
 */
export interface IUser {
    _id?: Types.ObjectId;
    userName: string;
    email: string;
    active?: boolean;
    online?: boolean;
}