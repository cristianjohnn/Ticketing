import { db, TxContext } from '../config/db';
import { TicketRating, SubmittedFrom } from '../types/rating.types';
import { DuplicateRatingError } from '../utils/csatErrors';

export interface CreateRatingRecordParams {
    id: string;
    ticketId: string;
    clientId: string;
    technicianId: string | null;
    rating: number;
    feedback?: string | null;
    responseTimeSeconds?: number | null;
    submittedFrom?: SubmittedFrom;
    clientVersion?: string | null;
    device?: string | null;
}

export class RatingRepository {
    /**
     * Map raw database row to TicketRating domain entity
     */
    private static mapRowToRating(row: any): TicketRating {
        return {
            id: row.id,
            ticketId: row.ticket_id,
            clientId: row.client_id,
            technicianId: row.technician_id || null,
            rating: Number(row.rating),
            feedback: row.feedback || null,
            responseTimeSeconds: row.response_time_seconds !== null && row.response_time_seconds !== undefined ? Number(row.response_time_seconds) : null,
            submittedFrom: row.submitted_from as SubmittedFrom,
            clientVersion: row.client_version || null,
            device: row.device || null,
            submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : row.submitted_at,
            createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
            updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
            clientName: row.client_name,
            clientUsername: row.client_username,
            technicianName: row.technician_name,
            technicianUsername: row.technician_username,
            ticketTitle: row.ticket_title
        };
    }

    /**
     * Create a new immutable rating record.
     * Throws DuplicateRatingError if the ticket is already rated before attempting insertion.
     */
    public static async create(params: CreateRatingRecordParams, tx?: TxContext): Promise<TicketRating> {
        const queryRunner = tx || db;

        // Check for existing rating to provide clear domain error before hitting UNIQUE constraint
        const existingRes = await queryRunner.query(
            'SELECT id FROM ticket_ratings WHERE ticket_id = $1',
            [params.ticketId]
        );

        if (existingRes.rows && existingRes.rows.length > 0) {
            throw new DuplicateRatingError(params.ticketId);
        }

        const sql = `
            INSERT INTO ticket_ratings (
                id,
                ticket_id,
                client_id,
                technician_id,
                rating,
                feedback,
                response_time_seconds,
                submitted_from,
                client_version,
                device,
                submitted_at,
                created_at,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW()
            )
            RETURNING *;
        `;

        const values = [
            params.id,
            params.ticketId,
            params.clientId,
            params.technicianId || null,
            params.rating,
            params.feedback || null,
            params.responseTimeSeconds ?? null,
            params.submittedFrom || 'web_portal',
            params.clientVersion || null,
            params.device || null
        ];

        const res = await queryRunner.query(sql, values);
        return this.mapRowToRating(res.rows[0]);
    }

    /**
     * Find a rating by its unique ID
     */
    public static async findById(id: string): Promise<TicketRating | null> {
        const sql = `
            SELECT 
                r.*,
                c."fullName" as client_name,
                c.username as client_username,
                t."fullName" as technician_name,
                t.username as technician_username,
                tk.title as ticket_title
            FROM ticket_ratings r
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN users t ON r.technician_id = t.id
            LEFT JOIN tickets tk ON r.ticket_id = tk.id
            WHERE r.id = $1
        `;
        const res = await db.query(sql, [id]);
        if (!res.rows || res.rows.length === 0) return null;
        return this.mapRowToRating(res.rows[0]);
    }

    /**
     * Find a rating by ticket ID
     */
    public static async findByTicketId(ticketId: string, tx?: TxContext): Promise<TicketRating | null> {
        const queryRunner = tx || db;
        const sql = `
            SELECT 
                r.*,
                c."fullName" as client_name,
                c.username as client_username,
                t."fullName" as technician_name,
                t.username as technician_username,
                tk.title as ticket_title
            FROM ticket_ratings r
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN users t ON r.technician_id = t.id
            LEFT JOIN tickets tk ON r.ticket_id = tk.id
            WHERE r.ticket_id = $1
        `;
        const res = await queryRunner.query(sql, [ticketId]);
        if (!res.rows || res.rows.length === 0) return null;
        return this.mapRowToRating(res.rows[0]);
    }

