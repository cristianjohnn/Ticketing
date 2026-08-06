import { BookIcon, DashboardIcon, ListIcon, StarIcon, UserIcon, UsersIcon, BarChartIcon } from '../../common/Icons';
import { SidebarConfig } from './SidebarConfig';

export const adminSidebarConfig: SidebarConfig = {
    id: 'admin-sidebar',
    cssClass: 'sidebar-admin',
    portalName: 'Admin Panel',
    items: [
        {
            view: 'dashboard',
            label: 'Dashboard',
            icon: DashboardIcon({ size: 16 })
        },
        {
            view: 'analytics',
            label: 'Analytics',
            icon: BarChartIcon({ size: 16 })
        },
        {
            view: 'all-tickets',
            label: 'All Tickets',
            icon: ListIcon({ size: 16 }),
            hasBadge: true,
            badgeClass: 'sb-badge',
            badgeText: '0'
        },
        {
            view: 'resolved',
            label: 'Resolved & Ratings',
            icon: StarIcon({ size: 16 })
        },
        {
            view: 'knowledge-base',
            label: 'Knowledge Base',
            icon: BookIcon({ size: 16 })
        },
        {
            id: 'admin-nav-users',
            view: 'users',
            label: 'Users',
            icon: UsersIcon({ size: 16 }),
            requireAdmin: true
        }
    ],
    statsBoxHtml: `
        <div class="sb-stats-label">OVERVIEW</div>
        <div class="sb-stats-row"><span class="sb-stats-key">Open</span><span class="sb-stats-val" style="color:var(--color-warning)" id="as-open">0</span></div>
        <div class="sb-stats-row"><span class="sb-stats-key">In Progress</span><span class="sb-stats-val" style="color:var(--color-primary)" id="as-progress">0</span></div>
        <div class="sb-stats-row"><span class="sb-stats-key">Severe</span><span class="sb-stats-val" style="color:var(--color-danger)" id="as-severe">0</span></div>
        <div class="sb-stats-row"><span class="sb-stats-key">Resolved</span><span class="sb-stats-val" style="color:var(--color-success)" id="as-resolved">0</span></div>
        <div class="sb-stats-row"><span class="sb-stats-key">Avg Rating</span><span class="sb-stats-val" style="color:var(--color-success)" id="as-rating">—</span></div>
    `,
    actionBoxHtml: `
        <button class="sb-nav-btn" data-view="profile">
            ${UserIcon({ size: 16 })}
            Profile
        </button>
    `
};
