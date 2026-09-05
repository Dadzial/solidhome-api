import { Schema, model } from 'mongoose';
import { ILight } from '../models/lights.model';
/**
 * @const LightSchema
 * @property {String} name - Unikalna nazwa pokoju (np. 'living_room'), mapowana na piny GPIO w SolidHome.c.
 * @property { 0 | 1 } state - Aktualny stan zasilania światła: 0 (wyłączone) lub 1 (włączone).
 * @property {Date} updatedAt - Czas ostatniej zmiany stanu światła generowany przez timestamps.
 * @description Schemat Mongoose reprezentujący bieżący stan punktów świetlnych w systemie SolidHome.
 */
const LightSchema = new Schema<ILight>({
    name: { type: String, required: true, unique: true },
    state: { type: Number, required: true, enum: [0, 1], default: 0 },
}, {
    timestamps: { createdAt: false, updatedAt: true },
});

export default model<ILight>('Light', LightSchema);
