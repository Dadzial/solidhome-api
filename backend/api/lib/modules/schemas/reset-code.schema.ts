import { Schema, model } from 'mongoose';
import { IResetCode } from '../models/reset-code.model';
/**
 * @const ResetCodeSchema
 * @property {Schema.Types.ObjectId} userId - Identyfikator użytkownika wnioskującego o reset hasła (relacja do User).
 * @property {String} code - Unikalny, 6-cyfrowy kod weryfikacyjny wysyłany na e-mail.
 * @property {Date} createdAt - Czas wygenerowania kodu z indeksem TTL (automatyczne wygasanie po 900 s / 15 min).
 * @description Schemat Mongoose przechowujący jednorazowe kody weryfikacyjne do procedury resetowania hasła.
 */
const ResetCodeSchema = new Schema<IResetCode>({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    code: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 900 }
});

export default model<IResetCode>('ResetCode', ResetCodeSchema);
