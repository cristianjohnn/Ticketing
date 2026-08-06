import { store } from '../state/store';

type SSEEventHandler = (payload: any) => void;

class SSEClient {
    private eventSource: EventSource | null = null;
    private listeners: Map<string, Set<SSEEventHandler>> = new Map();
    private reconnectTimeout: number | null = null;
    private userId: string | null = null;

    public connect(userId: string) {
        if (this.eventSource) {
            this.disconnect();
        }

        this.userId = userId;
        
        // Include token in query string since EventSource doesn't support Authorization header
        const user = store.getState().currentUser;
        const tokenStr = user && user.token ? `&token=${encodeURIComponent(user.token)}` : '';
        
        this.eventSource = new EventSource(`/api/sse/subscribe?userId=${userId}${tokenStr}`);

        this.eventSource.onopen = () => {
            console.log('[SSE] Connected');
            this.dispatch('connection.state', 'connected');
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        };

        this.eventSource.onerror = (err) => {
            console.error('[SSE] Connection error, reconnecting...', err);
            this.dispatch('connection.state', 'reconnecting');
            this.eventSource?.close();
            
            // Auto reconnect with backoff
            if (!this.reconnectTimeout) {
                this.reconnectTimeout = window.setTimeout(() => {
                    this.reconnectTimeout = null;
                    if (this.userId) {
                        this.connect(this.userId);
                    }
                }, 5000);
            }
        };

        // Listen for all configured domain events
        const events = [
            'ticket.created',
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
            'ticket.status_updated',
            'note.added',
            'attachment.uploaded',
            'notification.created',
            'notification.updated',
            'notification.read_all',
            'ticket.rated',
            'csat.low_score_alert'
        ];

        for (const event of events) {
            this.eventSource.addEventListener(event, (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    this.dispatch(event, data);
                } catch (err) {
                    console.error(`[SSE] Failed to parse event ${event}:`, err);
                }
            });
        }
    }

    public disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.dispatch('connection.state', 'disconnected');
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.userId = null;
    }

    public on(event: string, handler: SSEEventHandler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    public off(event: string, handler: SSEEventHandler) {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.delete(handler);
        }
    }

    private dispatch(event: string, payload: any) {
        if (this.listeners.has(event)) {
            for (const handler of this.listeners.get(event)!) {
                try {
                    handler(payload);
                } catch (e) {
                    console.error(`[SSE] Error in handler for ${event}`, e);
                }
            }
        }
    }
}

export const sseClient = new SSEClient();
