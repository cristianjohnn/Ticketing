import { db } from '../config/db';
import { Stats } from '../types';

const stmtGetStats = db.prepare(`
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN severity = 'Severe' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as severe,
        SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as critical,
        AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as rawAvgRating,
        SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as rated
    FROM tickets
`);

export class StatsService {
    public static getStats(): Stats {
        const row = stmtGetStats.get() as {
            total: number;
            open: number;
            inProgress: number;
            resolved: number;
            severe: number;
            critical: number;
            rawAvgRating: number | null;
            rated: number;
        };

        const avgRating = row.rawAvgRating !== null && row.rawAvgRating !== undefined
            ? Number(row.rawAvgRating).toFixed(1)
            : null;

        return {
            total: row.total || 0,
            open: row.open || 0,
            inProgress: row.inProgress || 0,
            resolved: row.resolved || 0,
            severe: row.severe || 0,
            critical: row.critical || 0,
            avgRating,
            rated: row.rated || 0,
        };
    }
}
