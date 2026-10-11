import { Schema, model } from 'mongoose';
import { ILightSchedule } from '../models/lights-schedule.model';

/**
 * @const LightScheduleSchema
 * @property {String} name - Nazwa reguły harmonogramu (np. 'Powrót z pracy').
 * @property {Number[]} days - Dni tygodnia, w których reguła jest aktywna (0 - Poniedziałek, ..., 6 - Niedziela).
 * @property {String} startTime - Godzina rozpoczęcia w formacie 'HH:mm'.
 * @property {String} endTime - Godzina zakończenia w formacie 'HH:mm'.
 * @property {Boolean} active - Flaga określająca czy reguła jest włączona.
 * @property {Schema.Types.ObjectId} userId - Opcjonalny identyfikator użytkownika tworzącego regułę.
 * @description Schemat Mongoose reprezentujący regułę harmonogramu świateł w systemie SolidHome.
 */
const LightScheduleSchema = new Schema<ILightSchedule>(
    {
        name: { type: String, required: true, trim: true },
        days: { type: [Number], required: true, default: [] },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        active: { type: Boolean, required: true, default: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    },
    {
        timestamps: true,
    }
);

export default model<ILightSchedule>('LightSchedule', LightScheduleSchema);
