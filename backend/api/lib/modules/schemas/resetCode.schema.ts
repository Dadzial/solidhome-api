import { Schema, model } from 'mongoose';
import { IResetCode } from '../models/resetCode.model';

const ResetCodeSchema = new Schema<IResetCode>({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    code: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 900 }
});

export default model<IResetCode>('ResetCode', ResetCodeSchema);
