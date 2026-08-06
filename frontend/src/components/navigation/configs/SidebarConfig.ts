interface SidebarNavItem {
    id?: string;
    view: string;
    label: string;
    icon: string; // HTML string from Icons module
    requireAdmin?: boolean; // If true, only visible to full admins, not agents
    hasBadge?: boolean;
    badgeClass?: string; // Optional class for the badge, e.g. 'sb-badge-rating'
    badgeText?: string; // e.g. '0 to rate'
}

export interface SidebarConfig {
    id: string;          // e.g., 'client-sidebar' or 'admin-sidebar'
    portalName: string;
    cssClass?: string; // Additional classes for the aside element
    items: SidebarNavItem[];
    statsBoxHtml?: string;
    actionBoxHtml?: string;
}
