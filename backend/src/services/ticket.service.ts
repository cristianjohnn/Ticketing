import { db } from '../config/db';
import { EventBus } from '../utils/EventBus';
import { Ticket, Note, Attachment } from '../types';
import { TicketWorkflowService } from './ticketWorkflow.service';

export class TicketService {
    private static formatNoteTime(time: any): string {
        if (time instanceof Date) {
            // Note: Use a clean date representation for note list (toLocaleString)
            return time.toLocaleString();
        }
        return String(time);
    }

    private static formatAttachmentUploadedAt(uploadedAt: any): string {
        if (uploadedAt instanceof Date) {
            return uploadedAt.toISOString();
        }
        return String(uploadedAt);
    }

    public static async getAll(filters: {
        status?: string;
        priority?: string;
        severity?: string;
        department?: string;
        search?: string;
        userId?: string;
        filterByCollaborator?: string;
    }): Promise<Ticket[]> {
        const res = await db.query('SELECT * FROM tickets ORDER BY "createdAt" DESC');
        let tickets = res.rows as Ticket[];

        // Apply filters
        if (filters.status && filters.status !== 'all') {
            tickets = tickets.filter(t => t.status === filters.status);
        }
        if (filters.priority && filters.priority !== 'all') {
            tickets = tickets.filter(t => t.priority === filters.priority);
        }
        if (filters.severity && filters.severity !== 'all') {
            tickets = tickets.filter(t => t.severity === filters.severity);
        }
        if (filters.department && filters.department !== 'all') {
            tickets = tickets.filter(t => t.department === filters.department);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            tickets = tickets.filter(t =>
                t.id.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                t.requester.toLowerCase().includes(q) ||
                t.department.toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q)
            );
        }

        if (filters.userId) {
            const userRes = await db.query('SELECT username FROM users WHERE id = $1', [filters.userId]);
            const user = userRes.rows[0] as { username: string } | undefined;
            const username = user?.username;
            tickets = tickets.filter(t => 
                t.userId === filters.userId || 
                (username && t.requester && t.requester.toLowerCase() === username.toLowerCase())
            );
        }

        if (filters.filterByCollaborator) {
            const collabRes = await db.query('SELECT ticket_id FROM ticket_collaborators WHERE user_id = $1', [filters.filterByCollaborator]);
            const collabTicketIds = new Set(collabRes.rows.map(r => r.ticket_id));
            tickets = tickets.filter(t => collabTicketIds.has(t.id));
        }

        // Attach notes and attachments
        const formattedTickets: Ticket[] = [];
        for (const t of tickets) {
            const notesRes = await db.query('SELECT * FROM notes WHERE "ticketId" = $1 ORDER BY id ASC', [t.id]);
            const attachmentsRes = await db.query('SELECT * FROM attachments WHERE "ticketId" = $1', [t.id]);

            const notes = (notesRes.rows as Note[]).map(n => ({
                ...n,
                time: this.formatNoteTime(n.time)
            }));

            const attachments = (attachmentsRes.rows as Attachment[]).map(a => ({
                ...a,
                uploadedAt: this.formatAttachmentUploadedAt(a.uploadedAt)
            }));

            const collaborators = await TicketWorkflowService.getCollaborators(t.id);

            formattedTickets.push({
                ...t,
                // Ensure date objects are serialized as ISO strings
                createdAt: (t.createdAt as any) instanceof Date ? (t.createdAt as any).toISOString() : String(t.createdAt),
                updatedAt: (t.updatedAt as any) instanceof Date ? (t.updatedAt as any).toISOString() : String(t.updatedAt),
                dueAt: (t.dueAt as any) instanceof Date ? (t.dueAt as any).toISOString() : t.dueAt ? String(t.dueAt) : '',
                notes,
                attachments,
                collaborators
            });
        }

