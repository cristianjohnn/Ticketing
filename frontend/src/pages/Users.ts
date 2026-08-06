import { SearchIcon } from '../components/common/Icons';
import { ModalsManager } from '../components/modals/ModalsManager';
import { showToast } from '../components/Toast';
import { LayoutManager } from '../layouts/LayoutManager';
import { usersAPI } from '../services/api';
import { store } from '../state/store';
import { User } from '../types';
import { getErrorMessage, handleUIError } from '../utils/errorHandler';
import { escapeHTML } from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';

export class UsersPage {
    private static listenersBound = false;

    public static async load(): Promise<void> {
        const container = getPortalContentContainer(store.getState().currentUser!.role);
        if (!container) return;

        LoadingManager.registerSkeleton('users-table', () => `
            <div class="controls-row" style="margin-bottom: 20px; display: flex; justify-content: space-between;">
                <div class="skeleton skeleton-btn"></div>
                <div style="display: flex; gap: 10px;">
                    <div class="skeleton skeleton-btn"></div>
                    <div class="skeleton skeleton-btn" style="width: 200px;"></div>
                </div>
            </div>
            <div style="background: var(--color-bg-surface); border-radius: 8px; border: 1px solid var(--color-border); overflow: hidden;">
                ${Array.from({ length: 5 }).map(() => `
                    <div style="display: flex; padding: 16px; border-bottom: 1px solid var(--color-border); align-items: center;">
                        <div class="skeleton skeleton-text" style="width: 40px; margin-bottom: 0; margin-right: 16px;"></div>
                        <div style="flex: 1;">
                            <div class="skeleton skeleton-text" style="width: 40%; margin-bottom: 8px;"></div>
                            <div class="skeleton skeleton-text" style="width: 20%; margin-bottom: 0;"></div>
                        </div>
                        <div class="skeleton skeleton-btn" style="width: 80px; height: 24px; border-radius: 12px;"></div>
                    </div>
                `).join('')}
            </div>
        `);

        LoadingManager.showSkeleton(container, 'users-table');
        LayoutManager.admin?.getTopbar().setActions(this.createHeaderControls());
        this.initListeners();
        await this.refreshUsersList();
    }

    private static createHeaderControls(): HTMLElement {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.alignItems = 'center';
        
        container.innerHTML = `
            <div class="search-box">
                ${SearchIcon({ size: 14 })}
                <input type="text" id="users-search-input" placeholder="Search users...">
            </div>
            <button id="create-user-btn" class="btn btn-primary" style="height: 36px; display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Create User
            </button>
        `;

        let searchTimeout: number | null = null;
        container.querySelector('#users-search-input')?.addEventListener('input', e => {
            const val = (e.target as HTMLInputElement).value;
            if (searchTimeout !== null) window.clearTimeout(searchTimeout);
            searchTimeout = window.setTimeout(() => {
                this.refreshUsersList(val);
            }, 300);
        });

        container.querySelector('#create-user-btn')?.addEventListener('click', () => {
            this.openUserModal();
        });

        return container;
    }

