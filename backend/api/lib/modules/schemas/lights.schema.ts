import { Schema, model } from 'mongoose';
import { ILight } from '../models/lights.model';

const LightSchema = new Schema<ILight>({
    lightId: { type: Number, required: true, unique: true },
    room: { type: String, required: true },
    state: { type: Number, enum: [0, 1], default: 0 },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    turnedOnAt: { type: Date },
    turnedOffAt: { type: Date },
}, { timestamps: true });

export default model<ILight>('Light', LightSchema);
