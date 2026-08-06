import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { RequestHandler } from 'express';

export const securityHeaders = (): RequestHandler => {
    return helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    });
};

// General rate limiter: max 1500 requests per 15 minutes per IP (supports heavy SPA usage + polling)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1500,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for login attempts: max 10 requests per 1 minute per IP
export const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: { error: 'Too many login attempts, please try again after a minute' },
    standardHeaders: true,
    legacyHeaders: false,
});
