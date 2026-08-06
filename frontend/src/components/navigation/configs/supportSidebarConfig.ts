import { BookIcon, DashboardIcon, DocumentIcon, ListIcon, UserIcon, UsersIcon, BarChartIcon } from '../../common/Icons';
import { SidebarConfig } from './SidebarConfig';

export const supportSidebarConfig: SidebarConfig = {
    id: 'support-sidebar',
    cssClass: 'sidebar-support',
    portalName: 'Support Workspace',
    items: [
        {
            view: 'dashboard',
            label: 'Support Dashboard',
            icon: DashboardIcon({ size: 16 })
        },
        {
            view: 'analytics',
            label: 'My Analytics',
            icon: BarChartIcon({ size: 16 })
        },
        {
            view: 'my-tickets',
            label: 'My Tickets',
            icon: ListIcon({ size: 16 }),
            hasBadge: true,
            badgeClass: 'sb-badge',
            badgeText: '0'
        },
        {
            view: 'unclaimed-tickets',
            label: 'Unclaimed Tickets',
            icon: DocumentIcon({ size: 16 })
        },
        {
            view: 'collaborating-tickets',
            label: 'Collaborating',
            icon: UsersIcon({ size: 16 })
        },
        {
            view: 'all-tickets',
            label: 'All Tickets',
            icon: ListIcon({ size: 16 })
        },
        {
            view: 'knowledge-base',
            label: 'Knowledge Base',
            icon: BookIcon({ size: 16 })
        }
    ],
    actionBoxHtml: `
        <button class="sb-nav-btn" data-view="profile">
            ${UserIcon({ size: 16 })}
            Profile
        </button>
    `
};