    /**
     * Find all ratings submitted by a specific client (uses composite index idx_ticket_ratings_client_submitted)
     */
    public static async findByClientId(clientId: string, limit = 50, offset = 0): Promise<TicketRating[]> {
        const sql = `
            SELECT 
                r.*,
                c."fullName" as client_name,
                c.username as client_username,
                t."fullName" as technician_name,
                t.username as technician_username,
                tk.title as ticket_title
            FROM ticket_ratings r
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN users t ON r.technician_id = t.id
            LEFT JOIN tickets tk ON r.ticket_id = tk.id
            WHERE r.client_id = $1
            ORDER BY r.submitted_at DESC
            LIMIT $2 OFFSET $3
        `;
        const res = await db.query(sql, [clientId, limit, offset]);
        return res.rows.map(this.mapRowToRating);
    }

    /**
     * Find all ratings attributed to a specific technician (uses composite index idx_ticket_ratings_technician_submitted)
     */
    public static async findByTechnicianId(technicianId: string, limit = 50, offset = 0): Promise<TicketRating[]> {
        const sql = `
            SELECT 
                r.*,
                c."fullName" as client_name,
                c.username as client_username,
                t."fullName" as technician_name,
                t.username as technician_username,
                tk.title as ticket_title
            FROM ticket_ratings r
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN users t ON r.technician_id = t.id
            LEFT JOIN tickets tk ON r.ticket_id = tk.id
            WHERE r.technician_id = $1
            ORDER BY r.submitted_at DESC
            LIMIT $2 OFFSET $3
        `;
        const res = await db.query(sql, [technicianId, limit, offset]);
        return res.rows.map(this.mapRowToRating);
    }

    /**
     * Find recent feedback comments across all ratings (or filtered by technician)
     */
    public static async findRecentFeedback(limit = 20, technicianId?: string): Promise<TicketRating[]> {
        let sql = `
            SELECT 
                r.*,
                c."fullName" as client_name,
                c.username as client_username,
                t."fullName" as technician_name,
                t.username as technician_username,
                tk.title as ticket_title
            FROM ticket_ratings r
            LEFT JOIN users c ON r.client_id = c.id
            LEFT JOIN users t ON r.technician_id = t.id
            LEFT JOIN tickets tk ON r.ticket_id = tk.id
            WHERE r.feedback IS NOT NULL AND TRIM(r.feedback) != ''
        `;
        const params: any[] = [];

        if (technicianId) {
            params.push(technicianId);
            sql += ` AND r.technician_id = $${params.length}`;
        }

        params.push(limit);
        sql += ` ORDER BY r.submitted_at DESC LIMIT $${params.length}`;

        const res = await db.query(sql, params);
        return res.rows.map(this.mapRowToRating);
    }

    /**
     * Get aggregate statistics across all ratings
     */
    public static async getGlobalCSATAggregates(): Promise<{
        overallAvg: number;
        totalRatings: number;
        distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    }> {
        const sql = `
            SELECT 
                COUNT(*) as total_ratings,
                COALESCE(AVG(rating), 0) as overall_avg,
                COUNT(*) FILTER (WHERE rating = 1) as star_1,
                COUNT(*) FILTER (WHERE rating = 2) as star_2,
                COUNT(*) FILTER (WHERE rating = 3) as star_3,
                COUNT(*) FILTER (WHERE rating = 4) as star_4,
                COUNT(*) FILTER (WHERE rating = 5) as star_5
            FROM ticket_ratings
        `;
        const res = await db.query(sql);
        const row = res.rows[0] || {};
        return {
            overallAvg: Number(parseFloat(row.overall_avg || '0').toFixed(2)),
            totalRatings: Number(row.total_ratings || 0),
            distribution: {
                1: Number(row.star_1 || 0),
                2: Number(row.star_2 || 0),
                3: Number(row.star_3 || 0),
                4: Number(row.star_4 || 0),
                5: Number(row.star_5 || 0)
            }
        };
    }

