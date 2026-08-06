import { db } from '../config/db';
import { Ticket, Note, Attachment } from '../types';

// Prepared statements for tickets
const stmts = {
    getAllTickets: db.prepare(`SELECT * FROM tickets ORDER BY createdAt DESC`),
    getTicketById: db.prepare(`SELECT * FROM tickets WHERE id = ?`),
    insertTicket: db.prepare(`
        INSERT INTO tickets (id, title, description, category, department, priority, severity, status, assignee, requester, rating, ratingComment, createdAt, updatedAt, dueAt)
        VALUES (@id, @title, @description, @category, @department, @priority, @severity, @status, @assignee, @requester, @rating, @ratingComment, @createdAt, @updatedAt, @dueAt)
    `),
    deleteTicket: db.prepare(`DELETE FROM tickets WHERE id = ?`),
    getNotes: db.prepare(`SELECT * FROM notes WHERE ticketId = ? ORDER BY id ASC`),
    insertNote: db.prepare(`
        INSERT INTO notes (ticketId, text, author, time) VALUES (@ticketId, @text, @author, @time)
    `),
    getAttachments: db.prepare(`SELECT * FROM attachments WHERE ticketId = ?`),
    insertAttachment: db.prepare(`
        INSERT INTO attachments (id, ticketId, filename, originalname, size, uploadedAt)
        VALUES (@id, @ticketId, @filename, @originalname, @size, @uploadedAt)
    `),
    updateTicketUpdatedAt: db.prepare(`UPDATE tickets SET updatedAt = ? WHERE id = ?`)
};

export class TicketService {
    public static getAll(filters: {
        status?: string;
        priority?: string;
        severity?: string;
        department?: string;
        search?: string;
    }): Ticket[] {
        let tickets = stmts.getAllTickets.all() as Ticket[];

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

        // Attach notes and attachments
        return tickets.map(t => ({
            ...t,
            notes: stmts.getNotes.all(t.id) as Note[],
            attachments: stmts.getAttachments.all(t.id) as Attachment[],
        }));
    }

    public static getById(id: string): Ticket | null {
        const ticket = stmts.getTicketById.get(id) as Ticket | undefined;
        if (!ticket) return null;

        return {
            ...ticket,
            notes: stmts.getNotes.all(ticket.id) as Note[],
            attachments: stmts.getAttachments.all(ticket.id) as Attachment[],
        };
    }

    public static create(ticketData: Omit<Ticket, 'status' | 'rating' | 'ratingComment'>): Ticket {
        const ticket: Ticket = {
            ...ticketData,
            status: 'Open',
            rating: null,
            ratingComment: null,
        };

        stmts.insertTicket.run(ticket);
        return { ...ticket, notes: [], attachments: [] };
    }

    public static update(id: string, updateData: Partial<Ticket>): Ticket | null {
        const existing = stmts.getTicketById.get(id) as Ticket | undefined;
        if (!existing) return null;

        const allowed: (keyof Ticket)[] = [
            'title', 'description', 'category', 'department', 'priority', 
            'severity', 'status', 'assignee', 'requester', 'rating', 
            'ratingComment', 'dueAt', 'ratingRequested'
        ];
        const setClauses: string[] = [];
        const values: Record<string, any> = {};

        for (const key of allowed) {
            if (updateData[key] !== undefined) {
                setClauses.push(`${key} = @${key}`);
                values[key] = updateData[key];
            }
        }

        if (setClauses.length === 0) {
            return this.getById(id);
        }

        setClauses.push('updatedAt = @updatedAt');
        values.updatedAt = new Date().toISOString();
        values.id = id;

        const sql = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = @id`;
        db.prepare(sql).run(values);

        return this.getById(id);
    }

    public static delete(id: string): boolean {
        const existing = stmts.getTicketById.get(id);
        if (!existing) return false;

        stmts.deleteTicket.run(id);
        return true;
    }

    public static addNote(ticketId: string, text: string, author: string): Note | null {
        const existing = stmts.getTicketById.get(ticketId);
        if (!existing) return null;

        const note = {
            ticketId,
            text,
            author,
            time: new Date().toLocaleString(),
        };

        const result = stmts.insertNote.run(note);
        stmts.updateTicketUpdatedAt.run(new Date().toISOString(), ticketId);

        return {
            id: Number(result.lastInsertRowid),
            ...note
        };
    }

    public static addAttachment(attachment: Attachment): Attachment {
        stmts.insertAttachment.run(attachment);
        return attachment;
    }
}
