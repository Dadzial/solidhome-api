import { Types } from 'mongoose';
/**
 * @interface ILightsEnergy
 * @description Model danych reprezentujący statystyki zużycia energii oświetlenia w systemie SolidHome.
 */
export interface ILightsEnergy {
    _id?: Types.ObjectId;
    name: string;
    timeframe: 'today' | 'week' | 'month';
    totalKwh: number;
    chartData: (number | null)[];
    topRooms: {
        _id?: Types.ObjectId;
        name: string;
        percentage: number;
    }[];
}

