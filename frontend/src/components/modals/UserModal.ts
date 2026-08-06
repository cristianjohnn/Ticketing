import { EyeIcon,UserIcon } from '../common/Icons';

export class UserModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'user-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3 id="user-modal-title">
                ${UserIcon({ size: 20 })}
                Create User
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'user-form';
        form.innerHTML = `
            <input type="hidden" id="user-id-field">
            <div class="modal-body">
                <div class="form-group">
                    <label for="user-fullname">Full Name</label>
                    <input type="text" id="user-fullname" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="user-username">Username</label>
                    <input type="text" id="user-username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="user-email">Email Address</label>
                    <input type="email" id="user-email" class="form-control" required>
                </div>
                <div class="form-group" id="user-password-group">
                    <label for="user-password">Password</label>
                    <div class="input-wrapper">
                        <input type="password" id="user-password" class="form-control" required style="padding-left:1rem;">
                        <button type="button" class="password-toggle-btn" id="user-password-toggle">
                            ${EyeIcon({ size: 18 })}
                        </button>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="user-role">Role</label>
                        <select id="user-role" class="form-control" required>
                            <option value="it-support">IT Support</option>
                            <option value="admin">Admin</option>
                            <option value="client">Client</option>
                        </select>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="user-active" class="custom-checkbox" checked>
                        <label for="user-active">Active Account</label>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" id="cancel-user-modal-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Save User</button>
            </div>
        `;
        
        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
