import UserModel  from "../schemas/user.schema";
import { IUser } from "../models/user.model";
import logger from "../../utils/logger";

class UserService {
    public async create(user: Partial<IUser>): Promise<IUser> {
        try {
            const dataModel = new UserModel(user);
            const result = await dataModel.save();
            return result.toObject() as IUser;
        } catch (error) {
            logger.error("Error creating data:", error);
            throw new Error('Error creating data');
        }
    }

    public async getByEmailOrName(name:string): Promise<IUser | null> {
        try {
            const result = await UserModel.findOne({ $or: [{ email: name }, { userName: name }] });
            if (result) {
                return result.toObject() as IUser;
            }
            return null;
        }catch (error) {
            logger.error("Error downloading data",error);
            throw new Error('Error downloading data');
        }
    }
}
export default UserService;