import LightScheduleModel from '../../schemas/lights/lights-schedule.schema';
import { ILightSchedule } from '../../models/lights/lights-schedule.model';
import { Types } from 'mongoose';
import logger from '../../../utils/logger';

/**
 * @interface CreateRuleData
 * @description Dane wejściowe do utworzenia nowej reguły harmonogramu oświetlenia.
 */
export interface CreateRuleData {
    name: string;
    days: number[];
    startTime: string;
    endTime: string;
    rooms: string[];
    userId?: Types.ObjectId;
}

/**
 * @class LightsScheduleService
 * @description Serwis odpowiedzialny za zarządzanie regułami harmonogramu oświetlenia (Schedule) w systemie SolidHome.
 * Umożliwia pobieranie, dodawanie, włączanie/wyłączanie oraz usuwanie reguł czasowych.
 */
class LightsScheduleService {
    /**
     * Pobiera listę wszystkich reguł harmonogramu posortowanych od najnowszych.
     *
     * @returns Promise<ILightSchedule[]>
     */
    public async getRules(): Promise<ILightSchedule[]> {
        try {
            return await LightScheduleModel.find()
                .sort({ createdAt: -1 })
                .lean();
        } catch (error) {
            logger.error('[LightsScheduleService] Error fetching schedule rules:', error);
            throw error;
        }
    }

    /**
     * Tworzy nową regułę harmonogramu oświetlenia.
     *
     * @param data - Dane nowej reguły (nazwa, dni, czasy, pokoje, userId)
     * @returns Promise<ILightSchedule> Utworzona reguła
     */
    public async createRule(data: CreateRuleData): Promise<ILightSchedule> {
        try {
            const rule = await LightScheduleModel.create({
                name: data.name,
                days: data.days,
                startTime: data.startTime,
                endTime: data.endTime,
                rooms: data.rooms && data.rooms.length > 0 ? data.rooms : ['entireHouse'],
                active: true,
                userId: data.userId,
            });
            logger.info(`[LightsScheduleService] Created new schedule rule "${rule.name}" (${rule._id})`);
            return rule;
        } catch (error) {
            logger.error('[LightsScheduleService] Error creating schedule rule:', error);
            throw error;
        }
    }

    /**
     * Przełącza status aktywności reguły (lub ustawia zadany stan).
     *
     * @param id - ID reguły
     * @param active - Opcjonalny stan aktywności (jeśli brak, przełącza na przeciwny)
     * @returns Promise<ILightSchedule | null> Zaktualizowana reguła lub null jeśli nie znaleziono
     */
    public async toggleRule(id: string, active?: boolean): Promise<ILightSchedule | null> {
        try {
            if (!Types.ObjectId.isValid(id)) {
                return null;
            }
            const rule = await LightScheduleModel.findById(id);
            if (!rule) {
                return null;
            }
            rule.active = typeof active === 'boolean' ? active : !rule.active;
            await rule.save();
            logger.info(`[LightsScheduleService] Toggled schedule rule "${rule.name}" (${rule._id}) active: ${rule.active}`);
            return rule;
        } catch (error) {
            logger.error(`[LightsScheduleService] Error toggling schedule rule ${id}:`, error);
            throw error;
        }
    }

    /**
     * Usuwa regułę harmonogramu oświetlenia po ID.
     *
     * @param id - ID reguły do usunięcia
     * @returns Promise<boolean> True jeśli usunięto, false jeśli nie znaleziono lub błędny ID
     */
    public async deleteRule(id: string): Promise<boolean> {
        try {
            if (!Types.ObjectId.isValid(id)) {
                return false;
            }
            const result = await LightScheduleModel.deleteOne({ _id: new Types.ObjectId(id) });
            logger.info(`[LightsScheduleService] Deleted schedule rule ${id}, deletedCount: ${result.deletedCount}`);
            return result.deletedCount > 0;
        } catch (error) {
            logger.error(`[LightsScheduleService] Error deleting schedule rule ${id}:`, error);
            throw error;
        }
    }
}

export default LightsScheduleService;
