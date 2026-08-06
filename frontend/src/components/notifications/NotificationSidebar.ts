import { ModalsManager } from '../modals/ModalsManager';

export class NotificationSidebar {
    private onFilterChange: (filter: string) => void;

    constructor(onFilterChange: (filter: string) => void) {
        this.onFilterChange = onFilterChange;
    }

    public render(currentFilter: string): string {
        return `
            <div class="notifications-sidebar">
                <div style="padding: var(--space-xs) 0;"></div>
                <ul class="notifications-filters" id="sidebar-filters-primary">
                    <li class="filter-item ${currentFilter === '' ? 'active' : ''}" data-filter=""><span class="filter-icon"><i data-lucide="inbox"></i></span> All Notifications <span class="badge" id="count-all">0</span></li>
                    <li class="filter-item ${currentFilter === 'unread' ? 'active' : ''}" data-filter="unread"><span class="filter-icon"><i data-lucide="circle-dot"></i></span> Unread <span class="badge badge-accent" id="count-unread">0</span></li>
                </ul>
                <div class="sidebar-section-title meta-sm" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--color-border);">CATEGORIES</div>
                <ul class="notifications-filters" id="sidebar-filters-categories">
                    <li class="filter-item ${currentFilter === 'transfers' ? 'active' : ''}" data-filter="transfers"><span class="filter-icon"><i data-lucide="arrow-right-left"></i></span> Transfers <span class="badge" id="count-transfers">0</span></li>
                    <li class="filter-item ${currentFilter === 'collaboration' ? 'active' : ''}" data-filter="collaboration"><span class="filter-icon"><i data-lucide="users"></i></span> Collaboration <span class="badge" id="count-collaboration">0</span></li>
                    <li class="filter-item ${currentFilter === 'comments' ? 'active' : ''}" data-filter="comments"><span class="filter-icon"><i data-lucide="message-square"></i></span> Comments <span class="badge" id="count-comments">0</span></li>
                    <li class="filter-item ${currentFilter === 'assignments' ? 'active' : ''}" data-filter="assignments"><span class="filter-icon"><i data-lucide="pin"></i></span> Assignments <span class="badge" id="count-assignments">0</span></li>
                    <li class="filter-item ${currentFilter === 'system' ? 'active' : ''}" data-filter="system"><span class="filter-icon"><i data-lucide="cpu"></i></span> System <span class="badge" id="count-system">0</span></li>
                </ul>
                <div class="sidebar-footer" style="border-top: 1px solid var(--color-border); padding-top: var(--space-sm); margin-top: auto;">
                    <div class="filter-item text-muted" id="btn-notification-preferences" style="opacity: 0.8; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                        <span class="filter-icon"><i data-lucide="settings"></i></span> Notification Preferences
                    </div>
                </div>
            </div>
        `;
    }

    public attachListeners(container: HTMLElement) {
        container.querySelectorAll('.notifications-sidebar .filter-item').forEach(el => {
            el.addEventListener('click', () => {
                const filterVal = el.getAttribute('data-filter');
                if (filterVal !== null) {
                    this.onFilterChange(filterVal);
                }
            });
        });

        const prefsBtn = container.querySelector('#btn-notification-preferences');
        if (prefsBtn) {
            prefsBtn.addEventListener('click', () => {
                ModalsManager.openModal('notification-preferences-modal');
            });
        }
    }

    public updateActiveState(container: HTMLElement, currentFilter: string) {
        container.querySelectorAll('.notifications-sidebar .filter-item').forEach(el => {
            const filterVal = el.getAttribute('data-filter');
            if (filterVal === currentFilter) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    public updateCounts(container: HTMLElement, counts: Record<string, number>) {
        const setBadge = (id: string, count: number) => {
            const el = container.querySelector('#' + id);
            if (el) {
                el.textContent = String(count || 0);
                (el as HTMLElement).style.display = count > 0 ? 'inline-block' : 'none';
            }
        };

        setBadge('count-all', counts.all);
        setBadge('count-unread', counts.unread);
        setBadge('count-transfers', counts.transfers);
        setBadge('count-collaboration', counts.collaboration);
        setBadge('count-comments', counts.comments);
        setBadge('count-assignments', counts.assignments);
        setBadge('count-system', counts.system);
    }
}
