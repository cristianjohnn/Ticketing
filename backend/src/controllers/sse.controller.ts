import { Request, Response } from 'express';
import { EventBus, DomainEventPayload, EventName } from '../utils/EventBus';

interface SseClient {
    id: string;
    userId: string; // To target specific users
    res: Response;
}

export class SSEController {
    private static clients: SseClient[] = [];
    private static heartbeatInterval: NodeJS.Timeout | null = null;

    public static initialize() {
        // Subscribe to all post-commit domain events
        const events: EventName[] = [
            'collaboration.requested',
            'collaboration.approved',
            'collaboration.rejected',
            'ticket.claimed',
            'ticket.transferred',
            'ticket.transfer_requested',
            'ticket.transfer_approved',
            'ticket.transfer_rejected',
            'ticket.transfer_cancelled',
            'ticket.transfer_expired',
            'ticket.transfer_invalidated',
            'ticket.resolved',
            'ticket.reopened',
            'ticket.rated',
            'csat.low_score_alert',
            'ticket.status_updated',
            'note.added',
            'attachment.uploaded',
            'notification.created',
            'notification.updated',
            'notification.read_all'
        ];

        for (const event of events) {
            EventBus.onPostCommit(event, (payload) => {
                SSEController.broadcastDomainEvent(event, payload);
            });
        }

        // Start heartbeat to keep connections alive
        if (!this.heartbeatInterval) {
            this.heartbeatInterval = setInterval(() => {
                this.broadcastRaw('heartbeat', { time: new Date().toISOString() });
            }, 30000);
        }
    }

    public static subscribe(req: Request, res: Response) {
        // Usually, user ID should be extracted from auth middleware (req.user)
        const userId = (req as any).user?.id || req.query.userId as string;
        
        if (!userId) {
            res.status(401).send('Unauthorized or missing userId');
            return;
        }

        const headers = {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no' // Important for Nginx
        };
        res.writeHead(200, headers);

        const clientId = crypto.randomUUID();
        const client: SseClient = {
            id: clientId,
            userId,
            res
        };

        SSEController.clients.push(client);
        console.log(`[SSE] Client connected: ${clientId} for user ${userId}`);

        // Send initial connection event
        res.write(`event: connected\ndata: {"message": "Connected"}\n\n`);

        req.on('close', () => {
            console.log(`[SSE] Client disconnected: ${clientId}`);
            SSEController.clients = SSEController.clients.filter(c => c.id !== clientId);
        });
    }

    /**
     * Broadcasts a domain event to all clients. 
     * In the future, we could inspect the payload to target specific users,
     * but domain events like 'ticket.updated' might need to be broadcast to everyone 
     * collaborating on the ticket. For now, broadcasting is safe for UI invalidation
     * (the UI checks if the event entity matches what it's viewing).
     * 
     * For notifications, we only push to the specific recipient if they are connected.
     */
    private static broadcastDomainEvent(eventType: EventName, payload: DomainEventPayload) {
        if (eventType === 'notification.created' || eventType === 'notification.updated' || eventType === 'notification.read_all') {
            // Notifications are private; only send to the intended recipient
            const recipientId = payload.metadata?.recipientId || payload.metadata?.recipient_id || payload.metadata?.userId;
            if (recipientId) {
                SSEController.sendToUser(recipientId, eventType, payload);
            }
        } else {
            // Other events are broadcasted globally (e.g. ticket updates)
            SSEController.broadcastRaw(eventType, payload);
        }
    }

    /**
     * Push raw data over SSE
     */
    private static broadcastRaw(eventType: string, data: any) {
        const payloadStr = JSON.stringify(data);
        const sseMessage = `event: ${eventType}\ndata: ${payloadStr}\n\n`;
        
        for (const client of SSEController.clients) {
            client.res.write(sseMessage);
        }
    }

    /**
     * Target a specific user directly (e.g. for a private notification event)
     */
    public static sendToUser(userId: string, eventType: string, data: any) {
        const payloadStr = JSON.stringify(data);
        const sseMessage = `event: ${eventType}\ndata: ${payloadStr}\n\n`;
        
        for (const client of SSEController.clients) {
            if (client.userId === userId) {
                client.res.write(sseMessage);
            }
        }
    }
}
