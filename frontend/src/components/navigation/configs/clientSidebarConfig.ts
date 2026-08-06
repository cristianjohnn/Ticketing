import { BookIcon, DocumentIcon, UserIcon } from '../../common/Icons';
import { SidebarConfig } from './SidebarConfig';

export const clientSidebarConfig: SidebarConfig = {
    id: 'client-sidebar',
    portalName: 'Client Portal',
    items: [
        {
            view: 'my-tickets',
            label: 'My Tickets',
            icon: DocumentIcon({ size: 16 }),
            hasBadge: true,
            badgeClass: 'sb-badge-rating',
            badgeText: '0 to rate'
        },
        {
            view: 'knowledge-base',
            label: 'Knowledge Base',
            icon: BookIcon({ size: 16 })
        }
    ],
    statsBoxHtml: `
        <div class="sb-stats-label">MY TICKETS</div>
        <div class="sb-stats-row"><span class="sb-stats-key">Open</span><span class="sb-stats-val" style="color:var(--color-warning)" id="cs-open">0</span></div>
        <div class="sb-stats-row"><span class="sb-stats-key">Active</span><span class="sb-stats-val" style="color:var(--color-primary)" id="cs-active">0</span></div>
        <div class="sb-stats-row"><span class="sb-stats-key">Resolved</span><span class="sb-stats-val" style="color:var(--color-success)" id="cs-resolved">0</span></div>
    `,
    actionBoxHtml: `
        <button class="btn btn-primary sb-new-btn" id="client-new-ticket-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Submit Ticket
        </button>
        <button class="sb-nav-btn" data-view="profile">
            ${UserIcon({ size: 16 })}
            Profile
        </button>
    `
};
