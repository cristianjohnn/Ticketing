import { Request, Response } from 'express';
import { db } from '../config/db';
import { EventBus } from '../utils/EventBus';

export class NotificationController {
    public static async getUnread(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.query.userId as string;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await db.query(`
                SELECT n.*, u.username as actor_name, u."fullName" as actor_full_name
                FROM notifications n
                LEFT JOIN users u ON n.actor_id = u.id
                WHERE n.recipient_id = $1 AND n.read_at IS NULL
                ORDER BY n.created_at DESC
                LIMIT 50
            `, [userId]);

            res.json(result.rows);
        } catch (err: any) {
            console.error('Error fetching unread notifications:', err);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    public static async getAll(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.query.userId as string;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const limit = parseInt(req.query.limit as string) || 20;
            const cursor = req.query.cursor as string;
            const search = req.query.search as string;
            const filter = req.query.filter as string; // e.g., 'unread', 'transfers', 'collaboration', 'comments', 'assignments', 'system'
            const sort = req.query.sort as string || 'newest'; // 'newest', 'oldest', 'unread_first'

            let queryParams: any[] = [userId];
            let paramIndex = 2;

            // Base where clause for the list
            let listWhereClause = `WHERE n.recipient_id = $1`;

            if (search) {
                listWhereClause += ` AND (n.title ILIKE $${paramIndex} OR n.message ILIKE $${paramIndex} OR u."fullName" ILIKE $${paramIndex} OR n.entity_id ILIKE $${paramIndex})`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            if (filter) {
                if (filter === 'unread') {
                    listWhereClause += ` AND n.read_at IS NULL`;
                } else if (filter === 'transfers') {
                    listWhereClause += ` AND n.type ILIKE '%TRANSFER%'`;
                } else if (filter === 'collaboration') {
                    listWhereClause += ` AND n.type ILIKE '%COLLABORATION%'`;
                } else if (filter === 'comments') {
                    listWhereClause += ` AND n.type = 'NOTE_ADDED'`;
                } else if (filter === 'assignments') {
                    listWhereClause += ` AND n.type IN ('TICKET_CLAIMED', 'TICKET_ASSIGNED')`;
                } else if (filter === 'system') {
                    listWhereClause += ` AND n.type IN ('TICKET_RESOLVED', 'TICKET_REOPENED', 'TICKET_STATUS_UPDATED')`;
                }
            }

            // Handle Cursor Pagination
            if (cursor) {
                try {
                    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
                    const [cursorIsUnreadStr, cursorDateStr, cursorId] = decoded.split('|');
                    const cursorDate = new Date(cursorDateStr);
                    const cursorIsUnread = cursorIsUnreadStr === 'true';

                    // Adjust conditions based on sort
                    if (sort === 'oldest') {
                        listWhereClause += ` AND (n.created_at > $${paramIndex} OR (n.created_at = $${paramIndex} AND n.id > $${paramIndex + 1}))`;
                    } else if (sort === 'unread_first') {
                        // If sorting by unread first:
                        // ORDER BY (read_at IS NULL) DESC, created_at DESC, id DESC
                        if (cursorIsUnread) {
                            listWhereClause += ` AND (
                                (n.read_at IS NULL AND n.created_at < $${paramIndex}) OR
                                (n.read_at IS NULL AND n.created_at = $${paramIndex} AND n.id < $${paramIndex + 1}) OR
                                (n.read_at IS NOT NULL)
                            )`;
                        } else {
                            listWhereClause += ` AND (n.read_at IS NOT NULL) AND (n.created_at < $${paramIndex} OR (n.created_at = $${paramIndex} AND n.id < $${paramIndex + 1}))`;
                        }
                    } else { // newest (default)
                        listWhereClause += ` AND (n.created_at < $${paramIndex} OR (n.created_at = $${paramIndex} AND n.id < $${paramIndex + 1}))`;
                    }
                    queryParams.push(cursorDate, cursorId);
                    paramIndex += 2;
                } catch (e) {
                    console.error('Invalid cursor', e);
                }
            }

            let orderBy = `ORDER BY n.created_at DESC, n.id DESC`;
            if (sort === 'oldest') {
                orderBy = `ORDER BY n.created_at ASC, n.id ASC`;
            } else if (sort === 'unread_first') {
                orderBy = `ORDER BY (n.read_at IS NULL) DESC, n.created_at DESC, n.id DESC`;
            }

            const countsResult = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread,
                    SUM(CASE WHEN type ILIKE '%TRANSFER%' THEN 1 ELSE 0 END) as transfers,
                    SUM(CASE WHEN type ILIKE '%COLLABORATION%' THEN 1 ELSE 0 END) as collaboration,
                    SUM(CASE WHEN type = 'NOTE_ADDED' THEN 1 ELSE 0 END) as comments,
                    SUM(CASE WHEN type IN ('TICKET_CLAIMED', 'TICKET_ASSIGNED') THEN 1 ELSE 0 END) as assignments,
                    SUM(CASE WHEN type IN ('TICKET_RESOLVED', 'TICKET_REOPENED', 'TICKET_STATUS_UPDATED') THEN 1 ELSE 0 END) as system
                FROM notifications
                WHERE recipient_id = $1
            `, [userId]);

            queryParams.push(limit);
            const limitParamIndex = paramIndex++;

            const result = await db.query(`
                SELECT n.*, 
                       u.username as actor_name, 
                       u."fullName" as actor_full_name,
                       t.title as ticket_title,
                       t.status as ticket_status,
                       t.priority as ticket_priority
                FROM notifications n
                LEFT JOIN users u ON n.actor_id = u.id
                LEFT JOIN tickets t ON (n.entity_type = 'ticket' AND n.entity_id = t.id) OR (n.metadata->>'ticketId' = t.id)
                ${listWhereClause}
                ${orderBy}
                LIMIT $${limitParamIndex}
            `, queryParams);

            const counts = {
                all: parseInt(countsResult.rows[0].total) || 0,
                unread: parseInt(countsResult.rows[0].unread) || 0,
                transfers: parseInt(countsResult.rows[0].transfers) || 0,
                collaboration: parseInt(countsResult.rows[0].collaboration) || 0,
                comments: parseInt(countsResult.rows[0].comments) || 0,
                assignments: parseInt(countsResult.rows[0].assignments) || 0,
                system: parseInt(countsResult.rows[0].system) || 0
            };

            let nextCursor = null;
            if (result.rows.length === limit) {
                const lastRecord = result.rows[result.rows.length - 1];
                const isUnread = lastRecord.read_at === null ? 'true' : 'false';
                const createdStr = lastRecord.created_at.toISOString();
                nextCursor = Buffer.from(`${isUnread}|${createdStr}|${lastRecord.id}`).toString('base64');
            }

            res.json({
                data: result.rows,
                counts,
                cursor: nextCursor
            });
        } catch (err: any) {
            console.error('Error fetching all notifications:', err);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    public static async markAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.body.userId as string;
            const notificationId = req.params.id;
            
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const updatedNotification = await db.withTransaction(async (tx) => {
                const result = await tx.query(`
                    UPDATE notifications
                    SET read_at = NOW()
                    WHERE id = $1 AND recipient_id = $2
                    RETURNING *
                `, [notificationId, userId]);

                if (result.rowCount === 0) return null;

                const notification = result.rows[0];

                await EventBus.emit(tx, 'notification.updated', {
                    entityId: notification.id,
                    entityType: 'notification',
                    metadata: {
                        recipientId: userId,
                        notificationId: notification.id,
                        read_at: notification.read_at
                    }
                });

                return notification;
            });

            if (!updatedNotification) {
                res.status(404).json({ error: 'Notification not found' });
                return;
            }

            res.json(updatedNotification);
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }
    
    public static async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.body.userId as string;
            
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            await db.withTransaction(async (tx) => {
                const result = await tx.query(`
                    UPDATE notifications
                    SET read_at = NOW()
                    WHERE recipient_id = $1 AND read_at IS NULL
                    RETURNING id
                `, [userId]);

                if (result.rowCount && result.rowCount > 0) {
                    await EventBus.emit(tx, 'notification.read_all', {
                        entityId: userId,
                        entityType: 'user',
                        metadata: {
                            userId: userId
                        }
                    });
                }
            });

            res.json({ success: true });
        } catch (err: any) {
            console.error('Error marking all notifications as read:', err);
            res.status(500).json({ error: 'Failed to mark notifications as read' });
        }
    }

    public static async markBulkAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.body.userId as string;
            const { ids } = req.body;
            
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'Invalid or empty ids array' });
                return;
            }

            const updatedIds = await db.withTransaction(async (tx) => {
                // Use ANY($2::uuid[]) for the ids list
                const result = await tx.query(`
                    UPDATE notifications
                    SET read_at = NOW()
                    WHERE recipient_id = $1 AND id = ANY($2::uuid[]) AND read_at IS NULL
                    RETURNING id, read_at
                `, [userId, ids]);

                if (result.rowCount && result.rowCount > 0) {
                    // Since it's bulk, we can either emit an event per notification or a bulk event.
                    // For SSE, emitting individually is fine, or we could just emit one read_all type event 
                    // that triggers a refetch of counts, and pass updated IDs.
                    // Let's emit an updated event for each so the store picks it up naturally.
                    for (const row of result.rows) {
                        await EventBus.emit(tx, 'notification.updated', {
                            entityId: row.id,
                            entityType: 'notification',
                            metadata: {
                                recipientId: userId,
                                notificationId: row.id,
                                read_at: row.read_at
                            }
                        });
                    }
                }
                
                return result.rows.map((r: any) => r.id);
            });

            res.json({ success: true, updatedIds });
        } catch (err: any) {
            console.error('Error marking bulk notifications as read:', err);
            res.status(500).json({ error: 'Failed to mark bulk notifications as read' });
        }
    }
}
