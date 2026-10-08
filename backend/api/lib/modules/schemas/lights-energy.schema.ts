import { Schema, model } from 'mongoose';
import { ILightEnergy } from '../models/lights-energy.model';

/**
 * @const LightEnergySchema
 * @property {String} name - Nazwa obszaru lub punktu świetlnego (np. 'entireHouse', 'living_room').
 * @property {'today' | 'week' | 'month'} timeframe - Zakres czasu dla statystyk energii ('today', 'week', 'month').
 * @property {Number} totalKwh - Całkowite zużycie energii w wybranym okresie (kWh).
 * @property {Number[]} chartData - Punkty wartości zużycia dla wykresu ApexCharts.
 * @property {Array} topRooms - Lista pomieszczeń o największym zużyciu (kWh oraz udział procentowy).
 * @property {Map} lightsKwh - Mapa zużycia energii w kWh dla każdego poszczególnego światła.
 * @property {Number} totalHouseKwh - Łączne zużycie energii dla wszystkich obecnych świateł w domu.
 * @description Schemat Mongoose reprezentujący statystyki zużycia energii oświetlenia w systemie SolidHome.
 */
const LightEnergySchema = new Schema<ILightEnergy>({
    name: { type: String, required: true },
    timeframe: { type: String, required: true, enum: ['today', 'week', 'month'] },
    totalKwh: { type: Number, required: true, default: 0 },
    chartData: { type: [Number], required: true, default: [] },
    categories: { type: [String], default: [] },
    topRooms: [{
        name: { type: String, required: true },
        kwh: { type: Number, required: true, default: 0 },
        percentage: { type: Number, required: true, default: 0 }
    }],
    lightsKwh: { type: Map, of: Number, default: {} },
    roomsChartData: { type: Map, of: [Number], default: {} },
    totalHouseKwh: { type: Number, required: true, default: 0 }
}, {
    timestamps: true,
    versionKey: false
});

export default model<ILightEnergy>('LightEnergy', LightEnergySchema);