    private static async refreshUsersList(search?: string): Promise<void> {
        const container = getPortalContentContainer(store.getState().currentUser!.role);
        if (!container) return;

        try {
            const users = await usersAPI.getAll(search);
            await LoadingManager.hideSkeleton(container);
            
            await TransitionManager.crossFadeContent(container, () => {
                // Only rebuild the table if it's not already in the DOM
                let tbody = document.getElementById('users-table-body');
                if (!tbody) {
                    container.innerHTML = `
                        <div class="table-container">
                            <table class="glass-table">
                                <thead>
                                    <tr>
                                        <th>Full Name</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th style="text-align:right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="users-table-body"></tbody>
                            </table>
                        </div>
                    `;
                    tbody = document.getElementById('users-table-body');
                }
                if (!tbody) return;
                
                if (users.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" style="padding: var(--space-2xl);">
                                <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                                    <div class="empty-state-icon">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                                    </div>
                                    <p>No users found matching your criteria.</p>
                                </div>
                            </td>
                        </tr>
                    `;
                    return;
                }

                tbody.innerHTML = users
                    .map(
                        u => `
                    <tr>
                        <td>
                            <span class="user-name" style="font-weight: 600; color: var(--color-text-heading);">${escapeHTML(u.fullName)}</span>
                        </td>
                        <td><span class="text-secondary">@${escapeHTML(u.username)}</span></td>
                        <td>${escapeHTML(u.email)}</td>
                        <td>
                            <span class="badge ${u.role === 'admin' ? 'badge-severity-high' : u.role === 'it-support' ? 'badge-severity-moderate' : 'badge-severity-low'}">
                                ${escapeHTML(u.role)}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${Number(u.active) === 1 ? 'badge-status-resolved' : 'badge-status-closed'}">
                                ${Number(u.active) === 1 ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td style="text-align:right">
                            <button class="btn btn-ghost btn-icon btn-edit-user" data-id="${escapeHTML(u.id)}" title="Edit User">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button class="btn btn-ghost btn-icon btn-reset-user" data-id="${escapeHTML(u.id)}" title="Reset Password">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </button>
                            <button class="btn btn-icon btn-danger btn-deactivate-user" data-id="${escapeHTML(u.id)}" title="${Number(u.active) === 1 ? 'Deactivate User' : 'Activate User'}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                            </button>
                        </td>
                    </tr>
                `,
                )
                .join('');

            // Bind action clicks via Event Delegation
            tbody.addEventListener('click', async (e) => {
                const target = e.target as HTMLElement;
                
                // Edit User
                const editBtn = target.closest('.btn-edit-user');
                if (editBtn) {
                    const id = editBtn.getAttribute('data-id');
                    if (id) {
                        const user = users.find(x => x.id === id);
                        if (user) this.openUserModal(user);
                    }
                    return;
                }

                // Reset Password
                const resetBtn = target.closest('.btn-reset-user');
                if (resetBtn) {
                    const id = resetBtn.getAttribute('data-id');
                    if (id) {
                        const user = users.find(x => x.id === id);
                        if (user) this.openResetPasswordModal(user);
                    }
                    return;
                }

                // Deactivate/Activate User
                const deactivateBtn = target.closest('.btn-deactivate-user');
                if (deactivateBtn) {
                    const id = deactivateBtn.getAttribute('data-id');
                    if (id) {
                        const user = users.find(x => x.id === id);
                        if (!user) return;
                        const action = Number(user.active) === 1 ? 'deactivate' : 'activate';
                        if (confirm(`Are you sure you want to ${action} user ${user.username}?`)) {
                            try {
                                await usersAPI.update(user.id, { active: Number(user.active) !== 1 });
                                showToast(`User ${action}d successfully`, 'success');
                                this.refreshUsersList();
                            } catch (err: unknown) {
                                handleUIError(err, 'Deactivation failed');
                            }
                        }
                    }
                    return;
                }
            });
        });
        } catch (err: unknown) {
            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:var(--color-danger)">Failed to load users: ${escapeHTML(getErrorMessage(err, 'Unknown error'))}</td></tr>`;
            }
        }
    }

    private static initListeners(): void {
        if (this.listenersBound) return;
        this.listenersBound = true;

        // User password toggle
        const passwordToggle = document.getElementById('user-password-toggle');
        const passwordInput = document.getElementById('user-password') as HTMLInputElement;
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

        // User form submit
        const form = document.getElementById('user-form') as HTMLFormElement;
        form?.addEventListener('submit', async e => {
            e.preventDefault();

            const idField = document.getElementById('user-id-field') as HTMLInputElement;
            const fullnameInput = document.getElementById('user-fullname') as HTMLInputElement;
            const usernameInput = document.getElementById('user-username') as HTMLInputElement;
            const emailInput = document.getElementById('user-email') as HTMLInputElement;
            const passwordInput = document.getElementById('user-password') as HTMLInputElement;
            const roleSelect = document.getElementById('user-role') as HTMLSelectElement;
            const activeCheckbox = document.getElementById('user-active') as HTMLInputElement;

            const isEdit = !!idField.value;

            try {
                if (isEdit) {
                    await usersAPI.update(idField.value, {
                        fullName: fullnameInput.value.trim(),
                        email: emailInput.value.trim(),
                        role: roleSelect.value,
                        active: activeCheckbox.checked,
                    });
                    showToast('User updated successfully', 'success');
                } else {
                    const password = passwordInput.value;
                    const hasLetter = /[a-zA-Z]/.test(password);
                    const hasNumber = /[0-9]/.test(password);
                    if (password.length < 8 || !hasLetter || !hasNumber) {
                        showToast(
                            'Password must be at least 8 characters long and contain both letters and numbers',
                            'error',
                        );
                        return;
                    }

                    await usersAPI.create({
                        fullName: fullnameInput.value.trim(),
                        username: usernameInput.value.trim(),
                        email: emailInput.value.trim(),
                        password,
                        role: roleSelect.value,
                    });
                    showToast('User created successfully', 'success');
                }

                ModalsManager.closeModal('user-modal');
                this.refreshUsersList();
            } catch (err: unknown) {
                handleUIError(err, 'Action failed');
            }
        });

        // Reset password form submit
        const resetForm = document.getElementById('reset-password-form') as HTMLFormElement;
        resetForm?.addEventListener('submit', async e => {
            e.preventDefault();
            const idField = document.getElementById('reset-user-id-field') as HTMLInputElement;
            const passwordInput = document.getElementById('reset-password-val') as HTMLInputElement;
            const confirmInput = document.getElementById(
                'reset-password-confirm',
            ) as HTMLInputElement;

            const password = passwordInput.value;
            if (password !== confirmInput.value) {
                showToast('Passwords do not match', 'error');
                return;
            }

            const hasLetter = /[a-zA-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (password.length < 8 || !hasLetter || !hasNumber) {
                showToast(
                    'Password must be at least 8 characters long and contain both letters and numbers',
                    'error',
                );
                return;
            }

            const submitBtn = resetForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
            LoadingManager.setButtonLoading(submitBtn, true);

            try {
                await usersAPI.resetPassword(idField.value, password);
                showToast('Password reset successfully', 'success');
                ModalsManager.closeModal('reset-password-modal');
            } catch (err: unknown) {
                handleUIError(err, 'Reset failed');
            } finally {
                LoadingManager.setButtonLoading(submitBtn, false);
            }
        });

        // Cancel button listeners
        document.getElementById('cancel-user-modal-btn')?.addEventListener('click', () => {
            ModalsManager.closeModal('user-modal');
        });
        document.getElementById('cancel-reset-modal-btn')?.addEventListener('click', () => {
            ModalsManager.closeModal('reset-password-modal');
        });
    }

    private static openUserModal(user?: User): void {
        const title = document.getElementById('user-modal-title');
        const idField = document.getElementById('user-id-field') as HTMLInputElement;
        const fullnameInput = document.getElementById('user-fullname') as HTMLInputElement;
        const usernameInput = document.getElementById('user-username') as HTMLInputElement;
        const emailInput = document.getElementById('user-email') as HTMLInputElement;
        const passwordInput = document.getElementById('user-password') as HTMLInputElement;
        const passwordGroup = document.getElementById('user-password-group');
        const roleSelect = document.getElementById('user-role') as HTMLSelectElement;
        const activeCheckbox = document.getElementById('user-active') as HTMLInputElement;
        const activeGroup = document.getElementById('user-active-group');

        if (
            !title ||
            !idField ||
            !fullnameInput ||
            !usernameInput ||
            !emailInput ||
            !passwordInput ||
            !roleSelect ||
            !activeCheckbox
        )
            return;

        if (user) {
            // Edit mode
            title.innerHTML =
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit User';
            idField.value = user.id;
            fullnameInput.value = user.fullName;
            usernameInput.value = user.username;
            usernameInput.disabled = true; // Username is immutable
            emailInput.value = user.email;

            if (passwordGroup) passwordGroup.style.display = 'none';
            passwordInput.required = false;
            passwordInput.value = '';

            roleSelect.value = user.role;
            activeCheckbox.checked = Number(user.active) === 1;
            if (activeGroup) activeGroup.style.display = 'flex';
        } else {
            // Create mode
            title.innerHTML =
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Create User';
            idField.value = '';
            fullnameInput.value = '';
            usernameInput.value = '';
            usernameInput.disabled = false;
            emailInput.value = '';

            if (passwordGroup) passwordGroup.style.display = 'block';
            passwordInput.required = true;
            passwordInput.value = '';

            roleSelect.value = 'it-support';
            activeCheckbox.checked = true;
            if (activeGroup) activeGroup.style.display = 'none';
        }

        ModalsManager.openModal('user-modal');
    }

    private static openResetPasswordModal(user: User): void {
        const idField = document.getElementById('reset-user-id-field') as HTMLInputElement;
        const passwordInput = document.getElementById('reset-password-val') as HTMLInputElement;
        const confirmInput = document.getElementById('reset-password-confirm') as HTMLInputElement;

        if (idField) idField.value = user.id;
        if (passwordInput) passwordInput.value = '';
        if (confirmInput) confirmInput.value = '';

        ModalsManager.openModal('reset-password-modal');
    }
}
