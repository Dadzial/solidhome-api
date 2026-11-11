import { Schema, model } from 'mongoose';
import { ILightScene } from '../../models/lights/lights-scene.model';

/**
 * @const LightSceneSchema
 * @property {String} name - Nazwa sceny (np. 'Wieczór filmowy').
 * @property {String} icon - Ścieżka do ikony SVG sceny.
 * @property {String[]} rooms - Pomieszczenia objęte sceną (np. ['living_room', 'kitchen']).
 * @property {Boolean} active - Flaga określająca czy scena jest obecnie aktywna.
 * @property {Schema.Types.ObjectId} userId - Opcjonalny identyfikator użytkownika tworzącego scenę.
 * @description Schemat Mongoose reprezentujący scenę oświetlenia w systemie SolidHome.
 */
const LightSceneSchema = new Schema<ILightScene>(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    rooms: { type: [String], required: true, default: [] },
    active: { type: Boolean, required: true, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  },
  {
    timestamps: true,
  },
);

export default model<ILightScene>('LightScene', LightSceneSchema);
