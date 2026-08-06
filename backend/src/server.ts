import express, { Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { db } from './config/db';
import { supabase } from './config/supabase';
import { securityHeaders, apiLimiter } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';

// Import Route modules
import ticketRoutes from './routes/tickets';
import articleRoutes from './routes/articles';
import statRoutes from './routes/stats';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import sseRoutes from './routes/sse';
import notificationRoutes from './routes/notifications';
import ratingRoutes from './routes/ratings';
import reportRoutes from './routes/reports';

import { SSEController } from './controllers/sse.controller';
import { NotificationService } from './services/notification.service';
import { TicketWorkflowService } from './services/ticketWorkflow.service';
import { CacheService } from './infrastructure/cache/CacheService';
import { CacheInvalidationService } from './services/cacheInvalidation.service';
import { StatsService } from './services/stats.service';

const app = express();

// ─── Security & Global Middleware ─────────────────────────────────────────────
app.use(securityHeaders()); // helmet headers
app.use(cors());
app.use(express.json());

// ─── Serve Uploads (Redirect to Supabase Storage CDN) ──────────────────────────
app.get('/uploads/:filename', async (req: Request, res: Response) => {
    try {
        const filename = req.params.filename as string;
        const { data } = supabase.storage
            .from(ENV.SUPABASE_STORAGE_BUCKET)
            .getPublicUrl(filename);
            
        if (!data || !data.publicUrl) {
            res.status(404).json({ error: 'File not found' });
            return;
        }
        res.redirect(data.publicUrl);
    } catch (err) {
        res.status(404).json({ error: 'File not found' });
    }
});

// ─── Root Endpoint ────────────────────────────────────────────────────────────
app.get('/', (req: Request, res: Response) => {
    if (ENV.NODE_ENV === 'development' && req.accepts('html') !== false) {
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
app.get('/health', async (req: Request, res: Response) => {
    try {
        // Query database to ensure connection is healthy
        await db.query('SELECT 1');

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

// ─── Cache Health & Metrics Endpoint ──────────────────────────────────────────
app.get('/api/v1/system/cache', async (req: Request, res: Response) => {
    try {
        const isHealthy = await CacheService.health();
        const metrics = await CacheService.getMetrics();
        
        res.json({
            status: isHealthy ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            ...metrics
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// ─── Register API v1 Routes (with rate limiting) ──────────────────────────────
app.use('/api/v1/tickets', apiLimiter, ticketRoutes);
app.use('/api/v1/articles', apiLimiter, articleRoutes);
app.use('/api/v1/stats', apiLimiter, statRoutes);
app.use('/api/v1/reports', apiLimiter, reportRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', apiLimiter, userRoutes);
app.use('/api/sse', sseRoutes); // typically outside general rate limits due to persistent connection
app.use('/api/v1/notifications', apiLimiter, notificationRoutes);
app.use('/api/v1/ratings', apiLimiter, ratingRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server (Conditionally for local environments) ──────────────────────

if (ENV.NODE_ENV !== 'production' || !process.env.VERCEL) {
    // Initialize services
    SSEController.initialize();
    NotificationService.initialize();
    TicketWorkflowService.startExpirationCleanupTask();
    
    // Cache Setup
    CacheService.initialize();
    CacheInvalidationService.initialize();
    
    if (ENV.CACHE_WARMUP) {
        console.log('[App] Warming up cache asynchronously...');
        StatsService.getExecutiveKPIs({}).catch(e => console.error(e));
        StatsService.getSidebarStats({}).catch(e => console.error(e));
    }

    app.listen(ENV.PORT, () => {
        console.log(`\n  🎫  IT Support Ticketing Backend (v1)`);
        console.log(`  ──────────────────────────────────────────`);
        console.log(`  Server running at http://localhost:${ENV.PORT}`);
        console.log(`  Environment: ${ENV.NODE_ENV}`);
        console.log(`  Database: Supabase PostgreSQL\n`);
    });
} else {
    // For serverless deployments, initialize once
    SSEController.initialize();
    NotificationService.initialize();
    CacheService.initialize();
    CacheInvalidationService.initialize();
    // Do not run background tasks in serverless
}

export default app;
export { app };
