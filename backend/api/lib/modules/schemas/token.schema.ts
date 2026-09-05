import { Schema, model } from 'mongoose';
import { IToken } from '../models/token.model';
/**
 * @const TokenSchema
 * @property {Schema.Types.ObjectId} userId - Identyfikator zalogowanego użytkownika (relacja do User).
 * @property {Number} createDate - Znacznik czasu utworzenia tokenu w milisekundach.
 * @property {String} type - Typ tokenu (wartość: 'authorization').
 * @property {String} value - Wartość tokenu JWT reprezentująca aktywną sesję.
 * @property {Date} expireAt - Czas wygaśnięcia sesji z indeksem TTL (automatyczne usunięcie po 3600 s / 1 h).
 * @description Schemat Mongoose reprezentujący aktywne sesje autoryzacyjne użytkowników (tokeny JWT).
 */
const TokenSchema = new Schema<IToken>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createDate: { type: Number, required: true },
    type: { type: String, enum: ['authorization'], required: true },
    value: { type: String, required: true },
    expireAt: { type: Date, default: Date.now, expires: 3600 }
});

export default model<IToken>('Token', TokenSchema);