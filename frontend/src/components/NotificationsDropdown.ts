import { Router } from '../router/router';
import { ticketsAPI } from '../services/api';
import { notificationStore } from '../state/NotificationStore';
import { AppNotification } from '../types';
import { handleUIError } from '../utils/errorHandler';
import { formatRelativeTime } from '../utils/formatters';
import { showToast } from './Toast';

export class NotificationsDropdown {
    private container: HTMLElement;
    private isOpen: boolean = false;
    private notificationIds: string[] = [];
    private onUnreadCountChanged?: (count: number) => void;
    private unsubscribeStore: (() => void) | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target as Node)) {
                this.close();
            }
        });

        // Close when another dropdown opens
        document.addEventListener('close-dropdowns', ((e: CustomEvent) => {
            if (e.detail?.except !== 'notifications') {
                this.close();
            }
        }) as EventListener);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            if (e.key === 'Escape') {
                this.close();
                return;
            }

            const items = Array.from(this.container.querySelectorAll('.notification-item')) as HTMLElement[];
            if (items.length === 0) return;

            const currentIndex = items.findIndex(item => item === document.activeElement || item.contains(document.activeElement));

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[nextIndex].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[nextIndex].focus();
            }
        });

        // Subscribe to store for live updates
        this.unsubscribeStore = notificationStore.subscribe((event) => {
            if (event.unreadCountChanged) {
                if (this.onUnreadCountChanged) {
                    this.onUnreadCountChanged(notificationStore.getCounts().unread);
                }
            }
            if (this.isOpen) {
                // If there are insertions or updates that affect our list, re-fetch/re-render
                if (event.inserted.length > 0 || event.updated.some(id => this.notificationIds.includes(id))) {
                    this.loadNotifications();
                }
            }
        });
    }

    public setOnUnreadCountChanged(callback: (count: number) => void) {
        this.onUnreadCountChanged = callback;
    }

    private hasLoaded = false;

    public async loadNotifications() {
        try {
            const resp = await notificationStore.fetch({ limit: 10 });
            this.notificationIds = resp.ids;
            this.hasLoaded = true;
            
            this.renderList();
            
            if (this.onUnreadCountChanged) {
                this.onUnreadCountChanged(notificationStore.getCounts().unread);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    }

    public toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.container.querySelector('.notifications-popover')?.classList.add('open');
            // Since SSE keeps us updated, we only force a load if we haven't loaded yet.
            // (Store caching also protects us, but this prevents unnecessary re-renders)
            if (!this.hasLoaded) {
                this.loadNotifications();
            }
        } else {
            this.container.querySelector('.notifications-popover')?.classList.remove('open');
        }
    }

    public close() {
        this.isOpen = false;
        this.container.querySelector('.notifications-popover')?.classList.remove('open');
    }

    private async handleNotificationClick(notification: AppNotification) {
        try {
            this.close();
            // Navigate to notification center and select the item
            const newUrl = window.location.pathname + '?selected=' + notification.id;
            window.history.pushState({}, '', newUrl);
            Router.switchView('notifications');
        } catch (err) {
            console.error('Failed to handle notification click:', err);
        }
    }

    private async markAllAsRead() {
        try {
            await notificationStore.markAllAsRead();
            this.close();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }

    private render() {
        this.container.innerHTML = `
            <div class="notifications-popover">
                <div class="notifications-header">
                    <h3>Notifications</h3>
                    <button class="mark-all-read">Mark all as read</button>
                </div>
                <div class="notifications-list">
                    <!-- Notifications will be rendered here -->
                </div>
                <div class="notifications-footer">
                    <a href="#" class="view-all">View all notifications</a>
                </div>
            </div>
        `;

        this.container.querySelector('.mark-all-read')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.markAllAsRead();
        });
        
        this.container.querySelector('.view-all')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.close();
            Router.switchView('notifications');
        });
    }

    private renderList() {
        const listContainer = this.container.querySelector('.notifications-list');
        if (!listContainer) return;

        if (this.notificationIds.length === 0) {
            listContainer.innerHTML = `
                <div class="notifications-empty">
                    No new notifications
                </div>
            `;
            return;
        }

        const notifications = this.notificationIds
            .map(id => notificationStore.getById(id))
            .filter(n => n !== undefined) as AppNotification[];

        // Sort unread first, then by date descending
        notifications.sort((a, b) => {
            if (!a.read_at && b.read_at) return -1;
            if (a.read_at && !b.read_at) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Limit to latest 10
        const displayNotifications = notifications.slice(0, 10);

        listContainer.innerHTML = displayNotifications.map(n => {
            let actionsHtml = '';
            const actionable = n.metadata?.actionable !== false;

            if (actionable && n.type === 'COLLABORATION_REQUESTED') {
                actionsHtml = `
                    <div class="notification-actions">
                        <button class="btn btn-primary btn-sm accept-collab" data-req-id="${n.entity_id}">Accept</button>
                        <button class="btn btn-secondary btn-sm reject-collab" data-req-id="${n.entity_id}">Reject</button>
                    </div>
                `;
            } else if (actionable && n.type === 'TICKET_TRANSFER_REQUESTED') {
                actionsHtml = `
                    <div class="notification-actions">
                        <button class="btn btn-primary btn-sm accept-transfer" data-req-id="${n.metadata?.requestId || ''}">Accept</button>
                        <button class="btn btn-secondary btn-sm reject-transfer" data-req-id="${n.metadata?.requestId || ''}">Reject</button>
                    </div>
                `;
            }

            return `
            <div class="notification-item ${!n.read_at ? 'unread' : ''}" data-id="${n.id}" tabindex="0">
                <div class="notification-icon">
                    ${!n.read_at ? '<div class="unread-dot"></div>' : ''}
                    ${this.getIconForType(n.type)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                    ${actionsHtml}
                    <div class="notification-meta" style="margin-top: 6px;">
                        <span>${n.actor_name || 'System'}</span>
                        <span>${formatRelativeTime(n.created_at)}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Attach item click and enter key listeners
        listContainer.querySelectorAll('.notification-item').forEach(el => {
            const handleActivation = (e: Event) => {
                // If clicked/pressed on an action button, don't trigger item click
                if ((e.target as HTMLElement).closest('.notification-actions')) {
                    return;
                }
                
                e.stopPropagation();
                const id = el.getAttribute('data-id');
                const notification = id ? notificationStore.getById(id) : null;
                if (notification) {
                    this.handleNotificationClick(notification);
                }
            };

            el.addEventListener('click', handleActivation);
            el.addEventListener('keydown', (e) => {
                if ((e as KeyboardEvent).key === 'Enter') {
                    handleActivation(e);
                }
            });
        });

        // Attach inline action listeners
        listContainer.querySelectorAll('.accept-collab').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.approveCollaboration(reqId);
                        showToast('Request approved', 'success');
                        await this.loadNotifications();
                    } catch (err) {
                        handleUIError(err, 'Failed to approve request');
                    }
                }
            });
        });

        listContainer.querySelectorAll('.reject-collab').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.rejectCollaboration(reqId, 'Rejected from notification center');
                        showToast('Request rejected', 'success');
                        await this.loadNotifications();
                    } catch (err) {
                        handleUIError(err, 'Failed to reject request');
                    }
                }
            });
        });

        listContainer.querySelectorAll('.accept-transfer').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.approveTransfer(reqId);
                        showToast('Transfer request approved', 'success');
                        await this.loadNotifications();
                    } catch (err) {
                        handleUIError(err, 'Failed to approve transfer');
                    }
                }
            });
        });

        listContainer.querySelectorAll('.reject-transfer').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.rejectTransfer(reqId, 'Rejected from notification center');
                        showToast('Transfer request rejected', 'success');
                        await this.loadNotifications();
                    } catch (err) {
                        handleUIError(err, 'Failed to reject transfer');
                    }
                }
            });
        });
    }

    private getIconForType(type: string): string {
        const svgSize = 16;
        switch (type) {
            case 'COLLABORATION_REQUESTED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
            case 'COLLABORATION_APPROVED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`;
            case 'COLLABORATION_REJECTED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="22" y2="12"></line><line x1="22" y1="8" x2="18" y2="12"></line></svg>`;
            case 'TICKET_TRANSFERRED':
            case 'TICKET_TRANSFER_REQUESTED':
            case 'TICKET_TRANSFER_APPROVED':
            case 'TICKET_OWNERSHIP_TRANSFERRED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M17 3v18"></path><path d="M3 10h14"></path><path d="m14 7 3 3-3 3"></path></svg>`;
            case 'TICKET_TRANSFER_REJECTED':
            case 'TICKET_TRANSFER_CANCELLED':
            case 'TICKET_TRANSFER_EXPIRED':
            case 'TICKET_TRANSFER_INVALIDATED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"><path d="M17 3v18"></path><path d="M3 10h14"></path><path d="m14 7 3 3-3 3"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
            default:
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
        }
    }

    public destroy() {
        if (this.unsubscribeStore) {
            this.unsubscribeStore();
            this.unsubscribeStore = null;
        }
    }
}
