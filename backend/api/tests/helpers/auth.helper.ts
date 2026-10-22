import { Types } from 'mongoose';
import UserModel from '../../lib/modules/schemas/user/user.schema';
import PasswordModel from '../../lib/modules/schemas/user/password.schema';
import TokenModel from '../../lib/modules/schemas/user/token.schema';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../lib/config';

export interface TestUserContext {
    user: any;
    token: string;
    tokenDoc: any;
    rawPassword: string;
}

/**
 * Tworzy użytkownika testowego wraz z hasłem i ważnym tokenem sesji w bazie MongoDB.
 */
export async function createTestUser(customData?: Partial<{ email: string; userName: string; password: string }>): Promise<TestUserContext> {
    const rawPassword = customData?.password || 'Secret123!';
    const email = customData?.email || `test_${Date.now()}@example.com`;
    const userName = customData?.userName || `user_${Date.now()}`;

    const user = await UserModel.create({
        email,
        userName
    });

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    await PasswordModel.create({
        userId: user._id,
        password: hashedPassword
    });

    const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        userName: user.userName,
        access: 'auth'
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1h' });

    const tokenDoc = await TokenModel.create({
        userId: user._id,
        type: 'authorization',
        value: token,
        createDate: Date.now()
    });

    return {
        user,
        token,
        tokenDoc,
        rawPassword
    };
}
