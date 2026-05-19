import { Schema, model } from 'mongoose';
import { IToken } from '../models/token.model';

export const TokenType = {
    AUTHORIZATION: 'authorization',
} as const;

export type TokenTypeValue = typeof TokenType[keyof typeof TokenType];

const tokenTypes = Object.values(TokenType);

const TokenSchema = new Schema<IToken>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createDate: { type: Number, required: true },
    type: { type: String, enum: tokenTypes, required: true },
    value: { type: String, required: true }
});

export default model<IToken>('Token', TokenSchema);