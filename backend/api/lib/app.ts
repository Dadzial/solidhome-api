import {config} from "./config";
import logger from "./utils/logger";
import express from "express"
import mongoose from "mongoose";
import {corsMiddleware} from "./utils/domains";
import http from "http"
import morgan from "morgan";
import bodyParser from "body-parser";


/**
 * @class App
 * @description Główna klasa aplikacji serwerowej bazującej na frameworku Express.
 * Odpowiada za cykl życia aplikacji: tworzenie instancji serwera HTTP,
 * rejestrację globalnych middleware'ów, nawiązanie połączenia z bazą MongoDB
 * oraz obsługę sygnałów bezpiecznego zamykania procesu (graceful shutdown).
 */
class App {

    /** Instancja aplikacji Express */
    public app: express.Application;
    /** Instancja natywnego serwera HTTP Node.js */
    public server : http.Server

    /**
     * Inicjalizuje aplikację Express, middleware'y, serwer HTTP oraz połączenie z MongoDB.
     */
    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.server = http.createServer(this.app);
        this.connectToDatabase();
    }

    /**
     * Konfiguruje i rejestruje globalne middleware'y w łańcuchu przetwarzania Express
     * (obsługa CORS, parsowanie JSON, body URL-encoded oraz logger żądań morgan).
     * @private
     */
    private initializeMiddlewares(): void {
        this.app.use(corsMiddleware);
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(morgan('dev'));
    }

    /**
     * Nawiązuje asynchroniczne połączenie z bazą danych MongoDB przy użyciu Mongoose.
     * Rejestruje obsługę zdarzeń połączenia (błędy, rozłączenie) oraz przechwytuje
     * sygnały zamknięcia procesu (SIGINT, SIGTERM), aby bezpiecznie zamknąć połączenie.
     * @private
     * @returns Promise<void>
     */
    private async connectToDatabase(): Promise<void> {
        try {
            await mongoose.connect(config.databaseUrl);
            logger.info('Connection with database established');
        } catch (error) {
            logger.error('Error connecting to MongoDB:', error);
        }

        mongoose.connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.info('MongoDB disconnected');
        });
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed due to app termination');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed due to app termination');
            process.exit(0);
        });
    }

    /**
     * Uruchamia nasłuchiwanie serwera HTTP na porcie zdefiniowanym w konfiguracji.
     */
    public listen() {
        this.server.listen(config.port, () => {
            logger.info(`Server listening on ${config.port}`);
        })
    }
}

export default App