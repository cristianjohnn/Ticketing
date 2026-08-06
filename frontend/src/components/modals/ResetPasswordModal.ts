import { KeyIcon } from '../common/Icons';

export class ResetPasswordModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'reset-password-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${KeyIcon({ size: 20 })}
                Reset Password
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'reset-password-form';
        form.innerHTML = `
            <input type="hidden" id="reset-user-id-field">
            <div class="modal-body">
                <div class="form-group">
                    <label for="reset-password-val">New Password</label>
                    <input type="password" id="reset-password-val" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="reset-password-confirm">Confirm Password</label>
                    <input type="password" id="reset-password-confirm" class="form-control" required>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" id="cancel-reset-modal-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Reset Password</button>
            </div>
        `;
        
        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
