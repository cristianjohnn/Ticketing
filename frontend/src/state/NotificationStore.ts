import { notificationsAPI } from '../services/api';
import { sseClient } from '../services/sseClient';
import { AppNotification, NotificationQuery } from '../types';

export interface NotificationStoreEvent {
    inserted: string[];
    updated: string[];
    removed: string[];
    unreadCountChanged: boolean;
    connectionState?: 'connected' | 'reconnecting' | 'disconnected';
}

export interface NotificationCounts {
    total: number;
    unread: number;
    transfers: number;
    collaboration: number;
    comments: number;
    assignments: number;
    system: number;
}

export type StoreSubscriber = (event: NotificationStoreEvent) => void;

class NotificationStore {
    private entities: Record<string, AppNotification> = {};
    private queryCache: Record<string, { ids: string[]; cursor: string | null; hasMore: boolean; timestamp: number }> = {};
    private counts: NotificationCounts = { total: 0, unread: 0, transfers: 0, collaboration: 0, comments: 0, assignments: 0, system: 0 };
    private subscribers: StoreSubscriber[] = [];
    private isInitialized = false;

    public async init() {
        if (this.isInitialized) return;
        
        try {
            const resp = await notificationsAPI.getAll({ limit: 1 });
            this.counts = (resp.counts as any) || this.counts;
            this.notifySubscribers({ inserted: [], updated: [], removed: [], unreadCountChanged: true });
            this.setupSSE();
            this.isInitialized = true;
        } catch (err) {
            console.error('Failed to initialize NotificationStore', err);
            // Do not set isInitialized to true so it can be retried
        }
    }