    /**
     * Get aggregate statistics for a specific technician
     */
    public static async getTechnicianAggregates(technicianId: string): Promise<{
        avgRating: number;
        totalRatings: number;
        distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    }> {
        const sql = `
            SELECT 
                COUNT(*) as total_ratings,
                COALESCE(AVG(rating), 0) as avg_rating,
                COUNT(*) FILTER (WHERE rating = 1) as star_1,
                COUNT(*) FILTER (WHERE rating = 2) as star_2,
                COUNT(*) FILTER (WHERE rating = 3) as star_3,
                COUNT(*) FILTER (WHERE rating = 4) as star_4,
                COUNT(*) FILTER (WHERE rating = 5) as star_5
            FROM ticket_ratings
            WHERE technician_id = $1
        `;
        const res = await db.query(sql, [technicianId]);
        const row = res.rows[0] || {};
        return {
            avgRating: Number(parseFloat(row.avg_rating || '0').toFixed(2)),
            totalRatings: Number(row.total_ratings || 0),
            distribution: {
                1: Number(row.star_1 || 0),
                2: Number(row.star_2 || 0),
                3: Number(row.star_3 || 0),
                4: Number(row.star_4 || 0),
                5: Number(row.star_5 || 0)
            }
        };
    }

    /**
     * Get technician leaderboard summary with ratings counts and averages
     */
    public static async getTechnicianLeaderboard(): Promise<Array<{
        technicianId: string;
        technicianName: string;
        technicianUsername: string;
        avgRating: string;
        ratingsCount: number;
        distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    }>> {
        const sql = `
            SELECT 
                r.technician_id,
                u."fullName" as technician_name,
                u.username as technician_username,
                COUNT(r.id) as ratings_count,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(*) FILTER (WHERE r.rating = 1) as star_1,
                COUNT(*) FILTER (WHERE r.rating = 2) as star_2,
                COUNT(*) FILTER (WHERE r.rating = 3) as star_3,
                COUNT(*) FILTER (WHERE r.rating = 4) as star_4,
                COUNT(*) FILTER (WHERE r.rating = 5) as star_5
            FROM ticket_ratings r
            INNER JOIN users u ON r.technician_id = u.id
            GROUP BY r.technician_id, u."fullName", u.username
            ORDER BY avg_rating DESC, ratings_count DESC, u."fullName" ASC, r.technician_id ASC
        `;
        const res = await db.query(sql);
        return res.rows.map(row => ({
            technicianId: row.technician_id,
            technicianName: row.technician_name || 'Unknown',
            technicianUsername: row.technician_username || 'unknown',
            avgRating: parseFloat(row.avg_rating || '0').toFixed(2),
            ratingsCount: Number(row.ratings_count || 0),
            distribution: {
                1: Number(row.star_1 || 0),
                2: Number(row.star_2 || 0),
                3: Number(row.star_3 || 0),
                4: Number(row.star_4 || 0),
                5: Number(row.star_5 || 0)
            }
        }));
    }

    /**
     * Count total resolved tickets within a date window or globally
     */
    public static async countResolvedTickets(sinceDate?: Date): Promise<number> {
        let sql = `SELECT COUNT(*) as count FROM tickets WHERE resolved_at IS NOT NULL`;
        const params: any[] = [];
        if (sinceDate) {
            params.push(sinceDate.toISOString());
            sql += ` AND resolved_at >= $1`;
        }
        const res = await db.query(sql, params);
        return Number(res.rows[0]?.count || 0);
    }
}
