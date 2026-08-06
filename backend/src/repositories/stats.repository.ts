import { db } from '../config/db';

export interface StatsFilterParams {
    startDate?: string;
    endDate?: string;
    timezoneOffset?: string; // e.g., '+08:00' or '-05:00'
    technicianId?: string;
    department?: string;
    category?: string;
    priority?: string;
    severity?: string;
    status?: string;
}

export class StatsRepository {
    public static buildWhereClause(filters: StatsFilterParams, prefix: string = ''): { clause: string, values: any[] } {
        let clause = 'WHERE 1=1';
        const values: any[] = [];
        let paramIdx = 1;
        const p = prefix ? `${prefix}.` : '';

        if (filters.startDate) {
            clause += ` AND ${p}"createdAt" >= $${paramIdx++}`;
            values.push(filters.startDate);
        }
        if (filters.endDate) {
            clause += ` AND ${p}"createdAt" <= $${paramIdx++}`;
            values.push(filters.endDate);
        }
        if (filters.technicianId) {
            clause += ` AND (${p}assignee = $${paramIdx} OR ${p}resolving_assignee_id = $${paramIdx})`;
            values.push(filters.technicianId);
            paramIdx++;
        }
        if (filters.department) {
            clause += ` AND ${p}department = $${paramIdx++}`;
            values.push(filters.department);
        }
        if (filters.category) {
            clause += ` AND ${p}category = $${paramIdx++}`;
            values.push(filters.category);
        }
        if (filters.priority) {
            clause += ` AND ${p}priority = $${paramIdx++}`;
            values.push(filters.priority);
        }
        if (filters.severity) {
            clause += ` AND ${p}severity = $${paramIdx++}`;
            values.push(filters.severity);
        }
        if (filters.status) {
            clause += ` AND ${p}status = $${paramIdx++}`;
            values.push(filters.status);
        }

        return { clause, values };
    }

    /**
     * Get Executive Dashboard KPIs
     */
    public static async getExecutiveKPIs(filters: StatsFilterParams) {
        const { clause, values } = this.buildWhereClause(filters);
        const { clause: clauseT, values: valuesT } = this.buildWhereClause(filters, 't');
        
        // Compute previous period dates for comparison
        let prevFilters = { ...filters };
        const msInDay = 24 * 60 * 60 * 1000;
        let diffMs = 30 * msInDay; // Default 30 days
        
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            const end = filters.endDate ? new Date(filters.endDate) : new Date();
            diffMs = end.getTime() - start.getTime();
            prevFilters.endDate = start.toISOString();
            prevFilters.startDate = new Date(start.getTime() - diffMs).toISOString();
        } else {
            const end = new Date();
            prevFilters.endDate = end.toISOString();
            prevFilters.startDate = new Date(end.getTime() - diffMs).toISOString();
        }

        const { clause: prevClause, values: prevValues } = this.buildWhereClause(prevFilters, 'prev_t');
        
        // Adjust parameter indices
        let currentIdx = values.length;
        const adjustedClauseT = clauseT.replace(/\$(\d+)/g, (match, num) => `$${parseInt(num) + currentIdx}`);
        currentIdx += valuesT.length;
        const adjustedPrevClause = prevClause.replace(/\$(\d+)/g, (match, num) => `$${parseInt(num) + currentIdx}`);

        const sql = `
            WITH TicketStats AS (
                SELECT 
                    COUNT(*) as total_tickets,
                    COUNT(*) FILTER (WHERE status = 'Open') as open_tickets,
                    COUNT(*) FILTER (WHERE status = 'Pending') as pending_tickets,
                    COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tickets,
                    COUNT(*) FILTER (WHERE status = 'Resolved') as resolved_tickets,
                    COUNT(*) FILTER (WHERE status = 'Closed') as closed_tickets,
                    SUM(reopen_count) as total_reopens,
                    AVG(EXTRACT(EPOCH FROM (resolved_at - "createdAt"))) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_seconds,
                    AVG(EXTRACT(EPOCH FROM (first_response_at - "createdAt"))) FILTER (WHERE first_response_at IS NOT NULL) as avg_response_time_seconds
                FROM tickets
                ${clause}
            ),
            RatingStats AS (
                SELECT 
                    AVG(r.rating) as overall_csat,
                    COUNT(r.id) as total_ratings,
                    COUNT(t.id) as eligible_surveys
                FROM tickets t
                LEFT JOIN ticket_ratings r ON r.ticket_id = t.id
                ${adjustedClauseT}
                AND (t.status = 'Resolved' OR t.status = 'Closed' OR t.status = 'closed')
            ),
            PrevStats AS (
                SELECT 
                    COUNT(*) as prev_total_tickets,
                    COUNT(*) FILTER (WHERE status = 'Open') as prev_open_tickets,
                    COUNT(*) FILTER (WHERE status = 'Resolved') as prev_resolved_tickets,
                    AVG(EXTRACT(EPOCH FROM (resolved_at - "createdAt"))) FILTER (WHERE resolved_at IS NOT NULL) as prev_avg_resolution_time_seconds
                FROM tickets prev_t
                ${adjustedPrevClause}
            )
            SELECT * FROM TicketStats, RatingStats, PrevStats;
        `;

