import { EventEmitter } from 'events';
import { TxContext } from '../config/db';

export interface DomainEventPayload {
    actorId?: string;
    entityId: string;
    entityType: string;
    metadata?: any;
}

export type EventName = 
    | 'collaboration.requested'
    | 'collaboration.approved'
    | 'collaboration.rejected'
    | 'ticket.created'
    | 'ticket.claimed'
    | 'ticket.transferred'
    | 'ticket.transfer_requested'
    | 'ticket.transfer_approved'
    | 'ticket.transfer_rejected'
    | 'ticket.transfer_cancelled'
    | 'ticket.transfer_expired'
    | 'ticket.transfer_invalidated'
    | 'ticket.resolved'
    | 'ticket.reopened'
    | 'ticket.rated'
    | 'ticket.updated'
    | 'ticket.deleted'
    | 'csat.low_score_alert'
    | 'ticket.status_updated'
    | 'note.added'
    | 'attachment.uploaded'
    | 'notification.created'
    | 'notification.updated'
    | 'notification.read_all';

class DomainEventBus {
    private transactionalEmitter = new EventEmitter();
    private postCommitEmitter = new EventEmitter();

    /**
     * Subscribe to an event that executes within the transaction.
     * Perfect for persisting related records (like notifications).
     */
    public onTransactional(event: EventName, listener: (tx: TxContext, payload: DomainEventPayload) => void | Promise<void>) {
        this.transactionalEmitter.on(event, listener);
    }

    /**
     * Subscribe to an event that executes after the transaction successfully commits.
     * Perfect for delivery (e.g., SSE, Email, Webhooks).
     */
    public onPostCommit(event: EventName, listener: (payload: DomainEventPayload) => void | Promise<void>) {
        this.postCommitEmitter.on(event, listener);
    }

    /**
     * Emit a domain event.
     * Executes all transactional listeners synchronously.
     * Enqueues all post-commit listeners to run only if the transaction commits.
     */
    public async emit(tx: TxContext, event: EventName, payload: DomainEventPayload) {
        // Run transactional listeners
        const txListeners = this.transactionalEmitter.listeners(event);
        for (const listener of txListeners) {
            await listener(tx, payload);
        }

        // Enqueue post-commit emission
        tx.addPostCommitHook(async () => {
            const pcListeners = this.postCommitEmitter.listeners(event);
            for (const listener of pcListeners) {
                try {
                    await listener(payload);
                } catch (e) {
                    console.error(`Error in post-commit listener for ${event}:`, e);
                }
            }
        });
    }
}

export const EventBus = new DomainEventBus();
