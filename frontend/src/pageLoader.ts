import { AnalyticsPage } from './pages/Analytics';
import { ArticlesPage } from './pages/Articles';
import { ClientNotificationsPage } from './pages/client/ClientNotificationsPage';
import { DashboardPage } from './pages/Dashboard';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/Profile';

import { SupportTicketListPage } from './pages/SupportTicketListPage';
import { TicketsPage } from './pages/Tickets';
import { UsersPage } from './pages/Users';
import { HtmlViewName } from './router/router';
import { store } from './state/store';
import { getPortalContentContainer, renderPlaceholder } from './utils/portalContent';
import { TicketFilterMode } from './utils/SupportTicketFilters';

export type RouteHandler = (view: HtmlViewName) => Promise<void>;

const routeRegistry: Record<HtmlViewName, RouteHandler> = {
    'dashboard': () => DashboardPage.load(),
    'support-dashboard': () => DashboardPage.load(),
    'analytics': () => AnalyticsPage.load(),
    'my-tickets': (view) => {
        if (store.getState().currentUser?.role === 'it-support') {
            return SupportTicketListPage.load(TicketFilterMode.Owned);
        }
        return TicketsPage.load(view);
    },
    'unclaimed-tickets': () => SupportTicketListPage.load(TicketFilterMode.Unclaimed),
    'collaborating-tickets': () => SupportTicketListPage.load(TicketFilterMode.Collaborating),
    'all-tickets': (view) => {
        if (store.getState().currentUser?.role === 'it-support') {
            return SupportTicketListPage.load(TicketFilterMode.All);
        }
        return TicketsPage.load(view);
    },
    'resolved': (view) => TicketsPage.load(view),
    'knowledge-base': () => ArticlesPage.load(),
    'users': () => UsersPage.load(),
    'profile': () => ProfilePage.load(),
    'notifications': (view) => {
        if (store.getState().currentUser?.role === 'client') {
            return ClientNotificationsPage.load(view);
        }
        return NotificationsPage.load(view);
    },
};

export async function loadPageForHtmlView(htmlView: string): Promise<void> {
    const user = store.getState().currentUser;
    if (!user) return;

    const container = getPortalContentContainer(user.role);
    if (!container) return;

    if (htmlView === 'notifications') {
        container.classList.add('no-padding');
    } else {
        container.classList.remove('no-padding');
    }

    const handler = routeRegistry[htmlView as HtmlViewName];
    if (handler) {
        await handler(htmlView as HtmlViewName);
    } else {
        console.warn(`[RouteRegistry] No handler registered for view "${htmlView}". Rendering placeholder.`);
        renderPlaceholder(user.role, 'This section is coming soon.');
    }
}
