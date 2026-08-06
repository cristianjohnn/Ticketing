import { db, TxContext } from '../config/db';
import { EventBus, DomainEventPayload } from '../utils/EventBus';
import { CSAT_CONFIG } from '../config/csat.config';
import crypto from 'crypto';

export class NotificationService {
    public static initialize() {
        // Bind to transactional events
        EventBus.onTransactional('collaboration.requested', this.handleCollaborationRequested);
        EventBus.onTransactional('collaboration.approved', this.handleCollaborationApproved);
        EventBus.onTransactional('collaboration.rejected', this.handleCollaborationRejected);
        
        EventBus.onTransactional('ticket.transfer_requested', this.handleTransferRequested);
        EventBus.onTransactional('ticket.transfer_approved', this.handleTransferApproved);
        EventBus.onTransactional('ticket.transfer_rejected', this.handleTransferRejected);
        EventBus.onTransactional('ticket.transfer_cancelled', this.handleTransferCancelled);
        EventBus.onTransactional('ticket.transfer_expired', this.handleTransferExpired);
        EventBus.onTransactional('ticket.transfer_invalidated', this.handleTransferInvalidated);

        // CSAT Event Bindings
        EventBus.onTransactional('ticket.resolved', this.handleTicketResolved);
        EventBus.onTransactional('ticket.reopened', this.handleTicketReopened);
        EventBus.onTransactional('ticket.rated', this.handleTicketRated);
        EventBus.onTransactional('csat.low_score_alert', this.handleLowScoreAlert);
    }

    private static async insertNotification(
        tx: TxContext, 
        recipientId: string, 
        actorId: string | undefined, 
        type: string, 
        entityType: string, 
        entityId: string, 
        title: string, 
        message: string, 
        metadata?: any
    ) {
        let validActorId: string | null = null;
        if (actorId) {
            const userCheck = await tx.query('SELECT id FROM users WHERE id = $1 OR username ILIKE $2 LIMIT 1', [actorId, actorId]);
            if (userCheck.rows && userCheck.rows.length > 0) {
                validActorId = userCheck.rows[0].id;
            }
        }

        const id = crypto.randomUUID();
        await tx.query(`
            INSERT INTO notifications (
                id, recipient_id, actor_id, type, entity_type, entity_id, title, message, metadata
            ) VALUES (
                @id, @recipient_id, @actor_id, @type, @entity_type, @entity_id, @title, @message, @metadata
            )
        `, {
            id,
            recipient_id: recipientId,
            actor_id: validActorId,
            type,
            entity_type: entityType,
            entity_id: entityId,
            title,
            message,
            metadata: metadata ? JSON.stringify(metadata) : null
        });

        // Emit notification.created so SSE can push it to the specific recipient
        await EventBus.emit(tx, 'notification.created', {
            actorId: actorId || 'system',
            entityId: id, // notification ID
            entityType: 'notification',
            metadata: {
                recipientId,
                type,
                entityType,
                entityId: entityId,
                title,
                message
            }
        });
    }

    private static async markNotificationsNotActionable(tx: TxContext, requestId: string) {
        if (!requestId) return;
        const result = await tx.query(`
            UPDATE notifications 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"actionable": false}'::jsonb
            WHERE (entity_id = $1 OR metadata->>'requestId' = $1) 
              AND (metadata->>'actionable' IS NULL OR metadata->>'actionable' != 'false')
            RETURNING *
        `, [requestId]);

        for (const row of result.rows) {
            await EventBus.emit(tx, 'notification.updated', {
                actorId: 'system',
                entityId: row.id,
                entityType: 'notification',
                metadata: {
                    recipientId: row.recipient_id,
                    notificationId: row.id,
                    actionable: false
                }
            });
        }
    }

