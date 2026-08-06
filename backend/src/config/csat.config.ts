export const CSAT_CONFIG = Object.freeze({
    SURVEY_EXPIRATION_DAYS: Number(process.env.SURVEY_EXPIRATION_DAYS || 14),
    LOW_RATING_THRESHOLD: Number(process.env.LOW_RATING_THRESHOLD || 2),
    STATS_CACHE_TTL_MS: Number(process.env.CSAT_STATS_CACHE_TTL_MS || 60000) // 60 seconds
} as const);

