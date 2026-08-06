import { AppNotification } from '../types';
import { formatRelativeTime } from '../utils/formatters';
import { NotificationIconRegistry } from '../utils/NotificationIconRegistry';
import { BadgeViewModel, NotificationCardViewModel } from '../viewmodels/NotificationCardViewModel';
import { NotificationActionViewModel, NotificationDetailViewModel, NotificationMetadataItem,NotificationStoryViewModel } from '../viewmodels/NotificationDetailViewModel';

export class NotificationMapper {
    public static mapToViewModel(n: AppNotification, selectedId?: string): NotificationCardViewModel {
        const actorName = n.actor_full_name || n.actor_name || 'System';
        
        let actorInitials = undefined;
        if (n.actor_name && n.actor_name !== 'System') {
            actorInitials = n.actor_name.substring(0, 2).toUpperCase();
        }

        const iconData = NotificationIconRegistry.getIconForType(n.type);

        const badges: BadgeViewModel[] = [];
        if (n.ticket_status) {
            badges.push({
                text: n.ticket_status.replace(/_/g, ' '),
                type: 'status',
                value: n.ticket_status
            });
        }
        if (n.ticket_priority) {
            badges.push({
                text: n.ticket_priority.replace(/_/g, ' '),
                type: 'priority',
                value: n.ticket_priority
            });
        }

        return {
            id: n.id,
            isUnread: !n.read_at,
            isSelected: n.id === selectedId,
            
            // Avatar fallbacks
            actorInitials,
            fallbackIcon: iconData.icon,
            fallbackIconStyle: iconData.style,
            
            actorName,
            actionText: this.getActionText(n.type),
            timeLabel: formatRelativeTime(n.created_at),
            createdAt: n.created_at,
            title: n.title || n.ticket_title || 'Notification',
            referenceId: (n.entity_type === 'ticket' && n.entity_id) ? `TICK-${n.entity_id.substring(0, 6).toUpperCase()}` : undefined,
            previewText: n.message,
            
            badges
        };
    }

    public static mapToDetailViewModel(n: AppNotification): NotificationDetailViewModel {
        const iconData = NotificationIconRegistry.getIconForType(n.type);
        const typeName = n.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        const actionable = n.metadata?.actionable !== false;

        const actorName = n.actor_full_name || n.actor_name || n.metadata?.requesterName || n.metadata?.actorName || 'System';
        
        let story: NotificationStoryViewModel | undefined;
        if (n.type.includes('TRANSFER')) {
            story = {
                actor: actorName,
                action: this.getVerbForTransfer(n.type),
                object: n.ticket_title || 'a ticket'
            };
        } else if (n.type.includes('COLLABORATION')) {
            story = {
                actor: actorName,
                action: this.getVerbForCollaboration(n.type),
                object: n.ticket_title || 'a ticket'
            };
        }

        const metadata: NotificationMetadataItem[] = [];
        if (n.ticket_title || n.entity_type === 'ticket' || n.metadata?.ticketId) {
            metadata.push({ label: 'Ticket ID', value: n.metadata?.ticketId || n.entity_id, isPrimary: true });
        }
        if (n.ticket_status) {
            metadata.push({ label: 'Status', value: n.ticket_status.replace(/_/g, ' ') });
        }
        if (n.ticket_priority) {
            metadata.push({ label: 'Priority', value: n.ticket_priority.replace(/_/g, ' ') });
        }

        const actions: NotificationActionViewModel[] = [];
        if (actionable && n.type === 'COLLABORATION_REQUESTED') {
            actions.push({ id: 'acc', label: 'Accept Request', icon: 'check', style: 'primary', actionType: 'accept-collab', payload: { reqId: n.entity_id } });
            actions.push({ id: 'rej', label: 'Decline', icon: 'x', style: 'secondary', actionType: 'reject-collab', payload: { reqId: n.entity_id } });
        } else if (actionable && n.type === 'TICKET_TRANSFER_REQUESTED') {
            actions.push({ id: 'acc', label: 'Accept Transfer', icon: 'check', style: 'primary', actionType: 'accept-transfer', payload: { reqId: n.metadata?.requestId || '' } });
            actions.push({ id: 'rej', label: 'Decline', icon: 'x', style: 'secondary', actionType: 'reject-transfer', payload: { reqId: n.metadata?.requestId || '' } });
        } else if (actionable && n.type === 'CSAT_SURVEY_REQUESTED') {
            actions.push({ id: 'rate', label: 'Rate Experience', icon: 'star', style: 'primary', actionType: 'rate-experience', payload: { ticketId: n.metadata?.ticketId || n.entity_id } });
        }

        if (n.entity_type === 'ticket' || n.metadata?.ticketId) {
            actions.push({ id: 'view', label: 'View Ticket', style: 'secondary', actionType: 'view-ticket', payload: { ticketId: n.metadata?.ticketId || n.entity_id } });
        }

        return {
            id: n.id,
            isUnread: !n.read_at,
            header: {
                icon: iconData.icon,
                iconStyle: iconData.style,
                typeName,
                timeLabel: formatRelativeTime(n.created_at)
            },
            content: {
                title: n.title || n.ticket_title || 'Notification',
                story,
                message: n.message
            },
            metadata,
            actions
        };
    }

    private static getVerbForTransfer(type: string): string {
        switch (type) {
            case 'TICKET_TRANSFERRED': return 'transferred';
            case 'TICKET_TRANSFER_REQUESTED': return 'requested to transfer';
            case 'TICKET_TRANSFER_APPROVED': return 'approved the transfer of';
            case 'TICKET_TRANSFER_REJECTED': return 'declined the transfer of';
            case 'TICKET_TRANSFER_CANCELLED': return 'cancelled the transfer of';
            case 'TICKET_TRANSFER_EXPIRED': return 'missed the transfer window for';
            case 'TICKET_TRANSFER_INVALIDATED': return 'invalidated the transfer of';
            default: return 'acted on';
        }
    }

    private static getVerbForCollaboration(type: string): string {
        switch (type) {
            case 'COLLABORATION_REQUESTED': return 'invited you to collaborate on';
            case 'COLLABORATION_APPROVED': return 'accepted your invitation to collaborate on';
            case 'COLLABORATION_REJECTED': return 'declined your invitation to collaborate on';
            default: return 'collaborated on';
        }
    }

    private static getActionText(type: string): string {
        switch (type) {
            case 'COLLABORATION_REQUESTED': return 'requested collaboration';
            case 'COLLABORATION_APPROVED': return 'approved collaboration';
            case 'COLLABORATION_REJECTED': return 'rejected collaboration';
            case 'TICKET_TRANSFERRED': return 'transferred a ticket';
            case 'TICKET_TRANSFER_REQUESTED': return 'requested a transfer';
            case 'TICKET_TRANSFER_APPROVED': return 'approved a transfer';
            case 'TICKET_TRANSFER_REJECTED': return 'rejected a transfer';
            case 'TICKET_CLAIMED': return 'claimed a ticket';
            case 'TICKET_RESOLVED': return 'resolved a ticket';
            case 'TICKET_REOPENED': return 'reopened a ticket';
            case 'TICKET_STATUS_UPDATED': return 'updated ticket status';
            case 'NOTE_ADDED': return 'left a comment';
            case 'ATTACHMENT_UPLOADED': return 'uploaded an attachment';
            case 'CSAT_SURVEY_REQUESTED': return 'requested survey feedback';
            case 'CSAT_LOW_SCORE_ALERT': return 'flagged a low rating';
            case 'TICKET_RATED': return 'submitted a rating';
            default: return 'triggered an event';
        }
    }
}
