import { NotificationCardViewModel } from '../../viewmodels/NotificationCardViewModel';
import { NotificationCard } from './NotificationCard';
import { NotificationEmptyState } from './NotificationEmptyState';

export class NotificationList {
    private onNotificationSelect: (id: string) => void;
    private onNotificationToggle: (id: string) => void;
    private onLoadMore: () => void;
    private onNotificationMarkRead?: (id: string) => void;

    constructor(
        onNotificationSelect: (id: string) => void,
        onNotificationToggle: (id: string) => void,
        onLoadMore: () => void,
        onNotificationMarkRead?: (id: string) => void
    ) {
        this.onNotificationSelect = onNotificationSelect;
        this.onNotificationToggle = onNotificationToggle;
        this.onLoadMore = onLoadMore;
        this.onNotificationMarkRead = onNotificationMarkRead;
    }

    public render(notifications: NotificationCardViewModel[], nextCursor: string | null, selectedIds: Set<string>, selectionMode: boolean, focusedId: string | null = null): string {
        if (notifications.length === 0) {
            return NotificationEmptyState.renderEmptyList();
        }

        const groups = this.groupNotificationsByDate(notifications);
        let html = '';

        Object.keys(groups).forEach(groupName => {
            const notifs = groups[groupName];
            if (notifs.length === 0) return;

            html += `<div class="notif-group-header">${groupName.toUpperCase()}</div>`;
            
            notifs.forEach(n => {
                const isSelected = selectedIds.has(n.id);
                const isFocused = n.id === focusedId;
                html += NotificationCard.render(n, isSelected, selectionMode, isFocused);
            });
        });

        if (nextCursor) {
            html += `
                <div class="load-more-container">
                    <button class="btn btn-secondary" id="btn-load-more">Load More</button>
                </div>
            `;
        }

        return html;
    }

    public attachListeners(container: HTMLElement, selectionMode: boolean) {
        container.querySelectorAll('.notification-card').forEach(el => {
            el.addEventListener('click', (evt) => {
                evt.stopPropagation();
                const id = el.getAttribute('data-id');
                if (id) {
                    if (selectionMode) {
                        this.onNotificationToggle(id);
                    } else {
                        this.onNotificationSelect(id);
                    }
                }
            });
            
            // Checkbox directly toggles without opening
            const checkbox = el.querySelector('.nc-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (evt) => {
                    evt.stopPropagation(); // Stop click from propagating up to card
                    const id = el.getAttribute('data-id');
                    if (id) {
                        this.onNotificationToggle(id);
                    }
                });
                checkbox.addEventListener('click', (evt) => {
                    evt.stopPropagation();
                });
            }

            const quickReadBtn = el.querySelector('.btn-mark-read');
            if (quickReadBtn) {
                quickReadBtn.addEventListener('click', (evt) => {
                    evt.stopPropagation();
                    const id = el.getAttribute('data-id');
                    if (id && this.onNotificationMarkRead) {
                        this.onNotificationMarkRead(id);
                    }
                });
            }
        });

        const loadMoreBtn = container.querySelector('#btn-load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.onLoadMore();
            });
        }
    }

    private groupNotificationsByDate(notifications: NotificationCardViewModel[]) {
        const groups: { [key: string]: NotificationCardViewModel[] } = {
            'Today': [],
            'Yesterday': [],
            'Earlier This Week': [],
            'Older': []
        };

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);

        notifications.forEach(n => {
            const d = new Date(n.createdAt);
            if (d >= now) groups['Today'].push(n);
            else if (d >= yesterday) groups['Yesterday'].push(n);
            else if (d >= lastWeek) groups['Earlier This Week'].push(n);
            else groups['Older'].push(n);
        });
        return groups;
    }
}
