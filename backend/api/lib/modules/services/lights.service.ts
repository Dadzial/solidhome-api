import LightModel from '../schemas/lights.schema';
import { ILight } from '../models/lights.model';
import { Types } from 'mongoose';
import logger from '../../utils/logger';
import LightsHistoryService from "./lights-history.service";

/**
 * @const DEFAULT_LIGHTS
 * @description Domyślna lista punktów świetlnych w domu, mapowana 1:1 na wyjścia GPIO w SolidHome.c.
 */
export const DEFAULT_LIGHTS = [
    'living_room',
    'kitchen',
    'boiler_room',
    'bathroom',
    'hallway',
    'garage'
];

/**
 * @class LightsService
 * @description Serwis zarządzający aktualnym stanem punktów świetlnych w systemie SolidHome.
 * Odpowiada za synchronizację sprzętową z mikrokontrolerem NXP, obsługę włączników w aplikacji
 * oraz delegowanie zdarzeń przełączeń do serwisu historii.
 */
class LightsService {

    /**
     * @constructor
     * @param lightsHistoryService - Serwis odpowiedzialny za rejestrowanie historii zdarzeń przełączeń świateł.
     */
    constructor(private lightsHistoryService: LightsHistoryService) {
        this.initDefaultLights();
    }

    /**
     * Inicjalizuje domyślne punkty świetlne w bazie danych przy pierwszym starcie serwera.
     * Dzięki operatorowi $setOnInsert tworzy dokumenty ze stanem 0 tylko jeśli nie istnieją,
     * nie nadpisując włączonych świateł przy kolejnych restartach aplikacji.
     * @private
     */
    private async initDefaultLights() {
        try {
            for (const name of DEFAULT_LIGHTS) {
                await LightModel.updateOne(
                    { name },
                    { $setOnInsert: { state: 0 } },
                    { upsert: true }
                );
            }
        } catch (error) {
            logger.error('Error initializing default lights:', error);
        }
    }

    /**
     * Pobiera stany wszystkich świateł w płaskim formacie klucz-wartość dla mikrokontrolera (SolidHome.c).
     * Zoptymalizowany pod kątem biblioteki cJSON (np. { living_room: 0, kitchen: 1 }).
     *
     * @returns Promise<Record<string, number>>
     */
    public async sendLightsStatusToHardware(): Promise<Record<string, number>> {
        const lights = await LightModel.find({}, 'name state').lean();

        const statusMap: Record<string, number> = {};
        for (const light of lights) {
            statusMap[light.name] = light.state;
        }

        return statusMap;
    }

    /**
     * Pobiera pełną listę świateł dla interfejsu aplikacji użytkownika.
     *
     * @returns Promise<ILight[]>
     */
    public async sendLightsStatusToApps(): Promise<ILight[]> {
        return await LightModel.find().lean();
    }

    /**
     * Zmienia stan fizyczny światła (włącz/wyłącz).
     * Jeśli stan faktycznie uległ zmianie, aktualizuje dokument w bazie i automatycznie
     * rejestruje wpis w historii przez LightsHistoryService.
     *
     * @param name - Nazwa przełączanego światła (np. 'living_room').
     * @param newState - Nowy stan zasilania: 0 (wyłączone) lub 1 (włączone).
     * @param userId - Opcjonalny identyfikator zalogowanego użytkownika dokonującego zmiany.
     * @returns Promise<ILight> Zaktualizowany dokument światła.
     * @throws Error gdy światło o podanej nazwie nie istnieje w bazie.
     */
    public async updateLightState(name: string, newState: number, userId?: Types.ObjectId): Promise<ILight> {
        const light = await LightModel.findOne({ name });
        if (!light) {
            throw new Error(`Light with "${name}" not found`);
        }

        if (light.state !== newState) {
            light.state = newState;
            await light.save();

            await this.lightsHistoryService.addHistoryEntry(name, newState, userId);
        }
        return light;
    }
}

export default LightsService;
