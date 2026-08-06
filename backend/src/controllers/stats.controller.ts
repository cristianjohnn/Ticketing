import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/stats.service';

export class StatsController {
    public static getStats(req: Request, res: Response, next: NextFunction): void {
        try {
            const stats = StatsService.getStats();
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }
}
