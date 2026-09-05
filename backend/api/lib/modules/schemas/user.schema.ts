import { Schema, model } from 'mongoose';
import { IUser } from '../models/user.model';
/**
 * @const UserSchema
 * @property {String} email - Unikalny adres e-mail użytkownika używany do logowania i powiadomień.
 * @property {String} userName - Unikalna nazwa użytkownika (login) w systemie.
 * @property {Boolean} active - Status aktywności konta użytkownika (domyślnie: true).
 * @property {Boolean} online - Status obecności użytkownika w aplikacji (domyślnie: false).
 * @description Schemat Mongoose definiujący profil konta użytkownika w systemie SolidHome.
 */
const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    userName: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    online: { type: Boolean, default: false },
});

export default model<IUser>('User', UserSchema);