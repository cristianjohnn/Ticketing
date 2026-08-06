import { authAPI } from '../services/api';
import { store } from '../state/store';
import { Router } from '../router/router';
import { showToast } from '../components/Toast';

export class LoginPage {
    public static init(): void {
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        const roleSelect = document.getElementById('login-role') as HTMLSelectElement;
        const usernameInput = document.getElementById('login-username') as HTMLInputElement;
        const passwordContainer = document.getElementById('password-group');
        const passwordInput = document.getElementById('login-password') as HTMLInputElement;

        // Toggle admin password field based on role select
        roleSelect?.addEventListener('change', () => {
            if (passwordContainer) {
                passwordContainer.style.display = roleSelect.value === 'admin' ? 'block' : 'none';
            }
        });

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const role = roleSelect.value;
            const username = usernameInput.value.trim();
            const password = passwordInput ? passwordInput.value : '';

            if (!username) {
                showToast('Please enter your name', 'error');
                return;
            }

            try {
                const res = await authAPI.login(role, password);
                if (res.success) {
                    store.setSession({ username, role });
                    showToast(`Welcome back, ${username}!`, 'success');
                    Router.showScreen('main-app');
                    Router.switchView('dashboard');
                }
            } catch (err: any) {
                showToast(err.message || 'Authentication failed', 'error');
            }
        });
    }
}
