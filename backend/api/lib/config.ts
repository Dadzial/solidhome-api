import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: process.env.API_PORT,
    databaseUrl: process.env.API_DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    npx_ip : process.env.NXP_BOARD_IP,
}