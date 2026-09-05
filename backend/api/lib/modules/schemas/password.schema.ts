import { Schema, model } from 'mongoose';
import { IPassword } from '../models/password.model';
/**
 * @const PasswordSchema
 * @property {Schema.Types.ObjectId} userId - Unikalny identyfikator użytkownika, do którego przypisane jest hasło (relacja do User).
 * @property {String} password - Zahashowane hasło użytkownika.
 * @description Schemat Mongoose przechowujący zahashowane poświadczenia logowania użytkowników.
 */
const PasswordSchema = new Schema<IPassword>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    password: { type: String, required: true }
});

export default model<IPassword>('Password', PasswordSchema);