import { Schema, model } from 'mongoose';
import { ILightsEnergy } from '../models/lights-energy.model';

/**
 * @const LightEnergySchema
 * @property {String} name - Nazwa obszaru lub pomieszczenia (np. 'entireHouse', 'living_room').
 * @property {'today' | 'week' | 'month'} timeframe - Zakres czasu dla statystyk energii.
 * @property {Number} totalKwh - Całkowite zużycie energii w wybranym okresie (kWh).
 * @property {Number[]} chartData - Punkty wartości zużycia dla wykresu.
 * @property {Array} topRooms - Lista pomieszczeń wraz z procentowym udziałem w zużyciu energii.
 * @description Schemat Mongoose reprezentujący statystyki zużycia energii oświetlenia w systemie SolidHome.
 */
const LightEnergySchema = new Schema<ILightsEnergy>({
    name: { type: String, required: true },
    timeframe: { type: String, required: true, enum: ['today', 'week', 'month'] },
    totalKwh: { type: Number, required: true, default: 0 },
    chartData: { type: [Number], required: true, default: [] },
    topRooms: [{
        name: { type: String, required: true },
        percentage: { type: Number, required: true, default: 0 }
    }]
}, {
    timestamps: { createdAt: true, updatedAt: true }
});

export default model<ILightsEnergy>('LightEnergy', LightEnergySchema);