        const res = await db.query(sql, [...values, ...valuesT, ...prevValues]);
        return res.rows[0];
    }

    /**
     * Get Ticket Volume Trends (grouped by date)
     */
    public static async getTicketTrends(filters: StatsFilterParams) {
        const { clause, values } = this.buildWhereClause(filters);
        
        // Use user timezone to group days correctly. Default to UTC if not provided.
        const tz = filters.timezoneOffset || '+00:00';
        
        const sql = `
            SELECT 
                DATE_TRUNC('day', "createdAt" AT TIME ZONE $${values.length + 1}) as date,
                COUNT(*) as created,
                COUNT(*) FILTER (WHERE status = 'Resolved' OR status = 'Closed') as resolved
            FROM tickets
            ${clause}
            GROUP BY date
            ORDER BY date ASC
        `;
        
        const res = await db.query(sql, [...values, tz]);
        return res.rows;
    }

    /**
     * Get Breakdowns (by category, priority, status)
     */
    public static async getBreakdowns(filters: StatsFilterParams) {
        const { clause, values } = this.buildWhereClause(filters);
        
        const byCategory = await db.query(`SELECT category, COUNT(*) as count FROM tickets ${clause} GROUP BY category`, values);
        const byPriority = await db.query(`SELECT priority, COUNT(*) as count FROM tickets ${clause} GROUP BY priority`, values);
        const byStatus = await db.query(`SELECT status, COUNT(*) as count FROM tickets ${clause} GROUP BY status`, values);
        
        const agingSql = `
            SELECT 
                CASE 
                    WHEN EXTRACT(EPOCH FROM (NOW() - "createdAt")) < 86400 THEN '0-24h'
                    WHEN EXTRACT(EPOCH FROM (NOW() - "createdAt")) < 259200 THEN '1-3d'
                    WHEN EXTRACT(EPOCH FROM (NOW() - "createdAt")) < 604800 THEN '3-7d'
                    ELSE '7d+'
                END as age_group,
                COUNT(*) as count
            FROM tickets
            ${clause ? clause + " AND status NOT IN ('Resolved', 'Closed')" : "WHERE status NOT IN ('Resolved', 'Closed')"}
            GROUP BY age_group
        `;
        const byAging = await db.query(agingSql, values);

        return {
            byCategory: byCategory.rows,
            byPriority: byPriority.rows,
            byStatus: byStatus.rows,
            byAging: byAging.rows
        };
    }

    /**
     * Get Leaderboards
     */
    public static async getLeaderboards(filters: StatsFilterParams) {
        const { clause, values } = this.buildWhereClause(filters, 't');
        
        const sql = `
            WITH TechStats AS (
                SELECT 
                    t.resolving_assignee_id as tech_id,
                    u."fullName" as tech_name,
                    COUNT(t.id) as tickets_resolved,
                    AVG(r.rating) as avg_csat,
                    COUNT(r.id) as total_ratings,
                    AVG(EXTRACT(EPOCH FROM (t.resolved_at - t."createdAt"))) as avg_resolution_time_seconds,
                    SUM(t.reopen_count) as total_reopens
                FROM tickets t
                LEFT JOIN users u ON t.resolving_assignee_id = u.id
                LEFT JOIN ticket_ratings r ON r.ticket_id = t.id
                ${clause} AND t.resolving_assignee_id IS NOT NULL 
                AND (t.status = 'Resolved' OR t.status = 'Closed' OR t.status = 'closed')
                GROUP BY t.resolving_assignee_id, u."fullName"
            )
            SELECT * FROM TechStats WHERE tech_name IS NOT NULL
        `;
        
        const res = await db.query(sql, values);
        return res.rows;
    }

    /**
     * Get Recent Feedback (Tech)
     */
    public static async getRecentFeedback(filters: StatsFilterParams, limit: number = 5) {
        const { clause, values } = this.buildWhereClause(filters, 't');
        
        const sql = `
            SELECT 
                r.id,
                r.rating,
                r.feedback as comment,
                r.created_at as "createdAt",
                t.title as ticket_title,
                t.id as ticket_id
            FROM ticket_ratings r
            JOIN tickets t ON r.ticket_id = t.id
            ${clause}
            ORDER BY r.created_at DESC
            LIMIT $${values.length + 1}
        `;
        
        const res = await db.query(sql, [...values, limit]);
        return res.rows;
    }

    /**
     * Get Sidebar Stats
     */
    public static async getSidebarStats(filters: StatsFilterParams) {
        const { clause, values } = this.buildWhereClause(filters);
        
        const sql = `
            SELECT 
                COUNT(*) as total_tickets,
                COUNT(*) FILTER (WHERE status = 'Open') as open_tickets,
                COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tickets,
                COUNT(*) FILTER (WHERE severity = 'Severe' AND status != 'Resolved' AND status != 'Closed') as severe_tickets,
                COUNT(*) FILTER (WHERE status = 'Resolved' OR status = 'Closed') as resolved_tickets
            FROM tickets
            ${clause}
        `;
        
        const res = await db.query(sql, values);
        
        // Also get average CSAT
        const { clause: clauseT, values: valuesT } = this.buildWhereClause(filters, 't');
        const sqlCsat = `
            SELECT AVG(r.rating) as avg_csat
            FROM tickets t
            JOIN ticket_ratings r ON r.ticket_id = t.id
            ${clauseT}
        `;
        const csatRes = await db.query(sqlCsat, valuesT);

        return {
            ...res.rows[0],
            avg_csat: csatRes.rows[0]?.avg_csat || null
        };
    }
}

