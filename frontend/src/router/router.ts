import { store } from '../state/store';

export class Router {
    public static showScreen(screenId: 'login-screen' | 'main-app'): void {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');

        if (screenId === 'login-screen') {
            loginScreen?.classList.add('active');
            mainApp?.classList.remove('active');
        } else {
            loginScreen?.classList.remove('active');
            mainApp?.classList.add('active');
        }
    }

    public static switchView(viewName: string): void {
        store.setView(viewName);

        // Update active class on nav links
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Hide/show views
        const views = ['view-dashboard', 'view-tickets', 'view-kb', 'view-stats', 'view-admin'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) {
                if (v === `view-${viewName}`) {
                    el.style.display = 'block';
                } else {
                    el.style.display = 'none';
                }
            }
        });

        // Update header view title
        const titleEl = document.getElementById('current-view-title');
        if (titleEl) {
            switch (viewName) {
                case 'dashboard': titleEl.textContent = 'Dashboard Overview'; break;
                case 'tickets': titleEl.textContent = 'Support Tickets'; break;
                case 'kb': titleEl.textContent = 'Knowledge Base'; break;
                case 'stats': titleEl.textContent = 'Analytics & Statistics'; break;
                case 'admin': titleEl.textContent = 'Admin Control Panel'; break;
                default: titleEl.textContent = 'Dashboard'; break;
            }
        }
    }
}
