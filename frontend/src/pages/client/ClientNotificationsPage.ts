import { ClientNotificationCard } from '../../components/notifications/client/ClientNotificationCard';
import { ClientNotificationDetail } from '../../components/notifications/client/ClientNotificationDetail';
import { ClientNotificationList } from '../../components/notifications/client/ClientNotificationList';
import { ClientNotificationSidebar } from '../../components/notifications/client/ClientNotificationSidebar';
import { ClientNotificationToolbar } from '../../components/notifications/client/ClientNotificationToolbar';
import { NotificationEmptyState } from '../../components/notifications/NotificationEmptyState';
import { RatingModal } from '../../components/csat/RatingModal';
import { TicketDetailModal } from '../../components/TicketDetailModal';
import { showToast } from '../../components/Toast';
import { LayoutManager } from '../../layouts/LayoutManager';
import { ClientNotificationMapper } from '../../mappers/ClientNotificationMapper';
import { NotificationMapper } from '../../mappers/NotificationMapper';
import { HtmlViewName } from '../../router/router';
import { ticketsAPI } from '../../services/api';
import { notificationStore } from '../../state/NotificationStore';
import { store } from '../../state/store';
import { handleUIError } from '../../utils/errorHandler';
import { IconService } from '../../utils/iconService';
import { getPortalContentContainer } from '../../utils/portalContent';

export class ClientNotificationsPage {
    private static currentFilter: string = '';
    private static currentSearch: string = '';
    private static currentSort: string = 'newest';
    private static currentCursor: string | null = null;
    private static selectedId: string | null = null;
    private static focusedId: string | null = null;
    
    private static limit: number = 20;
    private static notificationIds: string[] = [];
    private static nextCursor: string | null = null;

    private static sidebarComponent: ClientNotificationSidebar;
    private static toolbarComponent: ClientNotificationToolbar;
    private static listComponent: ClientNotificationList;
    private static detailComponent: ClientNotificationDetail;

    private static viewModelCache = new Map<string, { hash: string, vm: any }>();

    private static unsubscribeStore: (() => void) | null = null;
    private static pendingRenderFrame: number | null = null;
    private static batchedUpdatedIds = new Set<string>();
    private static batchedNeedsFullListRender = false;
    private static batchedNeedsDetailRender = false;

    public static async load(_htmlView: HtmlViewName): Promise<void> {
        const role = store.getState().currentUser?.role;
        const container = getPortalContentContainer(role || 'Client');
        if (!container) return;

        LayoutManager.client?.getTopbar().setTitle('Notification Center');

        this.parseUrlState();
        this.initializeComponents();

        const content = `
            <div class="notifications-page-layout client-notifications" tabindex="-1">
                <div id="notif-sidebar-root"></div>
                
                <div class="notifications-main">
                    <div id="notif-toolbar-root"></div>
                    <div class="notifications-list-container" id="notif-list-root"></div>
                </div>
                
                <div class="notifications-detail" id="notif-detail-root"></div>
            </div>
        `;

        container.innerHTML = content;
        this.renderStaticRoots(container);
        this.fetchAndRender(true).catch(e => console.error(e));
        this.attachStoreListeners();
    }

    private static initializeComponents() {
        this.sidebarComponent = new ClientNotificationSidebar((filter) => {
            this.currentFilter = filter;
            this.currentCursor = null;
            this.updateUrlState();
            this.fetchAndRender(true);
        });

        this.toolbarComponent = new ClientNotificationToolbar(
            (search) => {
                this.currentSearch = search;
                this.currentCursor = null;
                this.updateUrlState();
                this.fetchAndRender(true);
            },
            (sort) => {
                this.currentSort = sort;
                this.currentCursor = null;
                this.updateUrlState();
                this.fetchAndRender(true);
            },
            (filter) => {
                this.currentFilter = filter;
                this.currentCursor = null;
                this.updateUrlState();
                this.fetchAndRender(true);
            },
            async () => {
                try {
                    await notificationStore.markAllAsRead();
                    showToast('All updates marked as read', 'success');
                } catch (e) {
                    handleUIError(e, 'Failed to mark all as read');
                }
            }
        );

        this.listComponent = new ClientNotificationList(
            (id) => {
                this.selectNotification(id);
            },
            () => {
                this.currentCursor = this.nextCursor;
                this.fetchAndRender(false);
            },
            async (id) => {
                this.markAsRead(id);
            }
        );

        this.detailComponent = new ClientNotificationDetail(
            async (actionType, payload) => {
                this.handleDetailAction(actionType, payload);
            },
            async (id) => {
                this.markAsRead(id);
            }
        );
    }

