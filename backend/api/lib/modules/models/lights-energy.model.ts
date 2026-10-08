import { Types } from 'mongoose';
import { ITopRoomEnergy } from './lights-energy-top.model';

export type EnergyTimeframe = 'today' | 'week' | 'month';

/**
 * @interface ILightEnergy
 * @description Model danych reprezentujący statystyki zużycia energii oświetlenia w systemie SolidHome.
 * Dostarcza zużycie dla jednego wybranego światła lub zbiorczo dla wszystkich świateł do budowy wykresu.
 */
export interface ILightEnergy {
    _id?: Types.ObjectId;
    name: string;
    timeframe: EnergyTimeframe;
    totalKwh: number;
    chartData: number[];
    categories?: string[];
    topRooms: ITopRoomEnergy[];
    lightsKwh: Record<string, number>;
    roomsChartData?: Record<string, number[]>;
    totalHouseKwh: number;
    createdAt?: Date;
    updatedAt?: Date;
}