        return formattedTickets;
    }

    public static async getRecent(limit: number = 5, userId?: string, userRole?: string): Promise<Ticket[]> {
        let sql = 'SELECT * FROM tickets';
        const values: any[] = [];
        
        if (userRole === 'client' && userId) {
            // Client sees only their own tickets
            sql += ' WHERE "userId" = $1 OR requester = (SELECT username FROM users WHERE id = $1 LIMIT 1)';
            values.push(userId);
        } else if (userRole === 'tech' && userId) {
            // Tech sees tickets assigned to them or unassigned
            sql += ' WHERE assignee = $1 OR assignee = \'Unassigned\'';
            // Also could check collaborators but for simplicity and speed, just standard
            values.push(userId);
        }

        sql += ' ORDER BY "updatedAt" DESC LIMIT $' + (values.length + 1);
        values.push(limit);

        const res = await db.query(sql, values);
        
        // We only need basic formatting for recent tickets in dashboard
        return res.rows.map(t => ({
            ...t,
            createdAt: (t.createdAt as any) instanceof Date ? (t.createdAt as any).toISOString() : String(t.createdAt),
            updatedAt: (t.updatedAt as any) instanceof Date ? (t.updatedAt as any).toISOString() : String(t.updatedAt),
            dueAt: (t.dueAt as any) instanceof Date ? (t.dueAt as any).toISOString() : t.dueAt ? String(t.dueAt) : '',
            notes: [],
            attachments: [],
            collaborators: []
        })) as Ticket[];
    }

    public static async getById(id: string): Promise<Ticket | null> {
        const res = await db.query('SELECT * FROM tickets WHERE id = $1', [id]);
        const ticket = res.rows[0] as Ticket | undefined;
        if (!ticket) return null;

        const notesRes = await db.query('SELECT * FROM notes WHERE "ticketId" = $1 ORDER BY id ASC', [ticket.id]);
        const attachmentsRes = await db.query('SELECT * FROM attachments WHERE "ticketId" = $1', [ticket.id]);

        const notes = (notesRes.rows as Note[]).map(n => ({
            ...n,
            time: this.formatNoteTime(n.time)
        }));

        const attachments = (attachmentsRes.rows as Attachment[]).map(a => ({
            ...a,
            uploadedAt: this.formatAttachmentUploadedAt(a.uploadedAt)
        }));

        const collaborators = await TicketWorkflowService.getCollaborators(ticket.id);

        return {
            ...ticket,
            createdAt: (ticket.createdAt as any) instanceof Date ? (ticket.createdAt as any).toISOString() : String(ticket.createdAt),
            updatedAt: (ticket.updatedAt as any) instanceof Date ? (ticket.updatedAt as any).toISOString() : String(ticket.updatedAt),
            dueAt: (ticket.dueAt as any) instanceof Date ? (ticket.dueAt as any).toISOString() : ticket.dueAt ? String(ticket.dueAt) : '',
            notes,
            attachments,
            collaborators
        };
    }

    public static async create(ticketData: Omit<Ticket, 'status' | 'rating' | 'ratingComment'>): Promise<Ticket> {
        const ticket: Ticket = {
            ...ticketData,
            status: 'Open',
            rating: null,
            ratingComment: null,
        };

        // Convert date strings to Date objects for PostgreSQL compatibility
        const insertParams = {
            ...ticket,
            createdAt: new Date(ticket.createdAt),
            updatedAt: new Date(ticket.updatedAt),
            dueAt: ticket.dueAt ? new Date(ticket.dueAt) : null,
            userId: ticket.userId || null
        };

        return db.withTransaction(async (tx) => {
            await tx.query(`
                INSERT INTO tickets (id, title, description, category, department, priority, severity, status, assignee, requester, rating, "ratingComment", "createdAt", "updatedAt", "dueAt", "userId")
                VALUES (@id, @title, @description, @category, @department, @priority, @severity, @status, @assignee, @requester, @rating, @ratingComment, @createdAt, @updatedAt, @dueAt, @userId)
            `, insertParams);

            await EventBus.emit(tx, 'ticket.created', {
                entityId: ticket.id,
                entityType: 'ticket',
                metadata: {
                    department: ticket.department,
                    severity: ticket.severity,
                    requester: ticket.requester
                }
            });

            return { ...ticket, notes: [], attachments: [] };
        });
    }

    public static async update(id: string, updateData: Partial<Ticket>, changedBy?: string): Promise<Ticket | null> {
        return db.withTransaction(async (tx) => {
            const existingRes = await tx.query('SELECT * FROM tickets WHERE id = $1 FOR UPDATE', [id]);
            const existing = existingRes.rows[0] as Ticket | undefined;
            if (!existing) return null;

            // Handle transition to Resolved
            const isResolving = updateData.status === 'Resolved' && existing.status !== 'Resolved';
            if (isResolving) {
                if (!updateData.resolved_at && !existing.resolved_at) {
                    updateData.resolved_at = new Date().toISOString();
                }
                if (!updateData.resolving_assignee_id && !existing.resolving_assignee_id) {
                    let techId = existing.primary_assignee_id;
                    if (!techId && (updateData.assignee || existing.assignee)) {
                        const techName = updateData.assignee || existing.assignee;
                        const userRes = await tx.query('SELECT id FROM users WHERE username ILIKE $1 LIMIT 1', [techName]);
                        techId = userRes.rows[0]?.id || null;
                    }
                    updateData.resolving_assignee_id = techId;
                }
            }

            const allowed: (keyof Ticket)[] = [
                'title', 'description', 'category', 'department', 'priority', 
                'severity', 'status', 'assignee', 'requester', 'rating', 
                'ratingComment', 'dueAt', 'ratingRequested', 'resolved_at', 'resolving_assignee_id'
            ];
            const setClauses: string[] = [];
            const values: Record<string, any> = {};

            for (const key of allowed) {
                if (updateData[key] !== undefined) {
                    const colName = (key === 'ratingComment') ? '"ratingComment"' : 
                                    (key === 'dueAt') ? '"dueAt"' : 
                                    (key === 'ratingRequested') ? '"ratingRequested"' : `"${String(key)}"`;
                    setClauses.push(`${colName} = @${String(key)}`);
                    // Format parameter values
                    if (key === 'dueAt' || key === 'resolved_at') {
                        values[key] = updateData[key] ? new Date(updateData[key] as string) : null;
                    } else {
                        values[key] = updateData[key];
                    }
                }
            }

            if (setClauses.length > 0) {
                setClauses.push('"updatedAt" = @updatedAt');
                values.updatedAt = new Date();
                values.id = id;

                const sql = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = @id`;
                await tx.query(sql, values);
            }

            // Generate system events for operational changes
            const fieldsToTrack: (keyof Ticket)[] = ['status', 'severity', 'priority', 'assignee', 'dueAt'];
            const changer = changedBy || 'Admin';
            for (const field of fieldsToTrack) {
                if (updateData[field] !== undefined) {
                    let oldVal = '';
                    let newVal = '';
                    if (field === 'dueAt') {
                        const oldDate = existing.dueAt ? new Date(existing.dueAt).toLocaleDateString() : 'Unassigned';
                        const newDate = updateData.dueAt ? new Date(updateData.dueAt).toLocaleDateString() : 'Unassigned';
                        oldVal = oldDate;
                        newVal = newDate;
                    } else {
                        oldVal = String(existing[field] ?? 'Unassigned');
                        newVal = String(updateData[field] ?? 'Unassigned');
                    }
                    if (oldVal === newVal) continue;

                    await TicketWorkflowService.logEvent(tx, id, changer, `${field}_changed`, {
                        old_value: oldVal,
                        new_value: newVal
                    });
                }
            }

            // Emit transactional domain events
            if (isResolving) {
                await EventBus.emit(tx, 'ticket.resolved', {
                    actorId: changer,
                    entityId: id,
                    entityType: 'ticket',
                    metadata: {
                        ticketId: id,
                        title: updateData.title || existing.title,
                        requesterId: existing.userId,
                        requester: existing.requester,
                        resolvingAssigneeId: updateData.resolving_assignee_id || existing.resolving_assignee_id || existing.primary_assignee_id
                    }
                });
            } else if (updateData.status && updateData.status !== existing.status) {
                if (existing.status === 'Resolved') {
                    await EventBus.emit(tx, 'ticket.reopened', {
                        actorId: changer,
                        entityId: id,
                        entityType: 'ticket',
                        metadata: {
                            ticketId: id,
                            oldStatus: existing.status,
                            newStatus: updateData.status
                        }
                    });
                } else {
                    await EventBus.emit(tx, 'ticket.status_updated', {
                        actorId: changer,
                        entityId: id,
                        entityType: 'ticket',
                        metadata: {
                            oldStatus: existing.status,
                            newStatus: updateData.status
                        }
                    });
                }
            }

            return this.getById(id);
        });
    }

    public static async delete(id: string): Promise<boolean> {
        const existingRes = await db.query('SELECT 1 FROM tickets WHERE id = $1', [id]);
        if (existingRes.rowCount === 0) return false;

        await db.query('DELETE FROM tickets WHERE id = $1', [id]);
        return true;
    }

    public static async addNote(ticketId: string, text: string, author: string): Promise<Note | null> {
        return db.withTransaction(async (tx) => {
            const existingRes = await tx.query('SELECT 1 FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (existingRes.rowCount === 0) return null;

            const note = {
                ticketId,
                text,
                author,
                time: new Date()
            };

            const result = await tx.query(`
                INSERT INTO notes ("ticketId", text, author, time)
                VALUES (@ticketId, @text, @author, @time)
                RETURNING id
            `, note);

            await tx.query('UPDATE tickets SET "updatedAt" = $1 WHERE id = $2', [new Date(), ticketId]);

            await EventBus.emit(tx, 'note.added', {
                actorId: author,
                entityId: ticketId,
                entityType: 'ticket',
                metadata: { noteId: result.rows[0].id }
            });

            return {
                id: result.rows[0].id,
                ticketId,
                text,
                author,
                time: this.formatNoteTime(note.time)
            };
        });
    }

    public static async addAttachment(attachment: Attachment): Promise<Attachment> {
        return db.withTransaction(async (tx) => {
            const insertParams = {
                ...attachment,
                uploadedAt: new Date(attachment.uploadedAt)
            };

            await tx.query(`
                INSERT INTO attachments (id, "ticketId", filename, originalname, size, "uploadedAt")
                VALUES (@id, @ticketId, @filename, @originalname, @size, @uploadedAt)
            `, insertParams);

            await EventBus.emit(tx, 'attachment.uploaded', {
                entityId: attachment.ticketId,
                entityType: 'ticket',
                metadata: { attachmentId: attachment.id }
            });

            return attachment;
        });
    }
}
