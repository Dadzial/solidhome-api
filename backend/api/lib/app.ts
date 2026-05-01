import {config} from "./config";
import logger from "./utils/logger";
import express from "express"
import http from "http"

class App {

    public app: express.Application;
    public server : http.Server

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
    }

    public listen() {
        this.server.listen(config.port, () => {
            logger.info(`Server listening on ${config.port}`);
        })
    }
}

export default App