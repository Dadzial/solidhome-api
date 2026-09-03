import { Schema, model } from 'mongoose';
import {ILightHistory} from "../models/lights-history.model";

const LightHistorySchema = new Schema<ILightHistory>({
    name: { type: String, required: true, index: true },
    state: { type: Number, required: true, enum: [0, 1] },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

export default model<ILightHistory>('LightHistory', LightHistorySchema);
