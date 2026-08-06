import { Response, NextFunction } from 'express';
import { StatsService } from '../services/stats.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { StatsFilterParams } from '../repositories/stats.repository';

export class StatsController {
    private static extractFilters(req: AuthenticatedRequest): StatsFilterParams {
        const filters: StatsFilterParams = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            timezoneOffset: req.headers['x-timezone-offset'] as string || '+00:00',
            technicianId: req.query.technicianId as string,
            department: req.query.department as string,
            category: req.query.category as string,
            priority: req.query.priority as string,
            severity: req.query.severity as string,
            status: req.query.status as string,
        };

        // RBAC: If the user is a technician, force filter to their own tickets unless they have admin rights
        if (req.user?.role !== 'admin') {
            filters.technicianId = req.user?.id;
        }

        return filters;
    }

    public static async getExecutiveKPIs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const filters = StatsController.extractFilters(req);
            const kpis = await StatsService.getExecutiveKPIs(filters);
            res.json(kpis);
        } catch (err) {
            next(err);
        }
    }

    public static async getTicketTrends(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const filters = StatsController.extractFilters(req);
            const trends = await StatsService.getTicketTrends(filters);
            res.json(trends);
        } catch (err) {
            next(err);
        }
    }

    public static async getBreakdowns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const filters = StatsController.extractFilters(req);
            const breakdowns = await StatsService.getBreakdowns(filters);
            res.json(breakdowns);
        } catch (err) {
            next(err);
        }
    }

    public static async getRecentFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const filters = StatsController.extractFilters(req);
            const feedback = await StatsService.getRecentFeedback(filters);
            res.json(feedback);
        } catch (error) {
            next(error);
        }
    }

    public static async getSidebarStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const filters = StatsController.extractFilters(req);
            const stats = await StatsService.getSidebarStats(filters);
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }

    public static async getLeaderboards(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const filters = StatsController.extractFilters(req);
            // Non-admins shouldn't access the full leaderboard, but the UI might handle displaying only them
            // Or if we want to strictly deny access:
            // if (req.user?.role !== 'admin') {
            //    res.status(403).json({ error: 'Forbidden' });
            //    return;
            // }
            const leaderboards = await StatsService.getLeaderboards(filters);
            res.json(leaderboards);
        } catch (err) {
            next(err);
        }
    }

    // Legacy method for older dashboard compatibility
    public static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await StatsService.getStats();
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }
}

