export interface NotificationIconMapping {
    icon: string;
    style: 'success' | 'warning' | 'danger' | 'system' | 'collab' | 'transfer' | 'assign' | 'comment' | 'default';
}

export class NotificationIconRegistry {
    private static readonly mapping: Record<string, NotificationIconMapping> = {
        'COLLABORATION_REQUESTED': { icon: 'users', style: 'collab' },
        'COLLABORATION_APPROVED': { icon: 'check-circle-2', style: 'success' },
        'COLLABORATION_REJECTED': { icon: 'x-circle', style: 'danger' },
        'TICKET_TRANSFERRED': { icon: 'arrow-right-left', style: 'transfer' },
        'TICKET_TRANSFER_REQUESTED': { icon: 'mail', style: 'transfer' },
        'TICKET_TRANSFER_APPROVED': { icon: 'check-circle-2', style: 'success' },
        'TICKET_TRANSFER_REJECTED': { icon: 'x-circle', style: 'danger' },
        'TICKET_TRANSFER_CANCELLED': { icon: 'ban', style: 'warning' },
        'TICKET_TRANSFER_EXPIRED': { icon: 'clock', style: 'warning' },
        'TICKET_TRANSFER_INVALIDATED': { icon: 'alert-circle', style: 'danger' },
        'TICKET_CLAIMED': { icon: 'user-plus', style: 'assign' },
        'TICKET_RESOLVED': { icon: 'party-popper', style: 'success' },
        'TICKET_REOPENED': { icon: 'rotate-ccw', style: 'warning' },
        'TICKET_STATUS_UPDATED': { icon: 'clipboard-list', style: 'system' },
        'NOTE_ADDED': { icon: 'message-circle', style: 'comment' },
        'ATTACHMENT_UPLOADED': { icon: 'paperclip', style: 'system' },
        'CSAT_SURVEY_REQUESTED': { icon: 'star', style: 'warning' },
        'CSAT_LOW_SCORE_ALERT': { icon: 'alert-triangle', style: 'danger' },
        'TICKET_RATED': { icon: 'star', style: 'warning' },
    };

    public static getIconForType(type: string): NotificationIconMapping {
        return this.mapping[type] || { icon: 'bell', style: 'default' };
    }
}
