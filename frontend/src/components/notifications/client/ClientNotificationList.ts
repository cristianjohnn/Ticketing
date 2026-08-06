import { NotificationCardViewModel } from '../../../viewmodels/NotificationCardViewModel';
import { NotificationEmptyState } from '../NotificationEmptyState';
import { ClientNotificationCard } from './ClientNotificationCard';

export class ClientNotificationList {
    private onNotificationSelect: (id: string) => void;
    private onLoadMore: () => void;
    private onNotificationMarkRead?: (id: string) => void;

    constructor(
        onNotificationSelect: (id: string) => void,
        onLoadMore: () => void,
        onNotificationMarkRead?: (id: string) => void
    ) {
        this.onNotificationSelect = onNotificationSelect;
        this.onLoadMore = onLoadMore;
        this.onNotificationMarkRead = onNotificationMarkRead;
    }

    public render(notifications: NotificationCardViewModel[], nextCursor: string | null, focusedId: string | null = null): string {
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
                const isFocused = n.id === focusedId;
                html += ClientNotificationCard.render(n, isFocused);
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

    public attachListeners(container: HTMLElement) {
        container.querySelectorAll('.notification-card').forEach(el => {
            el.addEventListener('click', (evt) => {
                evt.stopPropagation();
                const id = el.getAttribute('data-id');
                if (id) {
                    this.onNotificationSelect(id);
                }
            });

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

    private groupNotificationsByDate(notifications: NotificationCardViewModel[]): Record<string, NotificationCardViewModel[]> {
        const groups: Record<string, NotificationCardViewModel[]> = {
            'Today': [],
            'Yesterday': [],
            'Earlier': []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        notifications.forEach(n => {
            const d = new Date(n.createdAt);
            if (d >= today) {
                groups['Today'].push(n);
            } else if (d >= yesterday) {
                groups['Yesterday'].push(n);
            } else {
                groups['Earlier'].push(n);
            }
        });

        return groups;
    }
}
