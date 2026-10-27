import { Schema, model } from 'mongoose';
import { IToken } from '../../models/user/token.model';
/**
 * @const TokenSchema
 * @property {Schema.Types.ObjectId} userId - Identyfikator zalogowanego użytkownika (relacja do User).
 * @property {Number} createDate - Znacznik czasu utworzenia tokenu w milisekundach.
 * @property {String} type - Typ tokenu ('authorization' dla sesji, 'refresh' dla odświeżania).
 * @property {String} value - Wartość tokenu JWT reprezentująca aktywną sesję.
 * @property {Date} expireAt - Czas wygaśnięcia sesji z indeksem TTL (automatyczne usuwanie dokumentu po wygaśnięciu).
 * @description Schemat Mongoose reprezentujący aktywne sesje autoryzacyjne użytkowników (tokeny JWT).
 */
const TokenSchema = new Schema<IToken>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createDate: { type: Number, required: true },
    type: { type: String, enum: ['authorization', 'refresh'], required: true },
    value: { type: String, required: true },
    expireAt: { type: Date, default: () => new Date(Date.now() + 3600 * 1000), expires: 0 }
});

export default model<IToken>('Token', TokenSchema);