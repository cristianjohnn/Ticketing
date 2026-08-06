import { Request, Response, NextFunction } from 'express';
import { TicketWorkflowService } from '../services/ticketWorkflow.service';

export class TicketWorkflowController {
    
    public static async claim(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            if (user.role === 'client') {
                res.status(403).json({ error: 'Clients cannot claim tickets.' });
                return;
            }

            await TicketWorkflowService.claimTicket(String(req.params.id), user.id, user.fullName);
            res.json({ success: true, message: 'Ticket claimed successfully' });
        } catch (err: any) {
            if (err.message === 'Ticket not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            if (user.role === 'client') {
                res.status(403).json({ error: 'Clients cannot assign tickets.' });
                return;
            }
            
            const { assigneeId, assigneeName } = req.body;
            if (!assigneeId || !assigneeName) {
                res.status(400).json({ error: 'assigneeId and assigneeName are required.' });
                return;
            }

            await TicketWorkflowService.assignTicket(String(req.params.id), assigneeId, assigneeName, user.id);
            res.json({ success: true, message: 'Ticket assigned successfully' });
        } catch (err: any) {
            if (err.message === 'Ticket not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            if (user.role !== 'admin') {
                res.status(403).json({ error: 'Only administrators can perform a forced transfer.' });
                return;
            }
            
            const { targetUserId, reason, remainCollaborator } = req.body;
            if (!targetUserId) {
                res.status(400).json({ error: 'targetUserId is required.' });
                return;
            }

            await TicketWorkflowService.transferTicket(
                String(req.params.id), 
                targetUserId, 
                reason || '', 
                !!remainCollaborator, 
                user.id,
                user.role
            );
            res.json({ success: true, message: 'Ticket force-transferred successfully' });
        } catch (err: any) {
            if (err.message === 'Ticket not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async addCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            if (user.role === 'client') {
                res.status(403).json({ error: 'Clients cannot add collaborators.' });
                return;
            }
            
            const { targetUserId } = req.body;
            if (!targetUserId) {
                res.status(400).json({ error: 'targetUserId is required.' });
                return;
            }

            await TicketWorkflowService.addCollaborator(String(req.params.id), targetUserId, user.id);
            res.json({ success: true, message: 'Collaborator added successfully' });
        } catch (err: any) {
            if (err.message === 'Ticket not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async requestCollaboration(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            if (user.role === 'client') {
                res.status(403).json({ error: 'Clients cannot request collaboration.' });
                return;
            }

            const { targetUserId } = req.body;

            await TicketWorkflowService.requestCollaboration(String(req.params.id), user.id, targetUserId);
            res.json({ success: true, message: 'Collaboration request submitted successfully' });
        } catch (err: any) {
            if (err.message === 'Ticket not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async approveCollaboration(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            const requestId = String(req.params.requestId);
            await TicketWorkflowService.approveCollaboration(requestId, user.id);
            res.json({ success: true, message: 'Collaboration request approved' });
        } catch (err: any) {
            if (err.message === 'Request not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async rejectCollaboration(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            const requestId = String(req.params.requestId);
            const { reason } = req.body;
            await TicketWorkflowService.rejectCollaboration(requestId, user.id, reason);
            res.json({ success: true, message: 'Collaboration request rejected' });
        } catch (err: any) {
            if (err.message === 'Request not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async getPendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const requests = await TicketWorkflowService.getPendingRequests(String(req.params.id));
            res.json(requests);
        } catch (err: any) {
            next(err);
        }
    }

    public static async requestTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            if (user.role === 'client') {
                res.status(403).json({ error: 'Clients cannot request ticket transfers.' });
                return;
            }

            const { targetUserId, reason } = req.body;
            if (!targetUserId) {
                res.status(400).json({ error: 'targetUserId is required.' });
                return;
            }

            await TicketWorkflowService.requestTransfer(String(req.params.id), user.id, targetUserId, reason);
            res.json({ success: true, message: 'Transfer request submitted successfully' });
        } catch (err: any) {
            if (err.message === 'Ticket not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async approveTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            const requestId = String(req.params.requestId);
            await TicketWorkflowService.approveTransfer(requestId, user.id);
            res.json({ success: true, message: 'Transfer request approved' });
        } catch (err: any) {
            if (err.message === 'Transfer request not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async rejectTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            const requestId = String(req.params.requestId);
            const { reason } = req.body;
            await TicketWorkflowService.rejectTransfer(requestId, user.id, reason);
            res.json({ success: true, message: 'Transfer request rejected' });
        } catch (err: any) {
            if (err.message === 'Transfer request not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async cancelTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            const requestId = String(req.params.requestId);
            await TicketWorkflowService.cancelTransfer(requestId, user.id);
            res.json({ success: true, message: 'Transfer request cancelled' });
        } catch (err: any) {
            if (err.message === 'Transfer request not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }

    public static async getPendingTransferRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const requests = await TicketWorkflowService.getPendingTransferRequests(String(req.params.id));
            res.json(requests);
        } catch (err: any) {
            next(err);
        }
    }

    public static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const history = await TicketWorkflowService.getHistory(String(req.params.id));
            res.json(history);
        } catch (err: any) {
            next(err);
        }
    }

    public static async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            await TicketWorkflowService.reopenTicket(String(req.params.id), user.id);
            res.json({ success: true, message: 'Ticket reopened successfully' });
        } catch (err: any) {
            if (err.message === 'Ticket not found') res.status(404).json({ error: err.message });
            else res.status(400).json({ error: err.message });
        }
    }
}
