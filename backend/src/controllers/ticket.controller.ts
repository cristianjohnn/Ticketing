import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { Attachment } from '../types';
import { supabase } from '../config/supabase';
import { ENV } from '../config/env';

export class TicketController {
    public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { status, priority, severity, department, search } = req.query;
            const user = (req as any).user;
            const userIdFilter = user.role === 'client' ? user.id : (req.query.userId as string);

            const tickets = await TicketService.getAll({
                status: status as string,
                priority: priority as string,
                severity: severity as string,
                department: department as string,
                search: search as string,
                userId: userIdFilter,
            });
            res.json(tickets);
        } catch (err) {
            next(err);
        }
    }

    public static async getRecent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
            const user = (req as any).user;
            
            const tickets = await TicketService.getRecent(limit, user?.id, user?.role);
            res.json(tickets);
        } catch (err) {
            next(err);
        }
    }

    public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const ticket = await TicketService.getById(String(req.params.id));
            if (!ticket) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }

            const user = (req as any).user;
            if (user.role === 'client' && ticket.userId !== user.id && ticket.requester.toLowerCase() !== user.username.toLowerCase()) {
                res.status(403).json({ error: 'Access denied: you do not own this ticket.' });
                return;
            }
            res.json(ticket);
        } catch (err) {
            next(err);
        }
    }

    public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                title, description = '', category = 'Other',
                department, priority = 'Medium', severity = 'Moderate',
                requester, assignee = 'Unassigned'
            } = req.body;

            const user = (req as any).user;

            // Input Validation
            if (!title || typeof title !== 'string' || !title.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: title' });
                return;
            }
            if (!description || typeof description !== 'string' || !description.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: description' });
                return;
            }
            if (!user && (!requester || typeof requester !== 'string' || !requester.trim())) {
                res.status(400).json({ error: 'Missing or invalid required field: requester' });
                return;
            }
            if (!department || typeof department !== 'string' || !department.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: department' });
                return;
            }

            const id = `TKT-${Date.now()}`;
            const now = new Date().toISOString();
            
            let dueHours = 24;
            if (severity === 'Severe') dueHours = 2;
            else if (severity === 'High') dueHours = 4;
            else if (severity === 'Low') dueHours = 48;
            
            const dueAt = new Date(Date.now() + dueHours * 3600000).toISOString();
            
            const finalRequester = user ? user.fullName : requester.trim();
            const userId = user ? user.id : null;

            const ticket = await TicketService.create({
                id,
                title: title.trim(),
                description: description.trim(),
                category,
                department: department.trim(),
                priority,
                severity,
                assignee: assignee || 'Unassigned',
                requester: finalRequester,
                createdAt: now,
                updatedAt: now,
                dueAt,
                userId
            });

            res.status(201).json(ticket);
        } catch (err) {
            next(err);
        }
    }

    public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Input Validation
            if (req.body.rating !== undefined) {
                const rating = req.body.rating;
                if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
                    res.status(400).json({ error: 'Rating must be a number between 1 and 5, or null' });
                    return;
                }
            }

            const { changedBy, ...updates } = req.body;
            const ticket = await TicketService.update(String(req.params.id), updates, changedBy);
            if (!ticket) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }
            res.json(ticket);
        } catch (err) {
            next(err);
        }
    }

    public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const success = await TicketService.delete(String(req.params.id));
            if (!success) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }
            res.json({ success: true, id: String(req.params.id) });
        } catch (err) {
            next(err);
        }
    }

    public static async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { text, author } = req.body;
            const user = (req as any).user;

            // Input Validation
            if (!text || typeof text !== 'string' || !text.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: text' });
                return;
            }

            const ticket = await TicketService.getById(String(req.params.id));
            if (!ticket) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }

            if (user && user.role === 'client' && ticket.userId !== user.id && ticket.requester.toLowerCase() !== user.username.toLowerCase()) {
                res.status(403).json({ error: 'Access denied: you do not own this ticket.' });
                return;
            }

            const noteAuthor = user ? user.fullName : (author || 'User').trim();
            const note = await TicketService.addNote(String(req.params.id), text.trim(), noteAuthor);
            if (!note) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }
            res.status(201).json(note);
        } catch (err) {
            next(err);
        }
    }

    public static async uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const existing = await TicketService.getById(String(req.params.id));
            if (!existing) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }

            const user = (req as any).user;
            if (user && user.role === 'client' && existing.userId !== user.id && existing.requester.toLowerCase() !== user.username.toLowerCase()) {
                res.status(403).json({ error: 'Access denied: you do not own this ticket.' });
                return;
            }

            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const id = `ATT-${Date.now()}`;
            const filename = `${id}-${req.file.originalname}`;

            // Upload the memory buffer to Supabase Storage
            const { data, error } = await supabase.storage
                .from(ENV.SUPABASE_STORAGE_BUCKET)
                .upload(filename, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) {
                res.status(500).json({ error: `Supabase storage upload failed: ${error.message}` });
                return;
            }

            const attachment: Attachment = {
                id,
                ticketId: String(req.params.id),
                filename,
                originalname: req.file.originalname,
                size: req.file.size,
                uploadedAt: new Date().toISOString(),
            };

            const result = await TicketService.addAttachment(attachment);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }
}