    private static renderStaticRoots(container: HTMLElement) {
        const sidebarRoot = container.querySelector('#notif-sidebar-root');
        if (sidebarRoot) {
            sidebarRoot.outerHTML = this.sidebarComponent.render(this.currentFilter);
            this.sidebarComponent.attachListeners(container);
        }

        this.renderToolbar();
        IconService.renderIcons(container);
        
        const layout = container.querySelector('.notifications-page-layout') as HTMLElement;
        if (layout) {
            layout.removeEventListener('keydown', this.handleKeyDown);
            layout.addEventListener('keydown', this.handleKeyDown);
            layout.focus();
        }
    }

    private static renderToolbar() {
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        if (!container) return;
        
        const toolbarContainer = container.querySelector('.notifications-toolbar');
        const toolbarRoot = toolbarContainer || container.querySelector('#notif-toolbar-root');
        
        if (toolbarRoot) {
            const totalCount = notificationStore.getCounts().total || 0;
            toolbarRoot.outerHTML = this.toolbarComponent.render(
                this.currentSearch, 
                this.currentSort, 
                this.currentFilter, 
                totalCount
            );
            this.toolbarComponent.attachListeners(container);
            IconService.renderIcons(container);
        }
    }

    private static parseUrlState() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentFilter = urlParams.get('filter') || '';
        this.currentSearch = urlParams.get('search') || '';
        this.currentSort = urlParams.get('sort') || 'newest';
        this.selectedId = urlParams.get('selected') || null;
        this.currentCursor = null; 
    }

    private static updateUrlState() {
        const urlParams = new URLSearchParams();
        if (this.currentFilter) urlParams.set('filter', this.currentFilter);
        if (this.currentSearch) urlParams.set('search', this.currentSearch);
        if (this.currentSort !== 'newest') urlParams.set('sort', this.currentSort);
        if (this.selectedId) urlParams.set('selected', this.selectedId);

        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
    }

    private static updateSidebarCounts() {
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        if (container) {
            this.sidebarComponent.updateCounts(container, notificationStore.getCounts() as any);
            this.sidebarComponent.updateActiveState(container, this.currentFilter);
        }
    }

    private static async fetchAndRender(isInitial: boolean = false) {
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        const listRoot = container?.querySelector('#notif-list-root');

        try {
            if (listRoot && isInitial) {
                listRoot.innerHTML = NotificationEmptyState.renderLoadingList();
            }

            const response = await notificationStore.fetch({
                limit: this.limit,
                cursor: this.currentCursor || undefined,
                filter: this.currentFilter,
                search: this.currentSearch,
                sort: this.currentSort
            });
            
            if (isInitial || !this.currentCursor) {
                this.notificationIds = response.ids;
            } else {
                this.notificationIds = [...this.notificationIds, ...response.ids];
            }

            if (this.focusedId && !this.notificationIds.includes(this.focusedId)) {
                this.focusedId = this.notificationIds.length > 0 ? this.notificationIds[0] : null;
            }

            this.nextCursor = response.cursor;

            this.updateSidebarCounts();
            this.renderToolbar();
            this.renderList();
            this.renderDetail();
        } catch (err) {
            console.error('Error fetching notifications', err);
            if (listRoot && isInitial) {
                listRoot.innerHTML = '<div class="error-msg text-danger">Failed to load updates.</div>';
            }
        }
    }

    private static getViewModel(id: string) {
        const n = notificationStore.getById(id);
        if (!n) return null;

        const isSelectedActive = this.selectedId === id;
        const isFocused = this.focusedId === id;
        
        const hash = `${n.created_at}_${n.read_at}_${isSelectedActive}_${isFocused}`;
        
        const cached = this.viewModelCache.get(id);
        if (cached && cached.hash === hash) {
            return cached.vm;
        }

        const sharedVm = NotificationMapper.mapToViewModel(n, this.selectedId || undefined);
        const vm = ClientNotificationMapper.mapToClientCard(sharedVm);
        this.viewModelCache.set(id, { hash, vm });
        return vm;
    }

    private static renderList() {
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        if (!container) return;

        const listRoot = container.querySelector('#notif-list-root');
        if (listRoot) {
            const vms = this.notificationIds
                .map(id => this.getViewModel(id))
                .filter(vm => !!vm);
                
            listRoot.innerHTML = this.listComponent.render(vms as any, this.nextCursor, this.focusedId);
            this.listComponent.attachListeners(container as HTMLElement);
            IconService.renderIcons(container as HTMLElement);
        }
    }

    private static updateCardInDOM(id: string) {
        const vm = this.getViewModel(id);
        if (!vm) return;
        
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        const cardEl = container?.querySelector(`.notification-card[data-id="${id}"]`);
        if (cardEl) {
            const isFocused = this.focusedId === id;
            cardEl.outerHTML = ClientNotificationCard.render(vm, isFocused);
        }
    }

    private static selectNotification = (id: string) => {
        this.selectedId = id;
        this.updateUrlState();
        this.renderList();
        this.renderDetail();
    }

    private static renderDetail() {
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        const detailRoot = container?.querySelector('#notif-detail-root');
        if (!detailRoot) return;
        
        detailRoot.classList.remove('is-open');
        detailRoot.classList.add('is-opening');

        if (!this.selectedId) {
            detailRoot.innerHTML = NotificationEmptyState.renderEmptyDetail();
            IconService.renderIcons(detailRoot as HTMLElement);
        } else {
            const n = notificationStore.getById(this.selectedId);
            if (!n) {
                detailRoot.innerHTML = NotificationEmptyState.renderNotFoundDetail();
                IconService.renderIcons(detailRoot as HTMLElement);
            } else {
                const sharedDetailVm = NotificationMapper.mapToDetailViewModel(n);
                const detailVm = ClientNotificationMapper.mapToClientDetail(sharedDetailVm);
                detailRoot.innerHTML = this.detailComponent.render(detailVm);
                this.detailComponent.attachListeners(detailRoot as HTMLElement);
                IconService.renderIcons(detailRoot as HTMLElement);
            }
        }
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                detailRoot.classList.remove('is-opening');
                detailRoot.classList.add('is-open');
            });
        });
    }

    private static async handleDetailAction(actionType: string, payload: any) {
        if (!this.selectedId) return;
        const notification = notificationStore.getById(this.selectedId);
        if (!notification) return;

        if (!notification.read_at) {
            await this.markAsRead(notification.id);
        }

        try {
            switch (actionType) {
                case 'view-ticket':
                    if (payload?.ticketId) {
                        try {
                            const ticket = await ticketsAPI.getById(payload.ticketId);
                            new TicketDetailModal(ticket, () => {}).open();
                        } catch (err) {
                            handleUIError(err, 'Failed to load ticket');
                        }
                    }
                    return; 
                case 'rate-experience':
                    if (payload?.ticketId) {
                        try {
                            const ticket = await ticketsAPI.getById(payload.ticketId);
                            RatingModal.open(ticket);
                        } catch (err) {
                            handleUIError(err, 'Failed to load ticket for rating');
                        }
                    }
                    return;
            }

            notificationStore.upsert([{ ...notification, metadata: { ...notification.metadata, actionable: false } }]);
        } catch (e) {
            handleUIError(e, 'Failed to process action');
        }
    }

    private static async markAsRead(id: string) {
        await notificationStore.markAsRead(id);
    }

    private static handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowUp':
            case 'Home':
            case 'End':
                e.preventDefault();
                this.navigateFocus(e.key);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (this.focusedId) {
                    this.selectNotification(this.focusedId);
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (this.focusedId) {
                    this.focusedId = null;
                    this.renderList();
                }
                break;
        }
    };

    private static getFirstVisibleNotificationId(): string | null {
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        const listRoot = container?.querySelector('#notif-list-root');
        if (!listRoot) return null;

        const cards = Array.from(listRoot.querySelectorAll('.notification-card'));
        const listRect = listRoot.getBoundingClientRect();

        for (const card of cards) {
            const rect = card.getBoundingClientRect();
            if (rect.top >= listRect.top && rect.bottom <= listRect.bottom) {
                return card.getAttribute('data-id') || null;
            }
        }
        return null;
    }

    private static navigateFocus(key: string) {
        if (this.notificationIds.length === 0) return;

        let currentIndex = this.focusedId ? this.notificationIds.indexOf(this.focusedId) : -1;

        if (currentIndex === -1 && (key === 'ArrowDown' || key === 'Home')) {
            const visibleId = this.getFirstVisibleNotificationId();
            if (visibleId) {
                this.focusedId = visibleId;
                this.renderList();
                this.scrollToFocused();
                return;
            }
        }

        if (currentIndex === -1) currentIndex = 0;
        else if (key === 'ArrowDown') currentIndex = Math.min(currentIndex + 1, this.notificationIds.length - 1);
        else if (key === 'ArrowUp') currentIndex = Math.max(currentIndex - 1, 0);
        else if (key === 'Home') currentIndex = 0;
        else if (key === 'End') currentIndex = this.notificationIds.length - 1;

        this.focusedId = this.notificationIds[currentIndex];
        this.renderList();
        this.scrollToFocused();
    }

    private static scrollToFocused() {
        if (!this.focusedId) return;
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        const card = container?.querySelector(`.notification-card[data-id="${this.focusedId}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    private static attachStoreListeners() {
        if (this.unsubscribeStore) this.unsubscribeStore();

        this.unsubscribeStore = notificationStore.subscribe((event) => {
            if (event.unreadCountChanged) {
                this.updateSidebarCounts();
            }

            if (event.inserted.length > 0 && !this.currentCursor && !this.currentSearch) {
                this.currentCursor = null;
                this.fetchAndRender(false);
                return;
            }

            if (event.inserted.length > 0 || event.removed.length > 0) {
                this.batchedNeedsFullListRender = true;
            }

            event.updated.forEach(id => {
                if (this.notificationIds.includes(id)) {
                    this.batchedUpdatedIds.add(id);
                }
                if (this.selectedId === id) {
                    this.batchedNeedsDetailRender = true;
                }
            });

            this.scheduleRender();
        });
    }

    private static scheduleRender() {
        if (this.pendingRenderFrame !== null) return;
        this.pendingRenderFrame = requestAnimationFrame(() => {
            this.pendingRenderFrame = null;
            this.executeBatchedRenders();
        });
    }

    private static executeBatchedRenders() {
        if (this.batchedNeedsFullListRender) {
            this.renderList();
        } else if (this.batchedUpdatedIds.size > 0) {
            this.batchedUpdatedIds.forEach(id => {
                this.updateCardInDOM(id);
            });
            const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
            if (container) IconService.renderIcons(container);
        }

        if (this.batchedNeedsDetailRender) {
            this.renderDetail();
        }

        this.batchedNeedsFullListRender = false;
        this.batchedNeedsDetailRender = false;
        this.batchedUpdatedIds.clear();
    }

    public static unload() {
        if (this.unsubscribeStore) {
            this.unsubscribeStore();
            this.unsubscribeStore = null;
        }
        this.pendingRenderFrame = null;
        this.focusedId = null;
    }
}
