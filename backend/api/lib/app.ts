import {config} from "./config";
import logger from "./utils/logger";
import express from "express"
import mongoose from "mongoose";
import http from "http"
import morgan from "morgan";
import bodyParser from "body-parser";


class App {

    public app: express.Application;
    public server : http.Server

    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.server = http.createServer(this.app);
        this.connectToDatabase();
    }

    private initializeMiddlewares(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(morgan('dev'));
    }

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

    public listen() {
        this.server.listen(config.port, () => {
            logger.info(`Server listening on ${config.port}`);
        })
    }
}

export default App