    public subscribe(callback: StoreSubscriber) {
        this.subscribers.push(callback);
        if (!this.isInitialized) {
            this.init();
        }
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    public getCounts(): NotificationCounts {
        return this.counts;
    }

    public getById(id: string): AppNotification | undefined {
        return this.entities[id];
    }

    public async fetch(query: NotificationQuery): Promise<{ ids: string[]; cursor: string | null; hasMore: boolean }> {
        if (!this.isInitialized) {
            // Attempt to initialize (setup SSE and counts) if not done yet
            await this.init();
        }

        const queryKey = JSON.stringify(query);
        const cached = this.queryCache[queryKey];
        
        // Return cached result if it's less than 15 seconds old
        if (cached && Date.now() - cached.timestamp < 15000) {
            return { ids: cached.ids, cursor: cached.cursor, hasMore: cached.hasMore };
        }
        
        try {
            const resp = await notificationsAPI.getAll(query);
            const newIds = resp.data.map(n => n.id);
            
            this.upsert(resp.data);
            
            this.counts = (resp.counts as any) || this.counts;
            
            const result = {
                ids: newIds,
                cursor: resp.cursor,
                hasMore: resp.cursor !== null,
                timestamp: Date.now()
            };
            this.queryCache[queryKey] = result;
            
            this.notifySubscribers({ inserted: [], updated: [], removed: [], unreadCountChanged: true });
            return { ids: result.ids, cursor: result.cursor, hasMore: result.hasMore };
        } catch (err) {
            // Fallback to cache if network fails
            if (this.queryCache[queryKey]) {
                const c = this.queryCache[queryKey];
                return { ids: c.ids, cursor: c.cursor, hasMore: c.hasMore };
            }
            throw err;
        }
    }

    public async markAsRead(id: string) {
        const n = this.entities[id];
        if (n && !n.read_at) {
            // Optimistic update
            n.read_at = new Date().toISOString();
            this.counts.unread = Math.max(0, this.counts.unread - 1);
            this.notifySubscribers({ inserted: [], updated: [id], removed: [], unreadCountChanged: true });
            
            try {
                const updated = await notificationsAPI.markAsRead(id);
                this.upsert([updated]);
            } catch (err) {
                console.error('Failed to mark as read', err);
            }
        }
    }

    public async markAllAsRead() {
        // Optimistic update
        const updatedIds: string[] = [];
        Object.values(this.entities).forEach(n => {
            if (!n.read_at) {
                n.read_at = new Date().toISOString();
                updatedIds.push(n.id);
            }
        });
        this.counts.unread = 0;
        this.notifySubscribers({ inserted: [], updated: updatedIds, removed: [], unreadCountChanged: true });

        try {
            await notificationsAPI.markAllAsRead();
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    }

    public async markBulkAsRead(ids: string[]) {
        if (ids.length === 0) return;

        // Optimistic update
        const updatedIds: string[] = [];
        ids.forEach(id => {
            const n = this.entities[id];
            if (n && !n.read_at) {
                n.read_at = new Date().toISOString();
                updatedIds.push(n.id);
            }
        });
        
        if (updatedIds.length > 0) {
            this.counts.unread = Math.max(0, this.counts.unread - updatedIds.length);
            this.notifySubscribers({ inserted: [], updated: updatedIds, removed: [], unreadCountChanged: true });

            try {
                await notificationsAPI.markBulkAsRead(updatedIds);
                // Actually the SSE event will handle the ultimate truth, but our optimistic update should hold
            } catch (err) {
                console.error('Failed to mark bulk as read', err);
                // Could roll back optimistic update here if necessary, but omitting for brevity
            }
        }
    }

    public upsert(notifications: AppNotification[]) {
        const inserted: string[] = [];
        const updated: string[] = [];

        notifications.forEach(n => {
            const existing = this.entities[n.id];
            if (existing) {
                this.entities[n.id] = { ...existing, ...n };
                updated.push(n.id);
            } else {
                this.entities[n.id] = n;
                inserted.push(n.id);
            }
        });

        if (inserted.length > 0 || updated.length > 0) {
            this.notifySubscribers({ inserted, updated, removed: [], unreadCountChanged: false });
        }
    }

    public remove(id: string) {
        if (this.entities[id]) {
            delete this.entities[id];
            this.notifySubscribers({ inserted: [], updated: [], removed: [id], unreadCountChanged: false });
        }
    }

    private setupSSE() {
        sseClient.on('notification.created', async () => {
            try {
                const resp = await notificationsAPI.getAll({ limit: 1 });
                this.counts = (resp.counts as any) || this.counts;
                if (resp.data.length > 0) {
                    this.upsert(resp.data);
                }
                this.notifySubscribers({ inserted: [], updated: [], removed: [], unreadCountChanged: true });
            } catch (err) {
                console.error(err);
            }
        });

        sseClient.on('notification.updated', async (data: any) => {
            try {
                const id = data?.metadata?.id || data?.id;
                if (id && data && data.entity_type) {
                    this.upsert([data as AppNotification]);
                }
                const resp = await notificationsAPI.getAll({ limit: 1 });
                this.counts = (resp.counts as any) || this.counts;
                this.notifySubscribers({ inserted: [], updated: [], removed: [], unreadCountChanged: true });
            } catch (err) {
                console.error(err);
            }
        });

        sseClient.on('notification.read_all', () => {
            // Optimistic update
            const updatedIds: string[] = [];
            Object.values(this.entities).forEach(n => {
                if (!n.read_at) {
                    n.read_at = new Date().toISOString();
                    updatedIds.push(n.id);
                }
            });
            
            if (updatedIds.length > 0 || this.counts.unread > 0) {
                this.counts.unread = 0;
                this.notifySubscribers({ inserted: [], updated: updatedIds, removed: [], unreadCountChanged: true });
            }
        });

        sseClient.on('connection.state', (state: any) => {
            this.notifySubscribers({ inserted: [], updated: [], removed: [], unreadCountChanged: false, connectionState: state });
        });
    }

    private notifySubscribers(event: NotificationStoreEvent) {
        this.subscribers.forEach(cb => cb(event));
    }
}

export const notificationStore = new NotificationStore();