    private static handleCollaborationRequested = async (tx: TxContext, payload: DomainEventPayload) => {
        // Need to find the ticket owner
        const res = await tx.query('SELECT primary_assignee_id FROM tickets WHERE id = $1', [payload.entityId]);
        const ownerId = res.rows[0]?.primary_assignee_id;
        
        if (ownerId) {
            await NotificationService.insertNotification(
                tx,
                ownerId,
                payload.actorId,
                'COLLABORATION_REQUESTED',
                payload.entityType,
                payload.entityId,
                'New Collaboration Request',
                `A user has requested to collaborate on ticket ${payload.entityId}`,
                payload.metadata
            );
        }
    };

    private static handleCollaborationApproved = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);
        
        // recipient is in metadata.requesterId
        const requesterId = payload.metadata?.requesterId || payload.metadata?.collaboratorId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'COLLABORATION_APPROVED',
                payload.entityType,
                payload.entityId,
                'Collaboration Approved',
                `Your request to collaborate on ticket ${payload.entityId} was approved.`,
                payload.metadata
            );
        }
    };

    private static handleCollaborationRejected = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'COLLABORATION_REJECTED',
                payload.entityType,
                payload.entityId,
                'Collaboration Rejected',
                `Your request to collaborate on ticket ${payload.entityId} was rejected.`,
                payload.metadata
            );
        }
    };

    private static handleTransferRequested = async (tx: TxContext, payload: DomainEventPayload) => {
        const targetUserId = payload.metadata?.targetUserId;
        if (targetUserId) {
            await NotificationService.insertNotification(
                tx,
                targetUserId,
                payload.actorId,
                'TICKET_TRANSFER_REQUESTED',
                payload.entityType,
                payload.entityId,
                'New Transfer Request',
                `You have been asked to take ownership of ticket ${payload.metadata?.ticketId}.`,
                payload.metadata
            );
        }
    };

    private static handleTransferApproved = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'TICKET_TRANSFER_APPROVED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Approved',
                `Your request to transfer ticket ${payload.entityId} was approved.`,
                payload.metadata
            );
        }
    };

    private static handleTransferRejected = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'TICKET_TRANSFER_REJECTED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Rejected',
                `Your request to transfer ticket ${payload.entityId} was rejected.`,
                payload.metadata
            );
        }
    };

    private static handleTransferCancelled = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const targetUserId = payload.metadata?.targetUserId;
        if (targetUserId) {
            await NotificationService.insertNotification(
                tx,
                targetUserId,
                payload.actorId,
                'TICKET_TRANSFER_CANCELLED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Cancelled',
                `The request to transfer ticket ${payload.entityId} to you has been cancelled.`,
                payload.metadata
            );
        }
    };

    private static handleTransferExpired = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'TICKET_TRANSFER_EXPIRED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Expired',
                `Your request to transfer ticket ${payload.entityId} has expired.`,
                payload.metadata
            );
        }
    };

    private static handleTransferInvalidated = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        if (requestId) {
            await NotificationService.markNotificationsNotActionable(tx, requestId);
        }

        const requesterId = payload.metadata?.requesterId;
        const targetUserId = payload.metadata?.targetUserId;

        // If we don't have requester/target in metadata (e.g., from generic invalidation), we could fetch it, 
        // but let's just attempt to notify if they are provided. For the system-wide invalidations, we might need to 
        // fetch the pending requests first to notify them. 
        if (requesterId) {
            await NotificationService.insertNotification(tx, requesterId, payload.actorId, 'TICKET_TRANSFER_INVALIDATED', payload.entityType, payload.entityId, 'Transfer Request Closed', `Your request to transfer ticket ${payload.entityId} was automatically closed due to a change in the ticket state.`, payload.metadata);
        }
        if (targetUserId) {
            await NotificationService.insertNotification(tx, targetUserId, payload.actorId, 'TICKET_TRANSFER_INVALIDATED', payload.entityType, payload.entityId, 'Transfer Request Closed', `The pending request to transfer ticket ${payload.entityId} to you was automatically closed due to a change in the ticket state.`, payload.metadata);
        }
    };

    /**
     * Handle ticket resolution -> create CSAT survey notification with strict deduplication
     */
    private static handleTicketResolved = async (tx: TxContext, payload: DomainEventPayload) => {
        const ticketId = payload.entityId;

        // Fetch ticket details
        const ticketRes = await tx.query(`
            SELECT id, title, status, requester, "userId", primary_assignee_id, resolved_at, resolving_assignee_id 
            FROM tickets 
            WHERE id = $1
        `, [ticketId]);

        if (!ticketRes.rows || ticketRes.rows.length === 0) return;
        const ticket = ticketRes.rows[0];

        // 1. Resolve recipient (the client / ticket requester)
        let recipientId = ticket.userId;
        if (!recipientId && ticket.requester) {
            const userRes = await tx.query('SELECT id FROM users WHERE username ILIKE $1 LIMIT 1', [ticket.requester]);
            recipientId = userRes.rows[0]?.id;
        }

        if (!recipientId) {
            console.warn(`[NotificationService] Cannot send CSAT survey for ticket ${ticketId}: Requester ID could not be identified.`);
            return;
        }

        // 2. Deduplication Check A: Verify if ticket has already been rated (reopening invariant)
        const ratingRes = await tx.query('SELECT id FROM ticket_ratings WHERE ticket_id = $1', [ticketId]);
        if (ratingRes.rows && ratingRes.rows.length > 0) {
            console.log(`[NotificationService] Skipping CSAT survey notification for ticket ${ticketId}: Ticket already rated.`);
            return;
        }

        // 3. Deduplication Check B: Verify if an outstanding CSAT survey notification already exists for this ticket
        const existingNotifRes = await tx.query(`
            SELECT id 
            FROM notifications 
            WHERE recipient_id = $1 
              AND type = 'CSAT_SURVEY_REQUESTED'
              AND (entity_id = $2 OR metadata->>'ticketId' = $2)
        `, [recipientId, ticketId]);

        if (existingNotifRes.rows && existingNotifRes.rows.length > 0) {
            console.log(`[NotificationService] Skipping duplicate CSAT survey notification for ticket ${ticketId}: Notification already exists.`);
            return;
        }

        // 4. Calculate expiration timestamp (14 days from resolved_at or now)
        const resolvedDate = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date();
        const expiresAt = new Date(resolvedDate.getTime() + CSAT_CONFIG.SURVEY_EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

        // 5. Insert actionable CSAT survey notification with deep-link metadata
        await NotificationService.insertNotification(
            tx,
            recipientId,
            payload.actorId || ticket.resolving_assignee_id || 'system',
            'CSAT_SURVEY_REQUESTED',
            'ticket',
            ticketId,
            'Rate your support experience',
            `Your ticket "${ticket.title}" has been resolved. Please rate the service you received.`,
            {
                ticketId: ticket.id,
                ticketTitle: ticket.title,
                actionable: true,
                modalTarget: 'RATING_MODAL',
                actionUrl: `/tickets/${ticket.id}?action=rate`,
                resolvedAt: resolvedDate.toISOString(),
                expiresAt
            }
        );
    };

    /**
     * Handle ticket reopened -> invalidate CSAT survey notification
     */
    private static handleTicketReopened = async (tx: TxContext, payload: DomainEventPayload) => {
        const ticketId = payload.metadata?.ticketId || payload.entityId;
        if (!ticketId) return;

        const result = await tx.query(`
            UPDATE notifications 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"actionable": false, "status": "INVALIDATED"}'::jsonb
            WHERE (entity_id = $1 OR metadata->>'ticketId' = $1)
              AND type = 'CSAT_SURVEY_REQUESTED'
              AND metadata->>'actionable' = 'true'
            RETURNING *
        `, [ticketId]);

        for (const row of result.rows) {
            await EventBus.emit(tx, 'notification.updated', {
                actorId: payload.actorId || 'system',
                entityId: row.id,
                entityType: 'notification',
                metadata: {
                    recipientId: row.recipient_id,
                    notificationId: row.id,
                    actionable: false
                }
            });
        }
    };

    /**
     * Handle ticket rated -> mark CSAT survey notifications as completed & non-actionable
     */
    private static handleTicketRated = async (tx: TxContext, payload: DomainEventPayload) => {
        const ticketId = payload.metadata?.ticketId || payload.entityId;
        if (!ticketId) return;

        // Mark any survey notifications for this ticket as non-actionable and read
        const result = await tx.query(`
            UPDATE notifications 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"actionable": false, "status": "COMPLETED"}'::jsonb,
                read_at = COALESCE(read_at, NOW())
            WHERE (entity_id = $1 OR metadata->>'ticketId' = $1)
              AND type = 'CSAT_SURVEY_REQUESTED'
            RETURNING *
        `, [ticketId]);

        // Push real-time SSE update so open client sessions immediately disable action buttons & decrement badge counter
        for (const row of result.rows) {
            await EventBus.emit(tx, 'notification.updated', {
                actorId: payload.actorId || 'system',
                entityId: row.id,
                entityType: 'notification',
                metadata: {
                    recipientId: row.recipient_id,
                    notificationId: row.id,
                    actionable: false,
                    read_at: row.read_at
                }
            });
        }

        // Send a TICKET_RATED notification to the technician
        const technicianId = payload.metadata?.technicianId;
        const rating = payload.metadata?.rating;
        const clientId = payload.metadata?.clientId;
        const feedbackPreview = payload.metadata?.feedbackPreview || payload.metadata?.feedback?.substring(0, 50) || null;
        const submittedAt = payload.metadata?.submittedAt;
        const responseTimeSeconds = payload.metadata?.responseTimeSeconds;

        if (technicianId) {
            await NotificationService.insertNotification(
                tx,
                technicianId,
                payload.actorId || 'system',
                'TICKET_RATED',
                'ticket',
                ticketId,
                'Ticket Rated',
                `Your support for Ticket #${ticketId} received a ${rating}-star rating.`,
                {
                    ticketId,
                    rating,
                    technicianId,
                    clientId,
                    feedbackPreview,
                    responseTimeSeconds,
                    submittedAt,
                    action: 'OPEN_TICKET'
                }
            );
        }
    };

    /**
     * Handle low score alert -> notify system administrators
     */
    private static handleLowScoreAlert = async (tx: TxContext, payload: DomainEventPayload) => {
        const adminRes = await tx.query("SELECT id FROM users WHERE role = 'admin'");
        const rating = payload.metadata?.rating;
        const ticketId = payload.metadata?.ticketId;
        const feedbackPreview = payload.metadata?.feedbackPreview || payload.metadata?.feedback?.substring(0, 50) || null;
        const technicianId = payload.metadata?.technicianId;
        const clientId = payload.metadata?.clientId;
        const submittedAt = payload.metadata?.submittedAt;
        const responseTimeSeconds = payload.metadata?.responseTimeSeconds;

        const message = feedbackPreview 
            ? `Ticket ${ticketId} received a low rating of ${rating} stars: "${feedbackPreview}".`
            : `Ticket ${ticketId} received a low rating of ${rating} stars. Review may be required.`;

        for (const admin of adminRes.rows) {
            await NotificationService.insertNotification(
                tx,
                admin.id,
                payload.actorId || 'system',
                'CSAT_LOW_SCORE_ALERT',
                'rating',
                payload.entityId,
                'Low CSAT Score Alert',
                message,
                {
                    ticketId,
                    rating,
                    technicianId,
                    clientId,
                    feedbackPreview,
                    submittedAt,
                    responseTimeSeconds,
                    action: 'OPEN_TICKET'
                }
            );
        }
    };
}

