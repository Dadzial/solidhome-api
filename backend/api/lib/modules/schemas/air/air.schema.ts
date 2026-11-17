import { Schema, model } from 'mongoose';
import { IAir } from '../../models/air/air.model';

/**
 * @const AirSchema
 * @property {Number} temperature - Aktualna temperatura powietrza w stopniach Celsjusza.
 * @property {Number} humidity - Aktualna wilgotność powietrza w procentach.
 * @property {Number} pressure - Aktualne ciśnienie atmosferyczne w hPa.
 * @property {Date} createdAt - Czas utworzenia rekordu generowany przez timestamps.
 * @description Schemat Mongoose reprezentujący dane z czujnika powietrza w systemie SolidHome.
 */
const AirSchema = new Schema<IAir>(
    {
        temperature: { type: Number, required: true },
        humidity: { type: Number, required: true },
        pressure: { type: Number, required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);
export default model<IAir>('Air', AirSchema);