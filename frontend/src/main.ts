import './style.css';
import { store } from './state/store';
import { Router } from './router/router';
import { NavbarComponent } from './components/Navbar';
import { SidebarComponent } from './components/Sidebar';
import { ModalsComponent } from './components/Modals';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { TicketsPage } from './pages/Tickets';
import { CreateTicketPage } from './pages/CreateTicket';
import { ArticlesPage } from './pages/Articles';
import { StatisticsPage } from './pages/Statistics';
import { AdminPage } from './pages/Admin';

class App {
    public static init(): void {
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize global navbar, sidebar, and modals listeners
            NavbarComponent.init();
            SidebarComponent.init();
            ModalsComponent.initModalCloseListeners();

            // Initialize Page Handlers
            LoginPage.init();
            TicketsPage.init();
            CreateTicketPage.init();
            ArticlesPage.init();

            // Subscribe to state view changes to trigger page data loading
            store.subscribe(() => {
                const { currentView, currentUser } = store.getState();
                if (!currentUser) return;

                switch (currentView) {
                    case 'dashboard':
                        DashboardPage.load();
                        break;
                    case 'tickets':
                        TicketsPage.load();
                        break;
                    case 'kb':
                        ArticlesPage.load();
                        break;
                    case 'stats':
                        StatisticsPage.load();
                        break;
                    case 'admin':
                        if (currentUser.role === 'admin') AdminPage.load();
                        break;
                }
            });

            // Check existing user session
            const session = store.loadSession();
            if (session) {
                Router.showScreen('main-app');
                Router.switchView('dashboard');
                DashboardPage.load();
            } else {
                Router.showScreen('login-screen');
            }
        });
    }
}

// Bootstrap application
App.init();
