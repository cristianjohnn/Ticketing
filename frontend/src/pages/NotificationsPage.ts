import { NotificationCard } from '../components/notifications/NotificationCard';
import { NotificationDetail } from '../components/notifications/NotificationDetail';
import { NotificationEmptyState } from '../components/notifications/NotificationEmptyState';
import { NotificationList } from '../components/notifications/NotificationList';
import { NotificationSidebar } from '../components/notifications/NotificationSidebar';
import { NotificationToolbar } from '../components/notifications/NotificationToolbar';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { showToast } from '../components/Toast';
import { LayoutManager } from '../layouts/LayoutManager';
import { NotificationMapper } from '../mappers/NotificationMapper';
import { HtmlViewName } from '../router/router';
import { ticketsAPI } from '../services/api';
import { notificationStore } from '../state/NotificationStore';
import { store } from '../state/store';
import { handleUIError } from '../utils/errorHandler';
import { IconService } from '../utils/iconService';
import { getPortalContentContainer } from '../utils/portalContent';

export class NotificationsPage {
    private static currentFilter: string = '';
    private static currentSearch: string = '';
    private static currentSort: string = 'newest';
    private static currentCursor: string | null = null;
    private static selectedId: string | null = null;
    private static focusedId: string | null = null;
    
    private static limit: number = 20;
    private static notificationIds: string[] = [];
    private static nextCursor: string | null = null;
    
    // Transient UI State for Bulk Actions
    private static isSelectionMode: boolean = false;
    private static selectedIds: Set<string> = new Set();

    private static sidebarComponent: NotificationSidebar;
    private static toolbarComponent: NotificationToolbar;
    private static listComponent: NotificationList;
    private static detailComponent: NotificationDetail;

    // Phase 5.5: Presentation Cache (ViewModel Cache)
    // Caches the mapped ViewModel to avoid redundant mapping and rendering operations.
    // Invalidation Strategy:
    // A cache hit requires the exact same 'hash'. The hash incorporates:
    // 1. notification.id
    // 2. notification.read_at
    // 3. notification.updated_at
    // 4. selection state (is selected)
    // 5. focus state (is focused)
    // 6. active selection mode
    // Any change to these fields will produce a new hash and trigger a re-mapping.
    private static viewModelCache = new Map<string, { hash: string, vm: any }>();

