import {config} from "./config";
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
            console.log(`Server listening on ${config.port}`);
        })
    }
}

export default App