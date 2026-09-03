import { Schema, model } from 'mongoose';
import { ILight } from '../models/lights.model';

const LightSchema = new Schema<ILight>({
    name: { type: String, required: true , unique : true },
    appLabel: { type: String, required: true },
    state : {type : Number , required: true , enum : [0,1] , default: 0 },
},{timestamps: true});

export default model<ILight>('Light', LightSchema);
