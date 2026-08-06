import { showToast } from '../components/Toast';
import { usersAPI } from '../services/api';
import { store } from '../state/store';
import { handleUIError } from '../utils/errorHandler';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';

export class ProfilePage {
    public static async load(): Promise<void> {
        const user = store.getState().currentUser;
        if (!user) return;

        const container = getPortalContentContainer(store.getState().currentUser!.role);
        if (!container) return;

        const roleLabel =
            user.role === 'it-support'
                ? 'IT Support'
                : user.role.charAt(0).toUpperCase() + user.role.slice(1);

        LoadingManager.registerSkeleton('profile', () => `
            <div class="profile-page">
                <div class="profile-card">
                    <div class="profile-card-accent"></div>
                    <div class="profile-card-body">
                        <div class="profile-header">
                            <div class="skeleton skeleton-text" style="width: 64px; height: 64px; border-radius: 50%;"></div>
                            <div style="flex: 1;">
                                <div class="skeleton skeleton-text" style="width: 200px; height: 28px; margin-bottom: 8px;"></div>
                                <div class="skeleton skeleton-text" style="width: 80px; height: 22px;"></div>
                            </div>
                        </div>
                        <div class="profile-info-grid">
                            ${Array.from({ length: 5 }).map(() => `
                                <div class="profile-info-item">
                                    <div class="skeleton skeleton-text" style="width: 80px; height: 14px; margin-bottom: 6px;"></div>
                                    <div class="skeleton skeleton-text" style="width: 100%; height: 40px; border-radius: var(--radius-md);"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `);

        LoadingManager.showSkeleton(container, 'profile');
        await LoadingManager.hideSkeleton(container);

        await TransitionManager.crossFadeContent(container, () => {
            container.innerHTML = `
                <div class="profile-page">
                    <div class="profile-card">
                        <div class="profile-card-accent"></div>
                        <div class="profile-card-body">
                            <div class="profile-header">
                                <div class="profile-avatar">${(user.fullName || user.username).charAt(0).toUpperCase()}</div>
                                <div>
                                    <h2 class="profile-name">${user.fullName || user.username}</h2>
                                    <span class="profile-role-badge">${roleLabel}</span>
                                </div>
                            </div>

                            <div class="profile-info-grid">
                                <div class="profile-info-item">
                                    <label>Full Name</label>
                                    <div class="profile-info-value">${user.fullName || '—'}</div>
                                </div>
                                <div class="profile-info-item">
                                    <label>Username</label>
                                    <div class="profile-info-value">${user.username}</div>
                                </div>
                                <div class="profile-info-item">
                                    <label>Email</label>
                                    <div class="profile-info-value">${user.email || '—'}</div>
                                </div>
                                <div class="profile-info-item">
                                    <label>Role</label>
                                    <div class="profile-info-value">${roleLabel}</div>
                                </div>
                                <div class="profile-info-item">
                                    <label>Account Status</label>
                                    <div class="profile-info-value">
                                        <span class="status-dot active"></span> Active
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="profile-security-card">
                        <h3 class="profile-section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Change Password
                        </h3>
                        <p class="profile-section-subtitle">Update your password to keep your account secure. You will be logged out of other sessions.</p>
                        <form id="change-password-form" class="change-password-form">
                            <div class="form-group">
                                <label for="profile-current-password">Current Password <span class="required">*</span></label>
                                <div class="input-wrapper">
                                    <input type="password" id="profile-current-password" class="form-control" placeholder="Enter current password">
                                    <button type="button" class="password-toggle-btn" id="profile-current-toggle">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="profile-new-password">New Password <span class="required">*</span></label>
                                <div class="input-wrapper">
                                    <input type="password" id="profile-new-password" class="form-control" placeholder="Enter new password">
                                    <button type="button" class="password-toggle-btn" id="profile-new-toggle">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                </div>
                                <small class="password-hint">Min 8 characters, at least one letter and one number</small>
                            </div>

                            <div class="form-group">
                                <label for="profile-confirm-password">Confirm New Password <span class="required">*</span></label>
                                <div class="input-wrapper">
                                    <input type="password" id="profile-confirm-password" class="form-control" placeholder="Confirm new password">
                                    <button type="button" class="password-toggle-btn" id="profile-confirm-toggle">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary" id="change-password-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                    <polyline points="17 21 17 13 7 13 7 21"/>
                                    <polyline points="7 3 7 8 15 8"/>
                                </svg>
                                <span>Update Password</span>
                            </button>
                        </form>
                    </div>
                </div>
        `;

        this.initPasswordToggles();
        this.initForm();
        });
    }

    private static initPasswordToggles(): void {
        const toggles = [
            { toggleId: 'profile-current-toggle', inputId: 'profile-current-password' },
            { toggleId: 'profile-new-toggle', inputId: 'profile-new-password' },
            { toggleId: 'profile-confirm-toggle', inputId: 'profile-confirm-password' },
        ];

        for (const { toggleId, inputId } of toggles) {
            const btn = document.getElementById(toggleId);
            const input = document.getElementById(inputId) as HTMLInputElement;
            if (!btn || !input) continue;

            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.innerHTML = isPassword
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
                    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
            });
        }
    }

    private static initForm(): void {
        const form = document.getElementById('change-password-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();

            const currentPassword = (
                document.getElementById('profile-current-password') as HTMLInputElement
            ).value;
            const newPassword = (
                document.getElementById('profile-new-password') as HTMLInputElement
            ).value;
            const confirmPassword = (
                document.getElementById('profile-confirm-password') as HTMLInputElement
            ).value;
            const submitBtn = document.getElementById('change-password-btn') as HTMLButtonElement;

            // Client-side validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast('All password fields are required.', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('New password and confirmation do not match.', 'error');
                return;
            }

            if (
                newPassword.length < 8 ||
                !/[a-zA-Z]/.test(newPassword) ||
                !/[0-9]/.test(newPassword)
            ) {
                showToast(
                    'Password must be at least 8 characters with at least one letter and one number.',
                    'error',
                );
                return;
            }

            if (currentPassword === newPassword) {
                showToast('New password must be different from your current password.', 'error');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Updating...';
                }

                await usersAPI.changePassword(currentPassword, newPassword, confirmPassword);

                showToast(
                    'Password changed successfully! All other sessions have been invalidated.',
                    'success',
                );
                form.reset();
            } catch (err: unknown) {
                handleUIError(err, 'Failed to change password');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17 21 17 13 7 13 7 21"/>
                            <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        <span>Update Password</span>
                    `;
                }
            }
        });
    }
}
