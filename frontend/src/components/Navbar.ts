import { store } from '../state/store';
import { Router } from '../router/router';

export class NavbarComponent {
    public static init(): void {
        this.initThemeToggle();
        this.initUserBadge();
    }

    public static initThemeToggle(): void {
        const toggleTheme = () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            const icons = document.querySelectorAll('.theme-icon');
            icons.forEach(icon => {
                icon.textContent = isDark ? '☀️' : '🌙';
            });
        };

        const globalBtn = document.getElementById('global-theme-toggle');
        const headerBtn = document.getElementById('header-theme-toggle');

        globalBtn?.addEventListener('click', toggleTheme);
        headerBtn?.addEventListener('click', toggleTheme);

        // Load saved theme preference
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            const icons = document.querySelectorAll('.theme-icon');
            icons.forEach(icon => icon.textContent = '☀️');
        }
    }

    public static initUserBadge(): void {
        store.subscribe(() => {
            const user = store.getState().currentUser;
            const badge = document.getElementById('user-badge-name');
            const roleBadge = document.getElementById('user-badge-role');
            const adminNavItem = document.querySelector('.nav-item[data-view="admin"]');

            if (badge) badge.textContent = user ? user.username : 'Guest';
            if (roleBadge) roleBadge.textContent = user ? user.role.toUpperCase() : 'CLIENT';

            // Show admin tab only for admin role
            if (adminNavItem) {
                (adminNavItem as HTMLElement).style.display = (user && user.role === 'admin') ? 'flex' : 'none';
            }
        });

        // Logout listener
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            store.setSession(null);
            Router.showScreen('login-screen');
        });
    }
}
