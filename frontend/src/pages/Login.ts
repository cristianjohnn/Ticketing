import { showToast } from '../components/Toast';
import { Router } from '../router/router';
import { authAPI } from '../services/api';
import { store } from '../state/store';
import { handleUIError } from '../utils/errorHandler';
import { LoadingManager } from '../utils/loadingManager';

export class LoginPage {
    private static isRegisterMode = false;

    public static init(): void {
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        const usernameInput = document.getElementById('login-username') as HTMLInputElement;
        const passwordInput = document.getElementById('login-password') as HTMLInputElement;
        const fullNameInput = document.getElementById('login-fullname') as HTMLInputElement;
        const emailInput = document.getElementById('login-email') as HTMLInputElement;
        const confirmPasswordInput = document.getElementById(
            'login-confirm-password',
        ) as HTMLInputElement;
        const rememberCheckbox = document.getElementById('login-remember') as HTMLInputElement;

        // Container wrappers
        const fullNameGroup = document.getElementById('fullName-group');
        const emailGroup = document.getElementById('email-group');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const rememberMeGroup = document.getElementById('remember-me-group');
        const passwordRequirements = document.getElementById('password-requirements');

        // Form texts
        const authTitle = document.getElementById('auth-title');
        const loginBtnText = document.getElementById('login-btn-text');
        const authToggleMessage = document.getElementById('auth-toggle-message');
        const toggleAuthMode = document.getElementById('toggle-auth-mode');

        // Password Show/Hide Toggle
        const passwordToggle = document.getElementById('login-password-toggle');
        passwordToggle?.addEventListener('click', () => {
            if (passwordInput) {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                passwordToggle.innerHTML =
                    type === 'password'
                        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
                        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
            }
        });

        // Mode toggler
        toggleAuthMode?.addEventListener('click', e => {
            e.preventDefault();
            this.isRegisterMode = !this.isRegisterMode;

            // Hide forgot password message when switching modes
            const forgotMsg = document.getElementById('forgot-password-message');
            if (forgotMsg) forgotMsg.style.display = 'none';
            const forgotContainer = document.getElementById('forgot-password-container');

            if (this.isRegisterMode) {
                // Switch to Register Mode
                if (fullNameGroup) fullNameGroup.style.display = 'block';
                if (emailGroup) emailGroup.style.display = 'block';
                if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'block';
                if (rememberMeGroup) rememberMeGroup.style.display = 'none';
                if (forgotContainer) forgotContainer.style.display = 'none';

                // Show password requirements
                if (passwordRequirements) {
                    passwordRequirements.style.display = 'block';
                    requestAnimationFrame(() => {
                        passwordRequirements.style.maxHeight = '200px';
                        passwordRequirements.style.opacity = '1';
                    });
                }

                if (authTitle) authTitle.textContent = 'Register';
                if (loginBtnText) loginBtnText.textContent = 'Register';
                if (authToggleMessage) authToggleMessage.textContent = 'Already have an account?';
                if (toggleAuthMode) toggleAuthMode.textContent = 'Sign In';

                // Set inputs as required/optional
                if (fullNameInput) fullNameInput.required = true;
                if (emailInput) emailInput.required = true;
                if (confirmPasswordInput) confirmPasswordInput.required = true;
            } else {
                // Switch to Sign In Mode
                if (fullNameGroup) fullNameGroup.style.display = 'none';
                if (emailGroup) emailGroup.style.display = 'none';
                if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
                if (rememberMeGroup) rememberMeGroup.style.display = 'flex';
                if (forgotContainer) forgotContainer.style.display = 'block';

                // Hide password requirements
                if (passwordRequirements) {
                    passwordRequirements.style.maxHeight = '0';
                    passwordRequirements.style.opacity = '0';
                    setTimeout(() => {
                        if (!this.isRegisterMode && passwordRequirements) {
                            passwordRequirements.style.display = 'none';
                        }
                    }, 300);
                }

                if (authTitle) authTitle.textContent = 'Sign In';
                if (loginBtnText) loginBtnText.textContent = 'Sign In';
                if (authToggleMessage) authToggleMessage.textContent = "Don't have an account?";
                if (toggleAuthMode) toggleAuthMode.textContent = 'Register';

                // Remove requirements
                if (fullNameInput) fullNameInput.required = false;
                if (emailInput) emailInput.required = false;
                if (confirmPasswordInput) confirmPasswordInput.required = false;
            }
        });

        // Forgot Password toggle
        const forgotLink = document.getElementById('forgot-password-link');
        forgotLink?.addEventListener('click', e => {
            e.preventDefault();
            const forgotMsg = document.getElementById('forgot-password-message');
            if (forgotMsg) {
                forgotMsg.style.display = forgotMsg.style.display === 'none' ? 'block' : 'none';
            }
        });

        // Live password requirements validation
        passwordInput?.addEventListener('input', () => {
            if (!this.isRegisterMode) return;
            const val = passwordInput.value;
            const rules: Record<string, boolean> = {
                length: val.length >= 8,
                uppercase: /[A-Z]/.test(val),
                lowercase: /[a-z]/.test(val),
                number: /[0-9]/.test(val),
                special: /[^a-zA-Z0-9]/.test(val),
            };
            Object.entries(rules).forEach(([key, passed]) => {
                const row = document.querySelector(`.pw-req[data-req="${key}"]`) as HTMLElement;
                if (!row) return;
                const checkPath = row.querySelector('.pw-check-path') as SVGElement;
                if (passed) {
                    row.style.color = 'var(--badge-success-text)';
                    if (checkPath) checkPath.setAttribute('opacity', '1');
                } else {
                    row.style.color = 'var(--color-text-muted)';
                    if (checkPath) checkPath.setAttribute('opacity', '0');
                }
            });
        });

        loginForm?.addEventListener('submit', async e => {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (this.isRegisterMode) {
                // Client-side validations for registration
                const fullName = fullNameInput.value.trim();
                const email = emailInput.value.trim();
                const confirmPassword = confirmPasswordInput.value;

                if (!fullName || !email || !username || !password) {
                    showToast('Please fill in all fields', 'error');
                    return;
                }

                if (password !== confirmPassword) {
                    showToast('Passwords do not match', 'error');
                    return;
                }

                // Password strength check
                const hasLetter = /[a-zA-Z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                if (password.length < 8 || !hasLetter || !hasNumber) {
                    showToast(
                        'Password must be at least 8 characters long and contain both letters and numbers',
                        'error',
                    );
                    return;
                }

                const submitBtn = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
                LoadingManager.setButtonLoading(submitBtn, true);

                try {
                    const res = await authAPI.register(fullName, username, email, password);
                    if (res.success) {
                        showToast('Account registered successfully! Please sign in.', 'success');
                        // Reset form fields
                        if (fullNameInput) fullNameInput.value = '';
                        if (emailInput) emailInput.value = '';
                        if (confirmPasswordInput) confirmPasswordInput.value = '';
                        // Toggle back to login mode
                        toggleAuthMode?.click();
                    }
                } catch (err: unknown) {
                    handleUIError(err, 'Registration failed');
                } finally {
                    LoadingManager.setButtonLoading(submitBtn, false);
                }
            } else {
                // Sign In mode
                if (!username || !password) {
                    showToast('Please enter both username and password', 'error');
                    return;
                }

                const submitBtn = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
                LoadingManager.setButtonLoading(submitBtn, true);

                try {
                    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
                    const res = await authAPI.login(username, password);
                    if (res.success) {
                        store.setSession(res.user, rememberMe);
                        showToast(`Welcome back, ${res.user.fullName}!`, 'success');

                        Router.enterPortal();
                    }
                } catch (err: unknown) {
                    handleUIError(err, 'Login failed');
                } finally {
                    LoadingManager.setButtonLoading(submitBtn, false);
                }
            }
        });
    }
}
