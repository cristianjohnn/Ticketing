import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const ENV = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../../tickets.db'),
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '@inspireSupport',
    NODE_ENV: process.env.NODE_ENV || 'development'
};

// Simple configuration verification log (excluding sensitive password detail)
console.log(`[Config] Loaded environment:
  - Port: ${ENV.PORT}
  - DB Path: ${ENV.DB_PATH}
  - Node Env: ${ENV.NODE_ENV}
`);
