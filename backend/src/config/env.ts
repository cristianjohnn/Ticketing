import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const ENV = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'attachments',
    
    // Cache & Redis Configuration
    CACHE_PROVIDER: process.env.CACHE_PROVIDER || 'memory',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_USERNAME: process.env.REDIS_USERNAME || '',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
    CACHE_DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
    CACHE_STATS_TTL: parseInt(process.env.CACHE_STATS_TTL || '60', 10),
    CACHE_ANALYTICS_TTL: parseInt(process.env.CACHE_ANALYTICS_TTL || '120', 10),
    CACHE_TICKETS_TTL: parseInt(process.env.CACHE_TICKETS_TTL || '30', 10),
    CACHE_COMPRESSION_ENABLED: process.env.CACHE_COMPRESSION_ENABLED !== 'false',
    CACHE_COMPRESSION_THRESHOLD: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '10240', 10),
    CACHE_WARMUP: process.env.CACHE_WARMUP !== 'false',
    CACHE_VERSION: process.env.CACHE_VERSION || 'v1'
};

// Strict environment configuration validation
const requiredEnvVars: (keyof typeof ENV)[] = [
    'ADMIN_PASSWORD',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_STORAGE_BUCKET'
];

const missingOrInvalid = requiredEnvVars.filter(key => {
    const val = ENV[key];
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    return (
        !trimmed ||
        trimmed.startsWith('<') || 
        trimmed.endsWith('>') ||
        trimmed.toLowerCase().includes('placeholder') ||
        trimmed.toLowerCase().includes('your-')
    );
});

if (missingOrInvalid.length > 0) {
    console.error(`\n❌ [Fatal Error] Missing or invalid configuration for: ${missingOrInvalid.join(', ')}`);
    console.error(`Please check that your environment variables are configured correctly and do not contain placeholders.\n`);
    process.exit(1);
}

// Simple configuration verification log (excluding sensitive password detail)
console.log(`[Config] Loaded environment:
  - Port: ${ENV.PORT}
  - Node Env: ${ENV.NODE_ENV}
  - Database URL Set: ${!!ENV.DATABASE_URL}
  - Supabase URL Set: ${!!ENV.SUPABASE_URL}
  - Supabase Bucket: ${ENV.SUPABASE_STORAGE_BUCKET}
`);
