/**
 * @interface ITopRoomEnergy
 * @description Model reprezentujący pomieszczenie o największym udziale w zużyciu energii (sekcja TOP 3).
 */
export interface ITopRoomEnergy {
    name: string;
    percentage: number;
    kwh: number;
}
