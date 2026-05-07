import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: process.env.API_PORT,
    databaseUrl: process.env.API_DATABASE_URL
}