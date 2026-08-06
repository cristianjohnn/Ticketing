import { showToast } from '../components/Toast';
import { LayoutManager } from '../layouts/LayoutManager';
import { loadPageForHtmlView } from '../pageLoader';
import { authAPI } from '../services/api';
import { sseClient } from '../services/sseClient';
import { store } from '../state/store';

export type ScreenId = 'login-screen' | 'client-screen' | 'admin-screen' | 'support-screen';
export type Portal = 'client' | 'admin' | 'support';

/** HTML sidebar data-view values used in index.html */
export type HtmlViewName =
    | 'my-tickets'
    | 'knowledge-base'
    | 'dashboard'
    | 'analytics'
    | 'all-tickets'
    | 'resolved'
    | 'users'
    | 'profile'
    | 'support-dashboard'
    | 'unclaimed-tickets'
    | 'collaborating-tickets'
    | 'notifications';

const VIEW_TITLES: Record<HtmlViewName, { client?: string; admin?: string; support?: string }> = {
    'my-tickets': { client: 'My Tickets', support: 'My Tickets' },
    'knowledge-base': { client: 'Knowledge Base', admin: 'Knowledge Base', support: 'Knowledge Base' },
    dashboard: { admin: 'Dashboard' },
    analytics: { admin: 'Analytics', support: 'My Analytics' },
    'support-dashboard': { support: 'Support Dashboard' },
    'all-tickets': { admin: 'All Tickets', support: 'All Tickets' },
    'unclaimed-tickets': { support: 'Unclaimed Tickets' },
    'collaborating-tickets': { support: 'Collaborating Tickets' },
    resolved: { admin: 'Resolved & Ratings' },
    users: { admin: 'User Management' },
    profile: { client: 'My Profile', admin: 'My Profile', support: 'My Profile' },
    notifications: { client: 'Notification Center', admin: 'Notification Center', support: 'Notification Center' },
};

/** Maps HTML nav view names to store currentView keys (unchanged store API). */
const HTML_TO_STORE_VIEW: Record<HtmlViewName, string> = {
    dashboard: 'dashboard',
    analytics: 'analytics',
    'support-dashboard': 'dashboard',
    'all-tickets': 'tickets',
    'unclaimed-tickets': 'tickets',
    'collaborating-tickets': 'tickets',
    resolved: 'tickets',
    'my-tickets': 'tickets',
    'knowledge-base': 'kb',
    users: 'users',
    profile: 'profile',
    notifications: 'notifications',
};

