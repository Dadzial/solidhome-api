import LightScheduleModel from '../schemas/lights-schedule.schema';
import { ILightSchedule } from '../models/lights-schedule.model';
import { Types } from 'mongoose';
import logger from '../../utils/logger';

/**
 * @interface CreateRuleData
 * @description Dane wejściowe do utworzenia nowej reguły harmonogramu oświetlenia.
 */
export interface CreateRuleData {
    name: string;
    days: number[];
    startTime: string;
    endTime: string;
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
     * @param data - Dane nowej reguły (nazwa, dni, czasy, userId)
     * @returns Promise<ILightSchedule> Utworzona reguła
     */
    public async createRule(data: CreateRuleData): Promise<ILightSchedule> {
        try {
            const rule = await LightScheduleModel.create({
                name: data.name,
                days: data.days,
                startTime: data.startTime,
                endTime: data.endTime,
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
     * Przełącza status aktywności reguły (włączona / wyłączona).
     *
     * @param id - Identyfikator reguły
     * @param active - Opcjonalny docelowy stan (jeśli brak, stan zostaje odwrócony)
     * @returns Promise<ILightSchedule> Zaktualizowana reguła
     */
    public async toggleRule(id: string, active?: boolean): Promise<ILightSchedule> {
        try {
            const rule = await LightScheduleModel.findById(id);
            if (!rule) {
                throw new Error(`Schedule rule with id "${id}" not found`);
            }

            rule.active = active !== undefined ? active : !rule.active;
            await rule.save();
            logger.info(`[LightsScheduleService] Toggled schedule rule "${rule.name}" -> active: ${rule.active}`);
            return rule;
        } catch (error) {
            logger.error(`[LightsScheduleService] Error toggling rule "${id}":`, error);
            throw error;
        }
    }

    /**
     * Usuwa wybraną regułę harmonogramu.
     *
     * @param id - Identyfikator reguły do usunięcia
     * @returns Promise<{ acknowledged: boolean; deletedCount: number }>
     */
    public async deleteRule(id: string): Promise<{ acknowledged: boolean; deletedCount: number }> {
        try {
            const result = await LightScheduleModel.deleteOne({ _id: new Types.ObjectId(id) });
            logger.info(`[LightsScheduleService] Deleted schedule rule "${id}"`);
            return {
                acknowledged: result.acknowledged,
                deletedCount: result.deletedCount,
            };
        } catch (error) {
            logger.error(`[LightsScheduleService] Error deleting schedule rule "${id}":`, error);
            throw error;
        }
    }
}

export default LightsScheduleService;
