import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { Attachment } from '../types';

export class TicketController {
    public static getAll(req: Request, res: Response, next: NextFunction): void {
        try {
            const { status, priority, severity, department, search } = req.query;
            const tickets = TicketService.getAll({
                status: status as string,
                priority: priority as string,
                severity: severity as string,
                department: department as string,
                search: search as string,
            });
            res.json(tickets);
        } catch (err) {
            next(err);
        }
    }

    public static getById(req: Request, res: Response, next: NextFunction): void {
        try {
            const ticket = TicketService.getById(String(req.params.id));
            if (!ticket) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }
            res.json(ticket);
        } catch (err) {
            next(err);
        }
    }

    public static create(req: Request, res: Response, next: NextFunction): void {
        try {
            const {
                title, description = '', category = 'Other',
                department, priority = 'Medium', severity = 'Moderate',
                requester, assignee = 'Unassigned'
            } = req.body;

            // Input Validation
            if (!title || typeof title !== 'string' || !title.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: title' });
                return;
            }
            if (!description || typeof description !== 'string' || !description.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: description' });
                return;
            }
            if (!requester || typeof requester !== 'string' || !requester.trim()) {
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

            const ticket = TicketService.create({
                id,
                title: title.trim(),
                description: description.trim(),
                category,
                department: department.trim(),
                priority,
                severity,
                assignee: assignee || 'Unassigned',
                requester: requester.trim(),
                createdAt: now,
                updatedAt: now,
                dueAt
            });

            res.status(201).json(ticket);
        } catch (err) {
            next(err);
        }
    }

    public static update(req: Request, res: Response, next: NextFunction): void {
        try {
            // Input Validation
            if (req.body.rating !== undefined) {
                const rating = req.body.rating;
                if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
                    res.status(400).json({ error: 'Rating must be a number between 1 and 5, or null' });
                    return;
                }
            }

            const ticket = TicketService.update(String(req.params.id), req.body);
            if (!ticket) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }
            res.json(ticket);
        } catch (err) {
            next(err);
        }
    }

    public static delete(req: Request, res: Response, next: NextFunction): void {
        try {
            const success = TicketService.delete(String(req.params.id));
            if (!success) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }
            res.json({ success: true, id: String(req.params.id) });
        } catch (err) {
            next(err);
        }
    }

    public static addNote(req: Request, res: Response, next: NextFunction): void {
        try {
            const { text, author } = req.body;

            // Input Validation
            if (!text || typeof text !== 'string' || !text.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: text' });
                return;
            }
            if (!author || typeof author !== 'string' || !author.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: author' });
                return;
            }

            const note = TicketService.addNote(String(req.params.id), text.trim(), author.trim());
            if (!note) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }
            res.status(201).json(note);
        } catch (err) {
            next(err);
        }
    }

    public static uploadAttachment(req: Request, res: Response, next: NextFunction): void {
        try {
            const existing = TicketService.getById(String(req.params.id));
            if (!existing) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }

            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const id = `ATT-${Date.now()}`;
            const attachment: Attachment = {
                id,
                ticketId: String(req.params.id),
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                uploadedAt: new Date().toISOString(),
            };

            const result = TicketService.addAttachment(attachment);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }
}
