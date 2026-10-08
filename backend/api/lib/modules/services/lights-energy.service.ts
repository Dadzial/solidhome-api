import LightEnergyModel from '../schemas/lights-energy.schema';
import LightModel from '../schemas/lights.schema';
import { ILightEnergy, EnergyTimeframe } from '../models/lights-energy.model';
import { ITopRoomEnergy } from '../models/lights-energy-top.model';
import { DEFAULT_LIGHTS } from './lights.service';
import logger from '../../utils/logger';

/**
 * Moc żarówek (w watach) dla poszczególnych punktów oświetlenia.
 */
const LIGHT_WATTS: Record<string, number> = {
    living_room: 60,
    kitchen: 50,
    garage: 40,
    bathroom: 30,
    hallway: 20,
    boiler_room: 15
};

const MAX_LIVE_POINTS = 20;

/**
 * Zwraca datę w formacie YYYY-MM-DD w lokalnej strefie czasowej.
 */
function getLocalDateString(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Zwraca czas w formacie HH:mm:ss.
 */
function getTimeString(d: Date = new Date()): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

/**
 * @class LightsEnergyService
 * @description Serwis odpowiedzialny za symulowanie i trwały zapis profilu zużycia energii w czasie rzeczywistym.
 * - Gdy światło jest włączone: linia na żywo buduje się w górę (pokazuje aktywny pobór w kW).
 * - Gdy światło zostaje wyłączone: linia natychmiast opada do 0 i biegnie dalej na poziomie 0.
 * - Wszystkie punkty wykresu są trwale zapisywane w MongoDB i NIE znikają po wyłączeniu światła.
 * - Sekcja TOP 3 oraz całkowite kWh dynamicznie zliczają faktycznie zużytą energię.
 */
class LightsEnergyService {
    /** Czas włączenia dla każdego aktualnie świecącego światła */
    private turnedOnTimestamps: Record<string, Date | null> = {};

    constructor() {
        for (const room of DEFAULT_LIGHTS) {
            this.turnedOnTimestamps[room] = null;
        }
    }

    /**
     * Inicjalizuje serię punktów dla widoku czasu rzeczywistego (ostatnie MAX_LIVE_POINTS minut, format HH:mm bez sekund).
     * Tworzy bufor dla całego domu oraz niezależny bufor dla każdego pokoju.
     */
    private initializeLivePoints(record: any, now: Date = new Date()): void {
        const categories: string[] = [];
        const chartData: number[] = [];
        for (let i = MAX_LIVE_POINTS - 1; i >= 0; i--) {
            const t = new Date(now.getTime() - i * 60 * 1000);
            categories.push(getTimeString(t));
            chartData.push(0);
        }
        record.categories = categories;
        record.chartData = chartData;

        const roomsMap: Record<string, number[]> = {};
        for (const room of DEFAULT_LIGHTS) {
            roomsMap[room] = new Array(MAX_LIVE_POINTS).fill(0);
        }
        record.roomsChartData = roomsMap;
    }

    /**
     * Dopisuje lub aktualizuje punkt w czasie rzeczywistym w serii danych.
     * Bufor przesuwa się w formacie HH:mm (bez sekund) zarówno dla całego domu, jak i dla każdego pokoju.
     */
    private appendLivePoint(record: any, lightsStateMap: Record<string, number>, now: Date = new Date()): void {
        const timeStr = getTimeString(now);
        let categories: string[] = Array.isArray(record.categories) ? [...record.categories] : [];
        let chartData: number[] = Array.isArray(record.chartData) ? [...record.chartData] : [];

        const rawRoomsData = record.roomsChartData instanceof Map
            ? Object.fromEntries(record.roomsChartData)
            : { ...(record.roomsChartData || {}) };
        const roomsChartData: Record<string, number[]> = {};
        for (const room of DEFAULT_LIGHTS) {
            roomsChartData[room] = Array.isArray(rawRoomsData[room]) && rawRoomsData[room].length === categories.length
                ? [...rawRoomsData[room]]
                : new Array(categories.length).fill(0);
        }

        if (categories.length === 0 || categories[0]?.length !== 5) {
            this.initializeLivePoints(record, now);
            return;
        }

        let houseActiveKw = 0;
        const roomActiveKw: Record<string, number> = {};
        for (const room of DEFAULT_LIGHTS) {
            const kw = lightsStateMap[room] === 1 ? (LIGHT_WATTS[room] || 40) / 1000 : 0;
            roomActiveKw[room] = Number(kw.toFixed(3));
            houseActiveKw += kw;
        }
        houseActiveKw = Number(houseActiveKw.toFixed(3));

        const lastCategory = categories[categories.length - 1];

        if (lastCategory === timeStr) {
            chartData[chartData.length - 1] = houseActiveKw;
            for (const room of DEFAULT_LIGHTS) {
                roomsChartData[room][roomsChartData[room].length - 1] = roomActiveKw[room];
            }
        } else {
            const [lastH, lastM] = lastCategory.split(':').map(Number);
            const [nowH, nowM] = timeStr.split(':').map(Number);
            const lastTotalMinutes = lastH * 60 + lastM;
            const nowTotalMinutes = nowH * 60 + nowM;
            const diff = nowTotalMinutes - lastTotalMinutes;

            if (diff > MAX_LIVE_POINTS || diff < 0) {
                this.initializeLivePoints(record, now);
                record.chartData[record.chartData.length - 1] = houseActiveKw;
                for (const room of DEFAULT_LIGHTS) {
                    record.roomsChartData[room][record.roomsChartData[room].length - 1] = roomActiveKw[room];
                }
                return;
            } else if (diff > 1) {
                for (let step = 1; step < diff; step++) {
                    const stepDate = new Date(now.getTime() - (diff - step) * 60 * 1000);
                    categories.push(getTimeString(stepDate));
                    chartData.push(0);
                    for (const room of DEFAULT_LIGHTS) {
                        roomsChartData[room].push(0);
                    }
                }
            }
            categories.push(timeStr);
            chartData.push(houseActiveKw);
            for (const room of DEFAULT_LIGHTS) {
                roomsChartData[room].push(roomActiveKw[room]);
            }
        }

        if (chartData.length > MAX_LIVE_POINTS) {
            record.chartData = chartData.slice(-MAX_LIVE_POINTS);
            record.categories = categories.slice(-MAX_LIVE_POINTS);
            for (const room of DEFAULT_LIGHTS) {
                roomsChartData[room] = roomsChartData[room].slice(-MAX_LIVE_POINTS);
            }
        } else {
            record.chartData = chartData;
            record.categories = categories;
        }
        record.roomsChartData = roomsChartData as any;
    }

    /**
     * Zwraca lub tworzy dokument dzienny w bazie danych.
     */
    private async getOrCreateDayRecord(dateStr: string) {
        let record = await LightEnergyModel.findOne({ name: `day_${dateStr}` });
        if (!record) {
            const initialLightsKwh: Record<string, number> = {};
            const initialRoomsChartData: Record<string, number[]> = {};
            for (const room of DEFAULT_LIGHTS) {
                initialLightsKwh[room] = 0;
                initialRoomsChartData[room] = [];
            }

            record = new LightEnergyModel({
                name: `day_${dateStr}`,
                timeframe: 'today',
                totalKwh: 0,
                chartData: [],
                categories: [],
                topRooms: [
                    { name: 'living_room', kwh: 0, percentage: 0 },
                    { name: 'kitchen', kwh: 0, percentage: 0 },
                    { name: 'garage', kwh: 0, percentage: 0 }
                ],
                lightsKwh: initialLightsKwh,
                roomsChartData: initialRoomsChartData,
                totalHouseKwh: 0
            });
            this.initializeLivePoints(record);
            await record.save();
        } else if (!record.chartData || record.chartData.length === 0 || !record.categories || record.categories.length === 0 || record.categories[0]?.length !== 5 || !record.roomsChartData) {
            this.initializeLivePoints(record);
            await record.save();
        }
        return record;
    }

    /**
     * Reaguje na zmianę stanu fizycznego światła (włącz / wyłącz).
     *
     * @param name - Nazwa punktu świetlnego (np. 'living_room')
     * @param newState - 1 (włączone) lub 0 (wyłączone)
     */
    public async accumulateEnergyOnStateChange(name: string, newState: number): Promise<void> {
        try {
            const now = new Date();
            const dateStr = getLocalDateString(now);
            const watts = LIGHT_WATTS[name] || 40;

            const record = await this.getOrCreateDayRecord(dateStr);
            const currentLightsKwh: Record<string, number> = record.lightsKwh instanceof Map
                ? Object.fromEntries(record.lightsKwh)
                : { ...(record.lightsKwh as Record<string, number> || {}) };

            const allLights = await LightModel.find().lean();
            const lightsMap: Record<string, number> = {};
            for (const l of allLights) {
                lightsMap[l.name] = l.state;
            }
            lightsMap[name] = newState;

            let activePowerKw = 0;
            for (const room of DEFAULT_LIGHTS) {
                if (lightsMap[room] === 1) {
                    activePowerKw += (LIGHT_WATTS[room] || 40) / 1000;
                }
            }
            activePowerKw = Number(activePowerKw.toFixed(3));

            if (newState === 1) {
                this.turnedOnTimestamps[name] = now;
                const burstKwh = Number(((watts / 1000) * 0.05).toFixed(4));
                currentLightsKwh[name] = Number(((currentLightsKwh[name] || 0) + burstKwh).toFixed(3));

                this.appendLivePoint(record, lightsMap, now);

                const totalKwh = Number(Object.values(currentLightsKwh).reduce((a, b) => a + b, 0).toFixed(3));
                record.lightsKwh = currentLightsKwh as any;
                record.totalKwh = totalKwh;
                record.totalHouseKwh = totalKwh;
                record.topRooms = this.calculateTopRooms(currentLightsKwh, totalKwh);
                await record.save();

                logger.info(`[LightsEnergyService] "${name}" ON -> active power ${activePowerKw} kW saved to chartData`);
            } else {
                const turnedOnAt = this.turnedOnTimestamps[name];
                if (turnedOnAt) {
                    const elapsedSeconds = Math.max(1, (now.getTime() - turnedOnAt.getTime()) / 1000);
                    const sessionKwh = Number(((watts / 1000) * (elapsedSeconds / 3600) * 10).toFixed(4));
                    currentLightsKwh[name] = Number(((currentLightsKwh[name] || 0) + sessionKwh).toFixed(3));
                    this.turnedOnTimestamps[name] = null;
                }

                this.appendLivePoint(record, lightsMap, now);

                const totalKwh = Number(Object.values(currentLightsKwh).reduce((a, b) => a + b, 0).toFixed(3));
                record.lightsKwh = currentLightsKwh as any;
                record.totalKwh = totalKwh;
                record.totalHouseKwh = totalKwh;
                record.topRooms = this.calculateTopRooms(currentLightsKwh, totalKwh);
                await record.save();

                logger.info(`[LightsEnergyService] "${name}" OFF -> active power ${activePowerKw} kW saved (point drops to 0)`);
            }
        } catch (error) {
            logger.error(`[LightsEnergyService] Error accumulating energy for ${name}:`, error);
        }
    }

    /**
     * Wylicza sekcję TOP 3 największego zużycia wraz z procentami.
     */
    private calculateTopRooms(lightsKwh: Record<string, number>, totalHouseKwh: number): ITopRoomEnergy[] {
        const sorted = Object.entries(lightsKwh)
            .map(([name, kwh]) => ({
                name,
                kwh: Number(kwh.toFixed(2)),
                percentage: totalHouseKwh > 0 ? Math.round((kwh / totalHouseKwh) * 100) : 0
            }))
            .sort((a, b) => b.kwh - a.kwh);

        const top3 = sorted.slice(0, 3);
        while (top3.length < 3) {
            const missing = DEFAULT_LIGHTS.find(r => !top3.some(t => t.name === r)) || 'garage';
            top3.push({ name: missing, kwh: 0, percentage: 0 });
        }
        return top3;
    }

    /**
     * Zwraca statystyki zużycia energii dla pojedynczego światła lub całego domu.
     *
     * @param timeframe - 'today' | 'week' | 'month'
     * @param roomName - 'entireHouse' lub nazwa konkretnego pokoju
     */
    public async getEnergyStats(
        timeframe: EnergyTimeframe = 'today',
        roomName: string = 'entireHouse'
    ): Promise<ILightEnergy> {
        try {
            const now = new Date();
            const dateStr = getLocalDateString(now);

            const currentLights = await LightModel.find().lean();
            const lightsStateMap: Record<string, number> = {};
            for (const light of currentLights) {
                lightsStateMap[light.name] = light.state;
            }

            const dayRecord = await this.getOrCreateDayRecord(dateStr);
            const todayLightsKwh: Record<string, number> = dayRecord.lightsKwh instanceof Map
                ? Object.fromEntries(dayRecord.lightsKwh)
                : { ...(dayRecord.lightsKwh as Record<string, number> || {}) };

            let currentActivePowerKw = 0;
            const targetRooms = (roomName === 'entireHouse' || !LIGHT_WATTS[roomName])
                ? DEFAULT_LIGHTS
                : [roomName];

            let anyLightOn = false;
            for (const r of targetRooms) {
                if (lightsStateMap[r] === 1) {
                    currentActivePowerKw += (LIGHT_WATTS[r] || 40) / 1000;
                    anyLightOn = true;
                }
            }
            currentActivePowerKw = Number(currentActivePowerKw.toFixed(3));

            for (const r of DEFAULT_LIGHTS) {
                if (lightsStateMap[r] === 1 && this.turnedOnTimestamps[r]) {
                    const elapsedSeconds = Math.max(1, (now.getTime() - this.turnedOnTimestamps[r]!.getTime()) / 1000);
                    const liveKwh = Number(((LIGHT_WATTS[r] || 40) / 1000 * (elapsedSeconds / 3600) * 10).toFixed(4));
                    todayLightsKwh[r] = Number(((todayLightsKwh[r] || 0) + liveKwh).toFixed(3));
                }
            }

            const todayTotalHouseKwh = Number(Object.values(todayLightsKwh).reduce((a, b) => a + b, 0).toFixed(2));

            let categories: string[] = [];
            let chartData: number[] = [];

            if (timeframe === 'today') {
                this.appendLivePoint(dayRecord, lightsStateMap, now);

                dayRecord.totalHouseKwh = todayTotalHouseKwh;
                dayRecord.totalKwh = todayTotalHouseKwh;
                dayRecord.topRooms = this.calculateTopRooms(todayLightsKwh, todayTotalHouseKwh);
                dayRecord.lightsKwh = todayLightsKwh as any;
                await dayRecord.save();

                categories = [...dayRecord.categories];
                if (roomName === 'entireHouse') {
                    chartData = [...dayRecord.chartData];
                } else {
                    const rawRooms = dayRecord.roomsChartData instanceof Map
                        ? Object.fromEntries(dayRecord.roomsChartData)
                        : (dayRecord.roomsChartData || {});
                    chartData = Array.isArray(rawRooms[roomName]) ? [...rawRooms[roomName]] : new Array(categories.length).fill(0);
                }
            } else if (timeframe === 'week') {
                const ALL_WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
                const currentDayIndex = (now.getDay() + 6) % 7;
                categories = ALL_WEEKDAYS.slice(0, currentDayIndex + 1);
                chartData = new Array(categories.length).fill(0);

                for (let i = 0; i < currentDayIndex; i++) {
                    const pastDate = new Date(now);
                    pastDate.setDate(now.getDate() - (currentDayIndex - i));
                    const pastRecord = await LightEnergyModel.findOne({ name: `day_${getLocalDateString(pastDate)}` }).lean();

                    if (pastRecord) {
                        if (roomName === 'entireHouse') {
                            chartData[i] = Number(pastRecord.totalHouseKwh.toFixed(2));
                        } else {
                            const map: Record<string, number> = pastRecord.lightsKwh instanceof Map
                                ? Object.fromEntries(pastRecord.lightsKwh)
                                : (pastRecord.lightsKwh as Record<string, number> || {});
                            chartData[i] = Number((map[roomName] || 0).toFixed(2));
                        }
                    } else {
                        chartData[i] = 0;
                    }
                }

                chartData[currentDayIndex] = roomName === 'entireHouse'
                    ? todayTotalHouseKwh
                    : Number((todayLightsKwh[roomName] || 0).toFixed(2));
            } else {
                const ALL_MONTH_WEEKS = ['Tydz 1', 'Tydz 2', 'Tydz 3', 'Tydz 4'];
                const currentWeekIndex = Math.min(Math.floor((now.getDate() - 1) / 7), 3);
                categories = ALL_MONTH_WEEKS.slice(0, currentWeekIndex + 1);
                chartData = new Array(categories.length).fill(0);

                for (let w = 0; w <= currentWeekIndex; w++) {
                    let weekSum = 0;
                    const startDay = w * 7 + 1;
                    const endDay = Math.min((w + 1) * 7, now.getDate());

                    for (let day = startDay; day <= endDay; day++) {
                        const checkDate = new Date(now.getFullYear(), now.getMonth(), day);
                        const checkDateStr = getLocalDateString(checkDate);

                        if (checkDateStr === dateStr) {
                            weekSum += roomName === 'entireHouse' ? todayTotalHouseKwh : (todayLightsKwh[roomName] || 0);
                        } else {
                            const rec = await LightEnergyModel.findOne({ name: `day_${checkDateStr}` }).lean();
                            if (rec) {
                                if (roomName === 'entireHouse') {
                                    weekSum += rec.totalHouseKwh || 0;
                                } else {
                                    const map: Record<string, number> = rec.lightsKwh instanceof Map
                                        ? Object.fromEntries(rec.lightsKwh)
                                        : (rec.lightsKwh as Record<string, number> || {});
                                    weekSum += map[roomName] || 0;
                                }
                            }
                        }
                    }
                    chartData[w] = Number(weekSum.toFixed(2));
                }
            }

            let totalKwh = 0;
            let periodTotalHouseKwh = todayTotalHouseKwh;

            if (timeframe === 'today') {
                totalKwh = roomName === 'entireHouse'
                    ? todayTotalHouseKwh
                    : Number((todayLightsKwh[roomName] || 0).toFixed(2));
            } else {
                totalKwh = Number(chartData.reduce((a, b) => a + b, 0).toFixed(2));
                if (roomName === 'entireHouse') {
                    periodTotalHouseKwh = totalKwh;
                }
            }

            const topRooms = this.calculateTopRooms(todayLightsKwh, periodTotalHouseKwh);

            const result: ILightEnergy = {
                name: roomName,
                timeframe,
                totalKwh,
                chartData,
                categories,
                topRooms,
                lightsKwh: todayLightsKwh,
                totalHouseKwh: periodTotalHouseKwh
            };

            return result;
        } catch (error) {
            logger.error('[LightsEnergyService] Error generating energy stats:', error);
            throw error;
        }
    }
}

export default LightsEnergyService;
