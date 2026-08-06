import { db, TxContext } from '../config/db';
import { TicketHistory, TicketCollaborator } from '../types';
import crypto from 'crypto';
import { EventBus } from '../utils/EventBus';

export class TicketWorkflowService {
    
    /**
     * Helper to log an extensible event in ticket_history.
     * Overloaded to accept an optional transaction context.
     */
    public static async logEvent(txOrTicketId: TxContext | string, actorIdOrTicketId: string, eventTypeOrActorId: string, eventDataOrEventType: any, maybeEventData?: any): Promise<void> {
        let tx: TxContext | null = null;
        let ticketId: string;
        let actorId: string;
        let eventType: string;
        let eventData: any;

        if (typeof txOrTicketId === 'object' && txOrTicketId !== null) {
            tx = txOrTicketId as TxContext;
            ticketId = actorIdOrTicketId;
            actorId = eventTypeOrActorId;
            eventType = eventDataOrEventType;
            eventData = maybeEventData;
        } else {
            ticketId = txOrTicketId as string;
            actorId = actorIdOrTicketId;
            eventType = eventTypeOrActorId;
            eventData = eventDataOrEventType;
        }

        const queryFn = tx ? tx.query.bind(tx) : db.query.bind(db);

        await queryFn(`
            INSERT INTO ticket_history ("ticket_id", "actor_id", "event_type", "event_data")
            VALUES (@ticket_id, @actor_id, @event_type, @event_data)
        `, {
            ticket_id: ticketId,
            actor_id: actorId,
            event_type: eventType,
            event_data: JSON.stringify(eventData)
        });
    }

    /**
     * Get the event history for a ticket
     */
    public static async getHistory(ticketId: string): Promise<TicketHistory[]> {
        const res = await db.query(`
            SELECT * FROM ticket_history 
            WHERE ticket_id = $1 
            ORDER BY created_at DESC
        `, [ticketId]);
        return res.rows as TicketHistory[];
    }

    /**
     * Get collaborators for a ticket
     */
    public static async getCollaborators(ticketId: string): Promise<TicketCollaborator[]> {
        const res = await db.query(`
            SELECT tc.*, u.username, u."fullName"
            FROM ticket_collaborators tc
            LEFT JOIN users u ON tc.user_id = u.id
            WHERE tc.ticket_id = $1
        `, [ticketId]);
        return res.rows as TicketCollaborator[];
    }

