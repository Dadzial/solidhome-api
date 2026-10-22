import LightModel from '../../lib/modules/schemas/lights/lights.schema';
import { DEFAULT_LIGHTS } from '../../lib/modules/services/lights/lights.service';

/**
 * Resetuje stan świateł w bazie MongoDB do wartości domyślnych (wyłączone).
 */
export async function seedDefaultLights(): Promise<void> {
    for (const name of DEFAULT_LIGHTS) {
        await LightModel.updateOne(
            { name },
            { $set: { state: 0 } },
            { upsert: true }
        );
    }
}
