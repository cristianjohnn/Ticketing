export interface BadgeViewModel {
    text: string;
    type: 'status' | 'priority' | 'category' | 'sla' | 'department' | 'default';
    value: string;
}

export interface NotificationCardViewModel {
    id: string;
    isUnread: boolean;
    isSelected: boolean;
    
    // Avatar Rules: avatar > initials > icon
    avatarUrl?: string;
    actorInitials?: string;
    fallbackIcon?: string;
    fallbackIconStyle?: string;
    
    // Content
    actorName: string;
    actionText: string;
    timeLabel: string;
    createdAt: string;
    title: string;
    referenceId?: string;
    previewText?: string;
    
    // Metadata
    badges: BadgeViewModel[];
}
