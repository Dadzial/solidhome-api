import { Schema, model } from 'mongoose';
import { IUser } from '../models/user.model';

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    userName: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    online: { type: Boolean, default: false },
});

export default model<IUser>('User', UserSchema);