export class Router {
    public static showScreen(screenId: ScreenId): void {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId)?.classList.add('active');
    }

    public static enterClient(defaultView: HtmlViewName = 'my-tickets'): void {
        const user = store.getState().currentUser;
        if (user && user.role !== 'client') {
            console.warn(`enterClient called for ${user.role} user! Redirecting...`);
            this.enterPortal();
            return;
        }

        if (LayoutManager.client && user) {
            LayoutManager.client.getSidebar().setUserName(user.fullName || user.username);
        }

        this.showScreen('client-screen');
        this.switchView(defaultView, 'client');
    }

    public static enterAdmin(defaultView: HtmlViewName = 'dashboard'): void {
        const user = store.getState().currentUser;
        if (user && user.role !== 'admin') {
            console.warn(`enterAdmin called for ${user.role} user! Redirecting...`);
            this.enterPortal();
            return;
        }

        if (LayoutManager.admin && user) {
            LayoutManager.admin.getSidebar().setUserName(user.fullName || user.username);
        }

        // Show/hide Users tab in admin sidebar based on admin role
        const usersTab = document.getElementById('admin-nav-users');
        if (usersTab) {
            usersTab.style.display = user && user.role === 'admin' ? 'flex' : 'none';
        }

        this.showScreen('admin-screen');
        this.switchView(defaultView, 'admin');
    }

    public static enterSupport(defaultView: HtmlViewName = 'support-dashboard'): void {
        const user = store.getState().currentUser;
        if (user && user.role !== 'it-support') {
            console.warn(`enterSupport called for ${user.role} user! Redirecting...`);
            this.enterPortal();
            return;
        }

        if (LayoutManager.support && user) {
            LayoutManager.support.getSidebar().setUserName(user.fullName || user.username);
        }

        this.showScreen('support-screen');
        this.switchView(defaultView, 'support');
    }

    public static enterPortal(): void {
        const user = store.getState().currentUser;
        if (!user) {
            this.showScreen('login-screen');
            return;
        }

        // Connect SSE for realtime notifications
        sseClient.connect(user.id);
        sseClient.on('notification.created', (payload: any) => {
            if (payload.metadata?.recipientId === user.id) {
                showToast(`${payload.metadata.title}: ${payload.metadata.message}`, 'info');
            }
        });

        if (user.role === 'admin') {
            this.enterAdmin('dashboard');
        } else if (user.role === 'it-support') {
            this.enterSupport('support-dashboard');
        } else {
            this.enterClient('my-tickets');
        }
    }

    public static switchView(htmlViewName: string, portal?: Portal): void {
        const user = store.getState().currentUser;
        let resolvedPortal: Portal = portal || 'client';
        if (!portal) {
            if (user?.role === 'admin') resolvedPortal = 'admin';
            else if (user?.role === 'it-support') resolvedPortal = 'support';
        }

        if (resolvedPortal === 'admin') {
            if (LayoutManager.admin) {
                LayoutManager.admin.getSidebar().setActiveView(htmlViewName);
                const titles = VIEW_TITLES[htmlViewName as HtmlViewName];
                LayoutManager.admin.getTopbar().setTitle(titles?.admin ?? htmlViewName.replace(/-/g, ' '));
                LayoutManager.admin.getTopbar().clearActions();
                LayoutManager.admin.getTopbar().notificationsDropdown.loadNotifications();
            } else {
                // Fallback for legacy
                const sidebar = document.getElementById('admin-sidebar');
                sidebar?.querySelectorAll('.sb-nav-btn').forEach(btn => {
                    const view = btn.getAttribute('data-view');
                    btn.classList.toggle('active', view === htmlViewName);
                });
                const titleEl = document.getElementById('admin-page-title');
                if (titleEl) {
                    const titles = VIEW_TITLES[htmlViewName as HtmlViewName];
                    titleEl.textContent = titles?.admin ?? htmlViewName.replace(/-/g, ' ');
                }
            }
        } else if (resolvedPortal === 'support') {
            if (LayoutManager.support) {
                LayoutManager.support.getSidebar().setActiveView(htmlViewName);
                const titles = VIEW_TITLES[htmlViewName as HtmlViewName];
                LayoutManager.support.getTopbar().setTitle(titles?.support ?? htmlViewName.replace(/-/g, ' '));
                LayoutManager.support.getTopbar().clearActions();
                LayoutManager.support.getTopbar().notificationsDropdown.loadNotifications();
            }
        } else {
            if (LayoutManager.client) {
                LayoutManager.client.getSidebar().setActiveView(htmlViewName);
                const titles = VIEW_TITLES[htmlViewName as HtmlViewName];
                LayoutManager.client.getTopbar().setTitle(titles?.client ?? htmlViewName.replace(/-/g, ' '));
                LayoutManager.client.getTopbar().clearActions();
                LayoutManager.client.getTopbar().notificationsDropdown.loadNotifications();
            } else {
                // Fallback for legacy
                const sidebar = document.getElementById('client-sidebar');
                sidebar?.querySelectorAll('.sb-nav-btn').forEach(btn => {
                    const view = btn.getAttribute('data-view');
                    btn.classList.toggle('active', view === htmlViewName);
                });
                const titleEl = document.getElementById('client-page-title');
                if (titleEl) {
                    const titles = VIEW_TITLES[htmlViewName as HtmlViewName];
                    titleEl.textContent = titles?.client ?? htmlViewName.replace(/-/g, ' ');
                }
            }
        }

        const storeView = HTML_TO_STORE_VIEW[htmlViewName as HtmlViewName] ?? htmlViewName;
        store.setView(storeView, { force: true });
        loadPageForHtmlView(htmlViewName);
    }

    public static logout(): void {
        const user = store.getState().currentUser;
        if (user) {
            authAPI.logout(user.token).catch(() => {});
        }
        sseClient.disconnect();
        store.setSession(null);
        this.showScreen('login-screen');
    }
}
