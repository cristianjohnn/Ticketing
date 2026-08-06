import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { ReportService } from '../services/report.service';
import { StatsFilterParams } from '../repositories/stats.repository';

const router = Router();

router.get('/export/csv', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
    try {
        const filters: StatsFilterParams = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            technicianId: req.query.technicianId as string,
            department: req.query.department as string,
            category: req.query.category as string,
            priority: req.query.priority as string,
            severity: req.query.severity as string,
            status: req.query.status as string,
        };

        // RBAC constraints
        if (req.user?.role !== 'admin') {
            filters.technicianId = req.user?.id;
        }

        await ReportService.streamTicketsCSV(res, filters);
    } catch (error) {
        next(error);
    }
});

router.get('/export/xlsx', requireAuth(), async (req: AuthenticatedRequest, res: Response, next) => {
    try {
        const filters: StatsFilterParams = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            technicianId: req.query.technicianId as string,
            department: req.query.department as string,
            category: req.query.category as string,
            priority: req.query.priority as string,
            severity: req.query.severity as string,
            status: req.query.status as string,
        };

        // RBAC constraints
        if (req.user?.role !== 'admin') {
            filters.technicianId = req.user?.id;
        }

        await ReportService.streamTicketsXLSX(res, filters);
    } catch (err) {
        next(err);
    }
});

export default router;
