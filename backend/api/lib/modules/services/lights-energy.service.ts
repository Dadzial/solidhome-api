import lightsHistoryModel from '../schemas/lights-history.schema';
import LightModel from '../schemas/lights.schema';
import { ILightsEnergy } from '../models/lights-energy.model';
import { DEFAULT_LIGHTS } from './lights.service';
import logger from '../../utils/logger';

/**
 * @const BULB_POWER_KW
 * @description Standardowa moc żarówki LED w kilowatach (10W = 0.01 kW).
 */
const BULB_POWER_KW = 0.01;

/**
 * @class LightsEnergyService
 * @description Serwis odpowiedzialny za obliczanie i zarządzanie statystykami zużycia energii oświetlenia w systemie SolidHome.
 */
class LightsEnergyService {

    /**
     * Oblicza statystyki zużycia energii oświetlenia na podstawie historii przełączeń i bieżącego stanu świateł.
     *
     * @param timeframe - Zakres czasu analizy ('today', 'week', 'month').
     * @param name - Nazwa analizowanego obszaru ('entireHouse' lub nazwa konkretnego pokoju).
     * @returns Promise<ILightsEnergy> Obiekt ze statystykami zużycia energii, danymi wykresu i rankingiem pokoi.
     * @throws Error w przypadku błędu odczytu z bazy danych.
     */
    public async getEnergyStats(
        timeframe: 'today' | 'week' | 'month' = 'today',
        name: string = 'entireHouse'
    ): Promise<ILightsEnergy> {
        try {
            const now = new Date();
            let startDate = new Date();
            let pointsCount = 7;

            if (timeframe === 'today') {
                startDate.setHours(0, 0, 0, 0);
                pointsCount = 7;
            } else if (timeframe === 'week') {
                startDate.setDate(now.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                pointsCount = 7;
            } else if (timeframe === 'month') {
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                pointsCount = 4;
            }

            const allLogs = await lightsHistoryModel.find({ createdAt: { $gte: startDate } }).sort({ createdAt: 1 }).lean();

            const roomHours: Record<string, number> = {};
            DEFAULT_LIGHTS.forEach(r => { roomHours[r] = 0; });

            for (const r of DEFAULT_LIGHTS) {
                const roomLogs = allLogs.filter(l => l.name === r);
                let lastOnTime: Date | null = null;

                for (const log of roomLogs) {
                    if (log.state === 1) {
                        lastOnTime = new Date(log.createdAt!);
                    } else if (log.state === 0 && lastOnTime) {
                        const diffHours = (new Date(log.createdAt!).getTime() - lastOnTime.getTime()) / (1000 * 60 * 60);
                        roomHours[r] += Math.max(0, diffHours);
                        lastOnTime = null;
                    }
                }

                if (lastOnTime) {
                    const diffHours = (now.getTime() - lastOnTime.getTime()) / (1000 * 60 * 60);
                    roomHours[r] += Math.max(0, diffHours);
                }
            }

            let totalHouseKwh = 0;
            const roomConsumption = Object.entries(roomHours).map(([roomName, hours]) => {
                const kwh = hours * BULB_POWER_KW;
                totalHouseKwh += kwh;
                return { name: roomName, kwh };
            });

            const topRooms = roomConsumption.map(item => ({
                name: item.name,
                percentage: totalHouseKwh > 0 ? Math.round((item.kwh / totalHouseKwh) * 100) : 0
            })).sort((a, b) => b.percentage - a.percentage).slice(0, 3);

            const targetRooms = name === 'entireHouse' ? DEFAULT_LIGHTS : [name];
            const currentLights = await LightModel.find({ name: { $in: targetRooms } }).lean();
            const activeBulbsCount = currentLights.filter(l => l.state === 1).length;
            const currentPower = activeBulbsCount * BULB_POWER_KW;

            let currentBucket = 0;
            if (timeframe === 'today') {
                currentBucket = Math.min(Math.floor(now.getHours() / 4), pointsCount - 1);
            } else if (timeframe === 'week') {
                currentBucket = (now.getDay() + 6) % 7;
            } else if (timeframe === 'month') {
                currentBucket = Math.min(Math.floor((now.getDate() - 1) / 7), 3);
            }

            const chartData: (number | null)[] = new Array(pointsCount).fill(null);

            for (let i = 0; i < currentBucket; i++) {
                let pointTime: Date;
                if (timeframe === 'today') {
                    pointTime = new Date(startDate.getTime() + i * 4 * 60 * 60 * 1000);
                } else if (timeframe === 'week') {
                    pointTime = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                } else {
                    pointTime = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                }

                let activeAtPoint = 0;
                for (const r of targetRooms) {
                    const lastLog = allLogs.filter(l => l.name === r && new Date(l.createdAt!) <= pointTime).pop();
                    if (lastLog && lastLog.state === 1) {
                        activeAtPoint++;
                    }
                }
                chartData[i] = Number((activeAtPoint * BULB_POWER_KW).toFixed(2));
            }

            chartData[currentBucket] = Number(currentPower.toFixed(2));

            const targetKwh = name === 'entireHouse' 
                ? totalHouseKwh 
                : (roomHours[name] ?? 0) * BULB_POWER_KW;

            return {
                name,
                timeframe,
                totalKwh: Number(targetKwh.toFixed(3)),
                chartData,
                topRooms
            };
        } catch (error) {
            logger.error('[LightsEnergyService] Error calculating energy stats:', error);
            throw error;
        }
    }
}

export default LightsEnergyService;
