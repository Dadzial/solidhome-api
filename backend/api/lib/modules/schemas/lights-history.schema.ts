import { Schema, model } from 'mongoose';
import {ILightHistory} from "../models/lights-history.model";
/**
 * @const LightHistorySchema
 * @property {String} name - Nazwa przełączonego światła (np. 'living_room').
 * @property { 0 | 1 } state - Zarejestrowany stan światła: 0 (wyłączono) lub 1 (włączono).
 * @property {Schema.Types.ObjectId} userId - Opcjonalny identyfikator użytkownika, który dokonał zmiany (relacja do User).
 * @property {Date} createdAt - Dokładny czas wystąpienia zdarzenia generowany przez timestamps.
 * @description Schemat Mongoose reprezentujący dziennik zdarzeń (logi) przełączeń świateł w systemie.
 */
const LightHistorySchema = new Schema<ILightHistory>({
    name: { type: String, required: true, index: true },
    state: { type: Number, required: true, enum: [0, 1] },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
},{
    timestamps: { createdAt: true, updatedAt: false }
});

export default model<ILightHistory>('LightHistory', LightHistorySchema);
