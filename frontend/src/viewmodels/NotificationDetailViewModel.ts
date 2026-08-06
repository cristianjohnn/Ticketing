export interface NotificationActionViewModel {
    id: string;
    label: string;
    icon?: string;
    style: 'primary' | 'secondary' | 'danger' | 'ghost';
    actionType: string; // e.g. 'accept-collab', 'view-ticket'
    payload?: any;
}

export interface NotificationStoryViewModel {
    actor: string;
    action: string;
    object: string;
    context?: string;
}

export interface NotificationMetadataItem {
    label: string;
    value: string;
    isPrimary?: boolean;
}

export interface NotificationDetailViewModel {
    id: string;
    isUnread: boolean;
    header: {
        icon: string;
        iconStyle: string;
        typeName: string;
        timeLabel: string;
    };
    content: {
        title: string;
        story?: NotificationStoryViewModel;
        message?: string;
    };
    metadata: NotificationMetadataItem[];
    actions: NotificationActionViewModel[];
}
