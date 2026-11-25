import { Schema, model } from 'mongoose';
import { IWeather } from '../../models/air/weather.model';

/**
 * @const IWeatherSchema
 * @description Schemat Mongoose reprezentujący dane Pogody w systemie SolidHome.
 */
// TODO Do implementacji schemat WeatherSchema
const WeatherSchema = new Schema<IWeather>({

});
export default model<IWeather>('Weather', WeatherSchema);
