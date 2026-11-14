import { Response } from "express";
import logger from '../../../utils/logger';

/**
 * @interface SseEvent
 * @param domain - Domenę, do której należy zdarzenie (np. 'lights', 'air').
 * @param event - Typ zdarzenia (np. 'lightStateChanged').
 * @param data - Dane związane ze zdarzeniem, mogące być dowolnego typu.
 * @param timestamp - Znacznik czasu w formacie ISO 8601, określający moment wygenerowania zdarzenia.
 * @description Interfejs reprezentujący zdarzenie Server-Sent Events w systemie.
 * Zawiera informacje o domenie, typie zdarzenia, danych oraz znaczniku czasu.
 */
interface SseEvent<T = unknown> {
    domain: 'lights' | 'air' ;
    event: string;
    data: T;
    timestamp: string;
}

/**
 * @interface SseClient
 * @param id - Unikalny identyfikator klienta SSE.
 * @param userId - Opcjonalny identyfikator użytkownika powiązanego z klientem SSE.
 * @param res - Obiekt odpowiedzi Express, używany do wysyłania zdarzeń SSE do klienta.
 * @description Interfejs reprezentujący klienta Server-Sent Events (SSE) w systemie.
 * Zawiera informacje o identyfikatorze klienta, opcjonalnym identyfikatorze użytkownika
 * oraz obiekcie odpowiedzi Express.
 */
interface SseClient {
    id: string;
    userId?: string;
    res: Response
}

/**
 * @class SseService
 */
class SseService {

}
