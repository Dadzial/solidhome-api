import AirModel from '../../schemas/air/air.schema';
import {IAir} from '../../models/air/air.model';
import logger from '../../../utils/logger';
import MqttService from '../mqtt/mqtt.service';
import SseService from '../sse/sse.service';
import HardwareStatusService from '../hardware/hardware-status.service';

/**
 * @class AirService
 * @description Serwis odpowiedzialny za zarządzanie danymi z czujnika powietrza w systemie SolidHome.
 * Odpowiada za odbiór pomiarów z mikrokontrolera NXP przez MQTT, zapis do bazy danych MongoDB,
 * rozsyłanie aktualizacji na żywo przez SSE oraz weryfikację dostępności fizycznej płytki.
 */
class AirService {
    /**
     * @constructor
     * @param mqttService - Opcjonalny serwis odpowiedzialny za publikowanie zdarzeń MQTT do urządzeń zewnętrznych.
     * @param sseService - Opcjonalny serwis odpowiedzialny za obsługę Server-Sent Events.
     * @param boardStatusService - Opcjonalny serwis monitorujący status obecności fizycznej płytki mikrokontrolera.
     */
    constructor(
        private mqttService?: MqttService,
        private sseService?: SseService,
        private boardStatusService?: HardwareStatusService,
    ) {
        this.initMqttSubscription();
    }

    /**
     * Inicjalizuje subskrypcję MQTT dla czujnika powietrza (solidhome/api/air).
     * @returns {void}
     */
    private initMqttSubscription(): void {
        if (!this.mqttService) {
            return;
        }

        this.mqttService.subscribe<IAir>('air', async (payload) => {
            try {
                if (!payload || typeof payload !== 'object') {
                    return;
                }

                const {temperature, humidity, pressure} = payload;

                if (
                    typeof temperature !== 'number' ||
                    typeof humidity !== 'number' ||
                    typeof pressure !== 'number'
                ) {
                    logger.warn('Error reading air data from MQTT:', payload);
                    return;
                }

                const newMeasurement = await AirModel.create({
                    temperature,
                    humidity,
                    pressure,
                });

                if (this.sseService) {
                    this.sseService.broadcast('air', 'air_updated', newMeasurement);
                }
            } catch (error) {
                logger.error('Error reading air data from MQTT:', error);
            }
        });
    }

    /**
     * Pobiera bieżące parametry powietrza z bazy danych.
     * Weryfikuje czy fizyczna płytka jest online.
     *
     * @returns {Promise<IAir | null>}
     * @throws Error 'hardware_offline' gdy płytka mikrokontrolera nie odpowiada.
     */
    public async getCurrentAir(): Promise<IAir | null> {
        if (this.boardStatusService && !this.boardStatusService.isBoardOnline) {
            throw new Error('hardware_offline');
        }

        return await AirModel.findOne().sort({createdAt: -1}).lean();
    }

    /**
     * Pobiera historię pomiarów dla wykresów.
     * Zwraca dane posortowane chronologicznie od najstarszych do najnowszych.
     *
     * @param limit - Liczba ostatnich punktów (domyślnie 50).
     * @returns Promise<IAir[]>
     */
    public async getAirHistory(limit = 50): Promise<IAir[]> {
        const history = await AirModel.find()
            .sort({createdAt: -1})
            .limit(limit)
            .lean();
        return history.reverse();
    }
}

export default AirService;