    /**
     * Claim an unassigned ticket
     */
    public static async claimTicket(ticketId: string, actorId: string, actorName: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const existingRes = await tx.query('SELECT status, assignee, primary_assignee_id FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (existingRes.rowCount === 0) throw new Error('Ticket not found');
            const existing = existingRes.rows[0];

            if (existing.primary_assignee_id && existing.primary_assignee_id !== actorId) {
                throw new Error('Ticket is already assigned to someone else.');
            }

            const newStatus = existing.status === 'New' || existing.status === 'Open' ? 'Assigned' : existing.status;

            await tx.query(`
                UPDATE tickets 
                SET "primary_assignee_id" = @actor_id,
                    "assignee" = @actor_name,
                    "status" = @status,
                    "updatedAt" = @now
                WHERE id = @ticket_id
            `, {
                actor_id: actorId,
                actor_name: actorName,
                status: newStatus,
                now: new Date(),
                ticket_id: ticketId
            });

            await this.logEvent(tx, ticketId, actorId, 'claimed', {
                old_status: existing.status,
                new_status: newStatus,
                assignee_id: actorId,
                assignee_name: actorName
            });

            await EventBus.emit(tx, 'ticket.claimed', {
                actorId,
                entityId: ticketId,
                entityType: 'ticket',
                metadata: { newStatus, assigneeId: actorId }
            });
        });
    }

    /**
     * Assign a ticket to a specific user
     */
    public static async assignTicket(ticketId: string, targetUserId: string, targetUserName: string, actorId: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const existingRes = await tx.query('SELECT status FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (existingRes.rowCount === 0) throw new Error('Ticket not found');
            const existing = existingRes.rows[0];

            const newStatus = existing.status === 'New' || existing.status === 'Open' ? 'Assigned' : existing.status;

            await tx.query(`
                UPDATE tickets 
                SET "primary_assignee_id" = @target_user_id,
                    "assignee" = @target_user_name,
                    "status" = @status,
                    "updatedAt" = @now
                WHERE id = @ticket_id
            `, {
                target_user_id: targetUserId,
                target_user_name: targetUserName,
                status: newStatus,
                now: new Date(),
                ticket_id: ticketId
            });

            await this.logEvent(tx, ticketId, actorId, 'assigned', {
                old_status: existing.status,
                new_status: newStatus,
                assignee_id: targetUserId,
                assignee_name: targetUserName
            });

            await EventBus.emit(tx, 'ticket.transferred', {
                actorId,
                entityId: ticketId,
                entityType: 'ticket',
                metadata: { newStatus, assigneeId: targetUserId }
            });
        });
    }

    /**
     * Transfer ownership of a ticket to another technician
     */
    public static async transferTicket(
        ticketId: string, 
        targetUserId: string, 
        reason: string, 
        remainCollaborator: boolean, 
        actorId: string,
        actorRole: string
    ): Promise<void> {
        await db.withTransaction(async (tx) => {
            const existingRes = await tx.query('SELECT status, department, primary_assignee_id FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (existingRes.rowCount === 0) throw new Error('Ticket not found');
            const existing = existingRes.rows[0];

            if (actorRole !== 'admin' && existing.primary_assignee_id !== actorId) {
                throw new Error('Only the primary assignee or an administrator can transfer ownership of this ticket.');
            }

            const targetUserRes = await tx.query('SELECT id, "fullName", role FROM users WHERE id = $1', [targetUserId]);
            if (targetUserRes.rowCount === 0) throw new Error('Target technician not found.');
            const targetUser = targetUserRes.rows[0];
            
            if (targetUser.role !== 'it-support' && targetUser.role !== 'admin') {
                throw new Error('Target user must be an IT Support technician or Administrator.');
            }

            const newStatus = existing.status === 'New' || existing.status === 'Open' ? 'Assigned' : existing.status;

            await tx.query(`
                UPDATE tickets 
                SET "primary_assignee_id" = @target_user_id,
                    "assignee" = @target_user_name,
                    "status" = @status,
                    "updatedAt" = @now
                WHERE id = @ticket_id
            `, {
                target_user_id: targetUserId,
                target_user_name: targetUser.fullName,
                status: newStatus,
                now: new Date(),
                ticket_id: ticketId
            });

            if (remainCollaborator && existing.primary_assignee_id) {
                await tx.query(`
                    INSERT INTO ticket_collaborators ("ticket_id", "user_id")
                    VALUES (@ticket_id, @user_id)
                    ON CONFLICT ("ticket_id", "user_id") DO NOTHING
                `, {
                    ticket_id: ticketId,
                    user_id: existing.primary_assignee_id
                });
            } else if (!remainCollaborator && existing.primary_assignee_id) {
                await tx.query(`
                    DELETE FROM ticket_collaborators 
                    WHERE ticket_id = @ticket_id AND user_id = @user_id
                `, {
                    ticket_id: ticketId,
                    user_id: existing.primary_assignee_id
                });
            }

            await this.logEvent(tx, ticketId, actorId, 'ownership_transferred', {
                previousOwnerId: existing.primary_assignee_id,
                newOwnerId: targetUserId,
                newOwnerName: targetUser.fullName,
                reason: reason || null,
                remainedCollaborator: remainCollaborator
            });

            await tx.query(`
                UPDATE ticket_transfer_requests
                SET status = 'invalidated', updated_at = NOW()
                WHERE ticket_id = $1 AND status = 'pending'
            `, [ticketId]);

            await EventBus.emit(tx, 'ticket.transferred', {
                actorId,
                entityId: ticketId,
                entityType: 'ticket',
                metadata: { newOwnerId: targetUserId, previousOwnerId: existing.primary_assignee_id }
            });
        });
    }

    /**
     * Request Transfer (Support Reps)
     */
    public static async requestTransfer(ticketId: string, requesterId: string, targetUserId: string, reason?: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const ticketRes = await tx.query('SELECT status, primary_assignee_id FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (ticketRes.rowCount === 0) throw new Error('Ticket not found');
            const ticket = ticketRes.rows[0];

            if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
                throw new Error('Cannot request transfer for a resolved or closed ticket.');
            }
            if (ticket.primary_assignee_id !== requesterId) {
                throw new Error('Only the current owner can request to transfer this ticket.');
            }

            const targetUserRes = await tx.query('SELECT id, "fullName", role FROM users WHERE id = $1', [targetUserId]);
            if (targetUserRes.rowCount === 0) throw new Error('Target technician not found.');
            const targetUser = targetUserRes.rows[0];
            if (targetUser.role !== 'it-support' && targetUser.role !== 'admin') {
                throw new Error('Target user must be an IT Support technician or Administrator.');
            }
            if (targetUser.id === requesterId) {
                throw new Error('Cannot transfer a ticket to yourself.');
            }

            const pendingRes = await tx.query(`
                SELECT 1 FROM ticket_transfer_requests 
                WHERE ticket_id = $1 AND status = 'pending'
            `, [ticketId]);
            if ((pendingRes.rowCount ?? 0) > 0) throw new Error('There is already a pending transfer request for this ticket.');

            const requestId = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await tx.query(`
                INSERT INTO ticket_transfer_requests (id, ticket_id, requester_id, target_user_id, status, expires_at)
                VALUES ($1, $2, $3, $4, 'pending', $5)
            `, [requestId, ticketId, requesterId, targetUserId, expiresAt]);

            const userRes = await tx.query('SELECT "fullName" FROM users WHERE id = $1', [requesterId]);
            const requesterName = userRes.rows[0]?.fullName || requesterId;

            await this.logEvent(tx, ticketId, requesterId, 'transfer_requested', {
                requestId,
                requester_name: requesterName,
                target_user_id: targetUserId,
                target_user_name: targetUser.fullName,
                reason: reason || null
            });

            await EventBus.emit(tx, 'ticket.transfer_requested', {
                actorId: requesterId,
                entityId: requestId,
                entityType: 'transfer_request',
                metadata: {
                    ticketId,
                    requesterId,
                    requesterName,
                    targetUserId,
                    targetUserName: targetUser.fullName,
                    reason: reason || null
                }
            });
        });
    }

    /**
     * Cancel Transfer Request (by requester)
     */
    public static async cancelTransfer(requestId: string, requesterId: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const reqRes = await tx.query('SELECT * FROM ticket_transfer_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (reqRes.rowCount === 0) throw new Error('Transfer request not found');
            const request = reqRes.rows[0];

            if (request.status !== 'pending') throw new Error(`Transfer request is already ${request.status}`);
            if (request.requester_id !== requesterId) throw new Error('Only the requester can cancel the transfer request.');

            await tx.query(`
                UPDATE ticket_transfer_requests 
                SET status = 'cancelled', responded_at = NOW(), updated_at = NOW()
                WHERE id = $1
            `, [requestId]);

            await this.logEvent(tx, request.ticket_id, requesterId, 'transfer_cancelled', {
                request_id: requestId
            });

            await EventBus.emit(tx, 'ticket.transfer_cancelled', {
                actorId: requesterId,
                entityId: request.ticket_id,
                entityType: 'ticket',
                metadata: { requestId, targetUserId: request.target_user_id }
            });
        });
    }

    /**
     * Approve Transfer Request (by target technician)
     */
    public static async approveTransfer(requestId: string, approverId: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const reqRes = await tx.query('SELECT * FROM ticket_transfer_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (reqRes.rowCount === 0) throw new Error('Transfer request not found');
            const request = reqRes.rows[0];

            if (request.status !== 'pending') throw new Error(`Transfer request is already ${request.status}`);
            if (request.target_user_id !== approverId) throw new Error('Only the target technician can approve this request.');
            
            // Lazy expiration check
            if (new Date(request.expires_at).getTime() < Date.now()) {
                await tx.query(`UPDATE ticket_transfer_requests SET status = 'expired', updated_at = NOW() WHERE id = $1`, [requestId]);
                await this.logEvent(tx, request.ticket_id, 'system', 'transfer_expired', { request_id: requestId });
                await EventBus.emit(tx, 'ticket.transfer_expired', {
                    actorId: 'system', entityId: request.ticket_id, entityType: 'ticket', metadata: { requestId, requesterId: request.requester_id, targetUserId: request.target_user_id }
                });
                throw new Error('This transfer request has expired.');
            }

            const ticketRes = await tx.query('SELECT status, primary_assignee_id FROM tickets WHERE id = $1 FOR UPDATE', [request.ticket_id]);
            if (ticketRes.rowCount === 0) throw new Error('Ticket not found');
            const ticket = ticketRes.rows[0];

            if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
                await tx.query(`UPDATE ticket_transfer_requests SET status = 'invalidated', updated_at = NOW() WHERE id = $1`, [requestId]);
                await this.logEvent(tx, request.ticket_id, 'system', 'transfer_invalidated', { request_id: requestId });
                throw new Error('Ticket is no longer active, transfer request invalidated.');
            }

            const approverRes = await tx.query('SELECT "fullName" FROM users WHERE id = $1', [approverId]);
            const approverName = approverRes.rows[0].fullName;

            await tx.query(`
                UPDATE ticket_transfer_requests 
                SET status = 'approved', responded_at = NOW(), updated_at = NOW()
                WHERE id = $1
            `, [requestId]);

            const newStatus = ticket.status === 'New' || ticket.status === 'Open' ? 'Assigned' : ticket.status;

            await tx.query(`
                UPDATE tickets 
                SET "primary_assignee_id" = @target_user_id,
                    "assignee" = @target_user_name,
                    "status" = @status,
                    "updatedAt" = @now
                WHERE id = @ticket_id
            `, {
                target_user_id: approverId,
                target_user_name: approverName,
                status: newStatus,
                now: new Date(),
                ticket_id: request.ticket_id
            });

            await this.logEvent(tx, request.ticket_id, approverId, 'transfer_approved', {
                request_id: requestId,
                newOwnerId: approverId,
                newOwnerName: approverName,
                previousOwnerId: ticket.primary_assignee_id
            });
            await this.logEvent(tx, request.ticket_id, approverId, 'ownership_transferred', {
                previousOwnerId: ticket.primary_assignee_id,
                newOwnerId: approverId,
                newOwnerName: approverName,
                reason: 'Transfer request approved',
                remainedCollaborator: false // Explicit decision: if they want to collaborate they can add themselves
            });

            await EventBus.emit(tx, 'ticket.transfer_approved', {
                actorId: approverId,
                entityId: request.ticket_id,
                entityType: 'ticket',
                metadata: { requestId, newOwnerId: approverId, previousOwnerId: ticket.primary_assignee_id, requesterId: request.requester_id }
            });
        });
    }

    /**
     * Reject Transfer Request (by target technician)
     */
    public static async rejectTransfer(requestId: string, approverId: string, reason?: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const reqRes = await tx.query('SELECT * FROM ticket_transfer_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (reqRes.rowCount === 0) throw new Error('Transfer request not found');
            const request = reqRes.rows[0];

            if (request.status !== 'pending') throw new Error(`Transfer request is already ${request.status}`);
            if (request.target_user_id !== approverId) throw new Error('Only the target technician can reject this request.');

            // Lazy expiration check
            if (new Date(request.expires_at).getTime() < Date.now()) {
                await tx.query(`UPDATE ticket_transfer_requests SET status = 'expired', updated_at = NOW() WHERE id = $1`, [requestId]);
                await this.logEvent(tx, request.ticket_id, 'system', 'transfer_expired', { request_id: requestId });
                await EventBus.emit(tx, 'ticket.transfer_expired', {
                    actorId: 'system', entityId: request.ticket_id, entityType: 'ticket', metadata: { requestId, requesterId: request.requester_id, targetUserId: request.target_user_id }
                });
                throw new Error('This transfer request has expired.');
            }

            await tx.query(`
                UPDATE ticket_transfer_requests 
                SET status = 'rejected', rejection_reason = $1, responded_at = NOW(), updated_at = NOW()
                WHERE id = $2
            `, [reason || null, requestId]);

            await this.logEvent(tx, request.ticket_id, approverId, 'transfer_rejected', {
                request_id: requestId,
                requester_id: request.requester_id,
                reason: reason || null
            });

            await EventBus.emit(tx, 'ticket.transfer_rejected', {
                actorId: approverId,
                entityId: request.ticket_id,
                entityType: 'ticket',
                metadata: { requestId, requesterId: request.requester_id }
            });
        });
    }

    /**
     * Add a collaborator (secondary support)
     */
    public static async addCollaborator(ticketId: string, targetUserId: string, actorId: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const existingRes = await tx.query('SELECT 1 FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (existingRes.rowCount === 0) throw new Error('Ticket not found');

            const userRes = await tx.query('SELECT "fullName" FROM users WHERE id = $1', [targetUserId]);
            if (userRes.rowCount === 0) throw new Error('Target user not found');
            const targetName = userRes.rows[0].fullName;

            const collabRes = await tx.query('SELECT 1 FROM ticket_collaborators WHERE ticket_id = $1 AND user_id = $2', [ticketId, targetUserId]);
            if ((collabRes.rowCount ?? 0) > 0) throw new Error('This user is already a collaborator.');

            await tx.query(`
                INSERT INTO ticket_collaborators ("ticket_id", "user_id")
                VALUES (@ticket_id, @user_id)
            `, {
                ticket_id: ticketId,
                user_id: targetUserId
            });

            await this.logEvent(tx, ticketId, actorId, 'collaborator_added', {
                collaborator_id: targetUserId,
                collaborator_name: targetName
            });
            
            // Domain event could be generic ticket update
            await EventBus.emit(tx, 'ticket.status_updated', {
                actorId,
                entityId: ticketId,
                entityType: 'ticket'
            });
        });
    }

    public static async requestCollaboration(ticketId: string, requesterId: string, targetUserId?: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const ticketRes = await tx.query('SELECT primary_assignee_id FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (ticketRes.rowCount === 0) throw new Error('Ticket not found');
            const ticket = ticketRes.rows[0];

            // If targetUserId is provided, this is an invite from the requester to the target user.
            // If it's not provided, it's a join request from the requester to the ticket owner.
            const userToCheck = targetUserId || requesterId;

            const collabRes = await tx.query('SELECT 1 FROM ticket_collaborators WHERE ticket_id = $1 AND user_id = $2', [ticketId, userToCheck]);
            if ((collabRes.rowCount ?? 0) > 0) throw new Error(targetUserId ? 'User is already a collaborator.' : 'You are already a collaborator.');

            const pendingRes = await tx.query(`
                SELECT 1 FROM ticket_collaboration_requests 
                WHERE ticket_id = $1 AND (requester_id = $2 OR target_user_id = $2) AND status = 'pending'
            `, [ticketId, userToCheck]);
            if ((pendingRes.rowCount ?? 0) > 0) throw new Error(targetUserId ? 'There is already a pending request for this user.' : 'You already have a pending collaboration request.');

            const requestId = crypto.randomUUID();
            await tx.query(`
                INSERT INTO ticket_collaboration_requests (id, ticket_id, requester_id, target_user_id, status)
                VALUES ($1, $2, $3, $4, 'pending')
            `, [requestId, ticketId, requesterId, targetUserId || null]);

            const userRes = await tx.query('SELECT "fullName" FROM users WHERE id = $1', [requesterId]);
            const requesterName = userRes.rows[0]?.fullName || requesterId;

            let targetName = null;
            if (targetUserId) {
                const targetRes = await tx.query('SELECT "fullName" FROM users WHERE id = $1', [targetUserId]);
                targetName = targetRes.rows[0]?.fullName || targetUserId;
            }

            await this.logEvent(tx, ticketId, requesterId, 'collaboration_requested', {
                requestId,
                requester_name: requesterName,
                target_user_id: targetUserId,
                target_user_name: targetName,
                is_invite: !!targetUserId
            });

            await EventBus.emit(tx, 'collaboration.requested', {
                actorId: requesterId,
                entityId: requestId,
                entityType: 'collaboration_request',
                metadata: {
                    ticketId,
                    requesterName,
                    targetUserId,
                    targetUserName: targetName,
                    isInvite: !!targetUserId,
                    ownerId: ticket.primary_assignee_id
                }
            });
        });
    }

    /**
     * Approve Collaboration Request
     */
    public static async approveCollaboration(requestId: string, approverId: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const reqRes = await tx.query('SELECT * FROM ticket_collaboration_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (reqRes.rowCount === 0) throw new Error('Request not found');
            const request = reqRes.rows[0];

            if (request.status !== 'pending') throw new Error(`Request is already ${request.status}`);

            await tx.query(`
                UPDATE ticket_collaboration_requests 
                SET status = 'approved', approver_id = $1, responded_at = NOW(), updated_at = NOW()
                WHERE id = $2
            `, [approverId, requestId]);

            const collaboratorId = request.target_user_id || request.requester_id;

            await tx.query(`
                INSERT INTO ticket_collaborators ("ticket_id", "user_id")
                VALUES ($1, $2)
                ON CONFLICT ("ticket_id", "user_id") DO NOTHING
            `, [request.ticket_id, collaboratorId]);

            const userRes = await tx.query('SELECT "fullName" FROM users WHERE id = $1', [collaboratorId]);
            const collaboratorName = userRes.rows[0]?.fullName || collaboratorId;

            await this.logEvent(tx, request.ticket_id, approverId, 'collaboration_approved', {
                request_id: requestId,
                collaborator_id: collaboratorId,
                collaborator_name: collaboratorName
            });

            await EventBus.emit(tx, 'collaboration.approved', {
                actorId: approverId,
                entityId: request.ticket_id,
                entityType: 'ticket',
                metadata: { requestId, collaboratorId }
            });
        });
    }

    /**
     * Reject Collaboration Request
     */
    public static async rejectCollaboration(requestId: string, approverId: string, reason?: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const reqRes = await tx.query('SELECT * FROM ticket_collaboration_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (reqRes.rowCount === 0) throw new Error('Request not found');
            const request = reqRes.rows[0];

            if (request.status !== 'pending') throw new Error(`Request is already ${request.status}`);

            await tx.query(`
                UPDATE ticket_collaboration_requests 
                SET status = 'rejected', approver_id = $1, rejection_reason = $2, responded_at = NOW(), updated_at = NOW()
                WHERE id = $3
            `, [approverId, reason || null, requestId]);

            const userRes = await tx.query('SELECT "fullName" FROM users WHERE id = $1', [request.requester_id]);
            const requesterName = userRes.rows[0]?.fullName || request.requester_id;

            await this.logEvent(tx, request.ticket_id, approverId, 'collaboration_rejected', {
                request_id: requestId,
                requester_id: request.requester_id,
                requester_name: requesterName,
                reason: reason || null
            });

            await EventBus.emit(tx, 'collaboration.rejected', {
                actorId: approverId,
                entityId: request.ticket_id,
                entityType: 'ticket',
                metadata: { requestId, requesterId: request.requester_id }
            });
        });
    }

    /**
     * Get Pending Collaboration Requests for a ticket
     */
    public static async getPendingTransferRequests(ticketId: string): Promise<any[]> {
        const res = await db.query(`
            SELECT r.id, r.ticket_id, r.requester_id, r.target_user_id, r.status, r.created_at, r.expires_at,
                   u.username as "requesterUsername", u."fullName" as "requesterName",
                   tu.username as "targetUsername", tu."fullName" as "targetName"
            FROM ticket_transfer_requests r
            JOIN users u ON r.requester_id = u.id
            JOIN users tu ON r.target_user_id = tu.id
            WHERE r.ticket_id = $1 AND r.status = 'pending'
            ORDER BY r.created_at ASC
        `, [ticketId]);
        return res.rows;
    }

    public static async getPendingRequests(ticketId: string): Promise<any[]> {
        const res = await db.query(`
            SELECT r.id, r.ticket_id, r.requester_id, r.target_user_id, r.status, r.created_at, 
                   u.username, u."fullName" as "requesterName",
                   tu.username as "targetUsername", tu."fullName" as "targetName"
            FROM ticket_collaboration_requests r
            JOIN users u ON r.requester_id = u.id
            LEFT JOIN users tu ON r.target_user_id = tu.id
            WHERE r.ticket_id = $1 AND r.status = 'pending'
            ORDER BY r.created_at ASC
        `, [ticketId]);
        return res.rows;
    }

    /**
     * Reopen a resolved ticket (within 14 days)
     */
    public static async reopenTicket(ticketId: string, actorId: string): Promise<void> {
        await db.withTransaction(async (tx) => {
            const existingRes = await tx.query('SELECT status, "updatedAt" FROM tickets WHERE id = $1 FOR UPDATE', [ticketId]);
            if (existingRes.rowCount === 0) throw new Error('Ticket not found');
            const existing = existingRes.rows[0];

            if (existing.status !== 'Resolved' && existing.status !== 'Closed') {
                throw new Error('Only resolved or closed tickets can be reopened.');
            }

            const updatedAt = new Date(existing.updatedAt).getTime();
            const now = Date.now();
            const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);

            if (daysSinceUpdate > 14) {
                throw new Error('Tickets cannot be reopened after 14 days of being resolved.');
            }

            await tx.query(`
                UPDATE tickets 
                SET "status" = 'Open',
                    "updatedAt" = @now
                WHERE id = @ticket_id
            `, {
                now: new Date(),
                ticket_id: ticketId
            });

            await this.logEvent(tx, ticketId, actorId, 'reopened', {
                old_status: existing.status,
                new_status: 'Open',
                reason: 'Client requested reopen.'
            });

            await EventBus.emit(tx, 'ticket.reopened', {
                actorId,
                entityId: ticketId,
                entityType: 'ticket',
                metadata: { newStatus: 'Open' }
            });
        });
    }

    /**
     * Background task to expire pending transfer requests
     */
    public static startExpirationCleanupTask() {
        setInterval(async () => {
            try {
                const res = await db.query(`SELECT * FROM ticket_transfer_requests WHERE status = 'pending' AND expires_at < NOW()`);
                for (const request of res.rows) {
                    await db.withTransaction(async (tx) => {
                        const reqRes = await tx.query('SELECT * FROM ticket_transfer_requests WHERE id = $1 FOR UPDATE', [request.id]);
                        if (reqRes.rowCount === 0) return;
                        const req = reqRes.rows[0];
                        if (req.status !== 'pending') return;

                        await tx.query(`UPDATE ticket_transfer_requests SET status = 'expired', updated_at = NOW() WHERE id = $1`, [request.id]);
                        await this.logEvent(tx, request.ticket_id, 'system', 'transfer_expired', { request_id: request.id });
                        await EventBus.emit(tx, 'ticket.transfer_expired', {
                            actorId: 'system', 
                            entityId: request.ticket_id, 
                            entityType: 'ticket', 
                            metadata: { requestId: request.id, requesterId: request.requester_id, targetUserId: request.target_user_id }
                        });
                    });
                }
            } catch (err) {
                console.error('[TicketWorkflowService] Error running expiration cleanup task:', err);
            }
        }, 60 * 60 * 1000); // Run every hour
    }
}
