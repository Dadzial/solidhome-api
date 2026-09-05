import { Types } from 'mongoose';

/**
 * @interface IPassword
 * @description Model danych reprezentujący zahashowane hasło powiązane z kontem użytkownika.
 * Definiuje strukturę typów TypeScript wykorzystywaną przez schemat Mongoose (PasswordSchema).
 */
export interface IPassword {
    userId: Types.ObjectId;
    password: string;
}