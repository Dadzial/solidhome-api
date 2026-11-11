import LightSceneModel from '../../schemas/lights/lights-scene.schema';
import { ILightScene } from '../../models/lights/lights-scene.model';
import { Types } from 'mongoose';
import logger from '../../../utils/logger';

/**
 * @interface CreateSceneData
 * @description Dane wejściowe do utworzenia nowej sceny oświetlenia.
 */
export interface CreateSceneData {
  name: string;
  icon: string;
  rooms: string[];
  userId?: Types.ObjectId;
}

/**
 * @class LightsScenesService
 * @description Serwis odpowiedzialny za zarządzanie scenami oświetlenia (Scenes) w systemie SolidHome.
 * Umożliwia pobieranie, tworzenie, przełączanie stanu aktywności oraz usuwanie scen oświetlenia.
 */
class LightsScenesService {
  /**
   * Pobiera listę wszystkich scen posortowanych od najnowszych.
   *
   * @returns Promise<ILightScene[]>
   */
  public async getScenes(): Promise<ILightScene[]> {
    try {
      return await LightSceneModel.find().sort({ createdAt: -1 }).lean();
    } catch (error) {
      logger.error('[LightsScenesService] Error fetching scenes:', error);
      throw error;
    }
  }

  /**
   * Tworzy nową scenę oświetlenia.
   *
   * @param data - Dane nowej sceny (nazwa, ikona, pokoje, userId)
   * @returns Promise<ILightScene> Utworzona scena
   */
  public async createScene(data: CreateSceneData): Promise<ILightScene> {
    try {
      const scene = await LightSceneModel.create({
        name: data.name,
        icon: data.icon,
        rooms: data.rooms || [],
        active: false,
        userId: data.userId,
      });
      logger.info(`[LightsScenesService] Created new scene "${scene.name}" (${scene._id})`);
      return scene;
    } catch (error) {
      logger.error('[LightsScenesService] Error creating scene:', error);
      throw error;
    }
  }

  /**
   * Przełącza status aktywności sceny (lub ustawia zadany stan).
   *
   * @param id - ID sceny
   * @param active - Opcjonalny stan aktywności (jeśli brak, przełącza na przeciwny)
   * @returns Promise<ILightScene | null> Zaktualizowana scena lub null jeśli nie znaleziono
   */
  public async toggleScene(id: string, active?: boolean): Promise<ILightScene | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      const scene = await LightSceneModel.findById(id);
      if (!scene) {
        return null;
      }
      scene.active = typeof active === 'boolean' ? active : !scene.active;
      await scene.save();
      logger.info(
        `[LightsScenesService] Toggled scene "${scene.name}" (${scene._id}) active: ${scene.active}`,
      );
      return scene;
    } catch (error) {
      logger.error(`[LightsScenesService] Error toggling scene ${id}:`, error);
      throw error;
    }
  }

  /**
   * Usuwa scenę oświetlenia po ID.
   *
   * @param id - ID sceny do usunięcia
   * @returns Promise<boolean> True jeśli usunięto, false jeśli nie znaleziono lub błędny ID
   */
  public async deleteScene(id: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return false;
      }
      const result = await LightSceneModel.findByIdAndDelete(id);
      if (result) {
        logger.info(`[LightsScenesService] Deleted scene "${result.name}" (${id})`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`[LightsScenesService] Error deleting scene ${id}:`, error);
      throw error;
    }
  }
}

export default LightsScenesService;