    public static async load(_htmlView: HtmlViewName): Promise<void> {
        const role = store.getState().currentUser?.role;
        const container = getPortalContentContainer(role || 'Client');
        if (!container) return;

        if (role === 'admin') LayoutManager.admin?.getTopbar().setTitle('Notification Center');
        else if (role === 'it-support') LayoutManager.support?.getTopbar().setTitle('Notification Center');
        else LayoutManager.client?.getTopbar().setTitle('Notification Center');

        this.parseUrlState();
        this.initializeComponents();

        const content = `
            <div class="notifications-page-layout" tabindex="-1">
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
        this.sidebarComponent = new NotificationSidebar((filter) => {
            this.currentFilter = filter;
            this.currentCursor = null;
            this.updateUrlState();
            this.fetchAndRender(true);
        });

        this.toolbarComponent = new NotificationToolbar(
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
                    showToast('All notifications marked as read', 'success');
                } catch (e) {
                    handleUIError(e, 'Failed to mark all as read');
                }
            },
            () => {
                this.isSelectionMode = !this.isSelectionMode;
                if (!this.isSelectionMode) {
                    this.selectedIds.clear();
                }
                this.renderToolbar();
                this.renderList();
            },
            async () => {
                if (this.selectedIds.size === 0) return;
                try {
                    const idsToMark = Array.from(this.selectedIds);
                    await notificationStore.markBulkAsRead(idsToMark);
                    this.isSelectionMode = false;
                    this.selectedIds.clear();
                    showToast('Selected notifications marked as read', 'success');
                    this.renderToolbar();
                    this.renderList();
                } catch (e) {
                    handleUIError(e, 'Failed to mark selected as read');
                }
            }
        );

        this.listComponent = new NotificationList(
            (id) => {
                this.selectNotification(id);
            },
            (id) => {
                this.toggleSelection(id);
            },
            () => {
                this.currentCursor = this.nextCursor;
                this.fetchAndRender(false);
            },
            async (id) => {
                this.markAsRead(id);
            }
        );

        this.detailComponent = new NotificationDetail(
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
        
        // Attach global keyboard listener to the layout container
        const layout = container.querySelector('.notifications-page-layout') as HTMLElement;
        if (layout) {
            // Remove previous listener to prevent duplicates on re-render
            layout.removeEventListener('keydown', this.handleKeyDown);
            layout.addEventListener('keydown', this.handleKeyDown);
            // Auto-focus container to start listening immediately
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
                totalCount, 
                this.isSelectionMode, 
                this.selectedIds.size
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
        this.currentCursor = null; // Always load from beginning on refresh
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

            // Phase 5.5 Focus refinement: if focused item is no longer in the list, fallback
            if (this.focusedId && !this.notificationIds.includes(this.focusedId)) {
                this.focusedId = this.notificationIds.length > 0 ? this.notificationIds[0] : null;
            }

            this.nextCursor = response.cursor;

            this.updateSidebarCounts();
            this.renderToolbar(); // Total counts might have changed
            this.renderList();
            this.renderDetail();
        } catch (err) {
            console.error('Error fetching notifications', err);
            if (listRoot && isInitial) {
                listRoot.innerHTML = '<div class="error-msg text-danger">Failed to load notifications.</div>';
            }
        }
    }

    private static getViewModel(id: string) {
        const n = notificationStore.getById(id);
        if (!n) return null;

        const isSelectedActive = this.selectedId === id;
        const isSelectedBulk = this.selectedIds.has(id);
        const isFocused = this.focusedId === id;
        
        // Cache key incorporates version/timestamps and transient UI states
        const hash = `${n.created_at}_${n.read_at}_${isSelectedActive}_${isSelectedBulk}_${isFocused}_${this.isSelectionMode}`;
        
        const cached = this.viewModelCache.get(id);
        if (cached && cached.hash === hash) {
            return cached.vm;
        }

        const vm = NotificationMapper.mapToViewModel(n, this.selectedId || undefined);
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
                
            listRoot.innerHTML = this.listComponent.render(vms as any, this.nextCursor, this.selectedIds, this.isSelectionMode, this.focusedId);
            this.listComponent.attachListeners(container as HTMLElement, this.isSelectionMode);
            IconService.renderIcons(container as HTMLElement);
        }
    }

    private static updateCardInDOM(id: string) {
        const vm = this.getViewModel(id);
        if (!vm) return;
        
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        const cardEl = container?.querySelector(`.notification-card[data-id="${id}"]`);
        if (cardEl) {
            const isSelectedBulk = this.selectedIds.has(id);
            const isFocused = this.focusedId === id;
            cardEl.outerHTML = NotificationCard.render(vm, isSelectedBulk, this.isSelectionMode, isFocused);
        }
    }

    private static selectNotification = (id: string) => {
        this.selectedId = id;
        this.updateUrlState();
        this.renderList();
        this.renderDetail();
    }

    private static toggleSelection = (id: string) => {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
        this.renderToolbar();
        this.renderList();
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
                detailRoot.innerHTML = this.detailComponent.render(NotificationMapper.mapToDetailViewModel(n));
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
                case 'accept-collab':
                    if (payload?.reqId) await ticketsAPI.approveCollaboration(payload.reqId);
                    showToast('Collaboration accepted', 'success');
                    break;
                case 'reject-collab':
                    if (payload?.reqId) await ticketsAPI.rejectCollaboration(payload.reqId);
                    showToast('Collaboration rejected', 'info');
                    break;
                case 'accept-transfer':
                    if (payload?.reqId) await ticketsAPI.approveTransfer(payload.reqId);
                    showToast('Transfer accepted', 'success');
                    break;
                case 'reject-transfer':
                    if (payload?.reqId) await ticketsAPI.rejectTransfer(payload.reqId);
                    showToast('Transfer rejected', 'info');
                    break;
                case 'view-ticket':
                    if (payload?.ticketId) {
                        try {
                            const ticket = await ticketsAPI.getById(payload.ticketId);
                            new TicketDetailModal(ticket, () => {}).open();
                        } catch (err) {
                            handleUIError(err, 'Failed to load ticket');
                        }
                    }
                    return; // Don't mark unactionable if just viewing ticket
            }

            // Mark as unactionable optimistically via store
            notificationStore.upsert([{ ...notification, metadata: { ...notification.metadata, actionable: false } }]);
        } catch (e) {
            handleUIError(e, 'Failed to process action');
        }
    }

    private static async markAsRead(id: string) {
        await notificationStore.markAsRead(id);
    }

    private static handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if focus is in an input or textarea
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
                    if (this.isSelectionMode) {
                        this.toggleSelection(this.focusedId);
                    } else {
                        this.selectNotification(this.focusedId);
                    }
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (this.isSelectionMode) {
                    this.isSelectionMode = false;
                    this.selectedIds.clear();
                    this.renderToolbar();
                    this.renderList();
                } else if (this.focusedId) {
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
            // Check if card is visible inside the listRoot
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

        if (key === 'ArrowDown') {
            currentIndex = currentIndex < this.notificationIds.length - 1 ? currentIndex + 1 : currentIndex;
        } else if (key === 'ArrowUp') {
            currentIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        } else if (key === 'Home') {
            currentIndex = 0;
        } else if (key === 'End') {
            currentIndex = this.notificationIds.length - 1;
        }

        // Fallback if indexOf returned -1 for a valid key
        if (currentIndex === -1) currentIndex = 0;

        if (currentIndex >= 0 && currentIndex < this.notificationIds.length) {
            this.focusedId = this.notificationIds[currentIndex];
            this.renderList();
            this.scrollToFocused();
        }
    }

    private static scrollToFocused() {
        const container = getPortalContentContainer(store.getState().currentUser?.role || 'Client');
        if (!container) return;
        const focusedEl = container.querySelector(`.notification-card[data-id="${this.focusedId}"]`);
        if (focusedEl) {
            focusedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    private static unsubscribeStore: (() => void) | null = null;
    private static pendingRenderFrame: number | null = null;
    private static batchedUpdatedIds = new Set<string>();
    private static batchedNeedsFullListRender = false;
    private static batchedNeedsDetailRender = false;

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
            // Incremental update
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
        this.isSelectionMode = false;
        this.selectedIds.clear();
        this.focusedId = null;
        
        if (this.unsubscribeStore) {
            this.unsubscribeStore();
            this.unsubscribeStore = null;
        }
    }
}
