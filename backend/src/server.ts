import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from './config/env';
import { db } from './config/db';
import { securityHeaders, apiLimiter } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';

// Import Route modules
import ticketRoutes from './routes/tickets';
import articleRoutes from './routes/articles';
import statRoutes from './routes/stats';
import authRoutes from './routes/auth';

const app = express();

// ─── Security & Global Middleware ─────────────────────────────────────────────
app.use(securityHeaders()); // helmet headers
app.use(cors());
app.use(express.json());

// ─── Root Endpoint ────────────────────────────────────────────────────────────
app.get('/', (req: Request, res: Response) => {
    if (ENV.NODE_ENV === 'development' && req.accepts('html')) {
        // Automatically redirect browser requests to Vite Frontend dev server during development
        res.redirect('http://localhost:3001');
    } else {
        res.json({
            message: 'IT Support Ticketing System API (v1)',
            health: '/health',
            api: '/api/v1'
        });
    }
});

// ─── API Health Check Endpoint ───────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
    try {
        // Query database to ensure connection is healthy
        db.prepare('SELECT 1').get();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            env: ENV.NODE_ENV,
            database: 'connected',
            memoryUsage: process.memoryUsage()
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            env: ENV.NODE_ENV,
            database: 'error',
            error: error.message
        });
    }
});

// ─── Register API v1 Routes (with rate limiting) ──────────────────────────────
app.use('/api/v1/tickets', apiLimiter, ticketRoutes);
app.use('/api/v1/articles', apiLimiter, articleRoutes);
app.use('/api/v1/stats', apiLimiter, statRoutes);
app.use('/api/v1/auth', apiLimiter, authRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(ENV.PORT, () => {
    console.log(`\n  🎫  IT Support Ticketing Backend (v1)`);
    console.log(`  ──────────────────────────────────────────`);
    console.log(`  Server running at http://localhost:${ENV.PORT}`);
    console.log(`  Environment: ${ENV.NODE_ENV}`);
    console.log(`  Database path: ${ENV.DB_PATH}\n`);
});
