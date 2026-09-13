import UserModel  from "../schemas/user.schema";
import {IUser} from "../models/user.model";
import logger from "../../utils/logger";
import {Types} from "mongoose";

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
     * Wyszukuje użytkownika po identyfikatorze ID.
     *
     * @param id - Identyfikator użytkownika w bazie MongoDB.
     * @returns Promise<IUser | null> Znaleziony dokument użytkownika lub null.
     */
    public async getById(id: string | Types.ObjectId): Promise<IUser | null> {
        try {
            const result = await UserModel.findById(id);
            if (result) {
                return result.toObject() as IUser;
            }
            return null;
        } catch (error) {
            logger.error(`Error getting user by id ${id}:`, error);
            throw new Error('Error downloading data');
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

    /**
     * Aktualizuje dane użytkownika w bazie danych na podstawie jego id
     *
     * @param userId - ID użytkownika w bazie mongoDB
     * @param data - Obiekt z danymi do aktualizacji
     */
    public async update(userId: string | Types.ObjectId, data:  Partial<IUser> ): Promise<IUser | null> {
        try {
            const result = await UserModel.findByIdAndUpdate(
                userId,
                { $set: data },
                { new: true , runValidators: true }
            );
            return result ? (result.toObject() as IUser) : null;
        } catch (error) {
            logger.error("Error updating user:", error);
            throw error;
        }
    }

    /**
     * Metoda pomocnicza sprawdzająca, czy podana nazwa użytkownika lub email nie jest już zajęty
     *
     * @param userId - ID użytkownika w bazie mongoDB
     * @param email - email użytkownika w bazie mongoDB
     * @param userName - nazwa użytkownika w bazie mongoDB
     */
    public async isEmailOrNameTakenByOther(userId: string | Types.ObjectId, email?: string, userName?: string): Promise<boolean> {
        const conditions: any[] = [];
        if (email) conditions.push({ email });
        if (userName) conditions.push({ userName });
        if (conditions.length === 0) return false;

        const existing = await UserModel.findOne({
            _id: { $ne: userId },
            $or: conditions
        });
        return !!existing;
    }
}
export default UserService;