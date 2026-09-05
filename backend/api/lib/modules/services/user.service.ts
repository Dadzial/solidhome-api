import UserModel  from "../schemas/user.schema";
import { IUser } from "../models/user.model";
import logger from "../../utils/logger";

/**
 * @class UserService
 * @description Serwis odpowiedzialny za tworzenie i wyszukiwanie profili użytkowników w bazie danych MongoDB.
 */
class UserService {

    /**
     * Tworzy nowy profil użytkownika w bazie danych.
     *
     * @param user - Obiekt z danymi użytkownika (np. email, userName).
     * @returns Promise<IUser> Utworzony dokument użytkownika.
     * @throws Error w przypadku niepowodzenia zapisu do bazy danych.
     */
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

    /**
     * Wyszukuje użytkownika po adresie e-mail lub nazwie użytkownika (loginie).
     *
     * @param name - Adres e-mail lub nazwa użytkownika przesłana do wyszukania.
     * @returns Promise<IUser | null> Znaleziony dokument użytkownika lub null, jeśli nie znaleziono dopasowania.
     * @throws Error w przypadku błędu odczytu z bazy danych.
     */
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