import { Router } from '../../router/router';
import { LogoutIcon } from '../common/Icons';
import { ModalsManager } from './ModalsManager';

export class LogoutConfirmModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'logout-confirm-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';
        modal.style.maxWidth = '360px';
        modal.style.textAlign = 'center';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${LogoutIcon({ size: 20 })}
                Log out?
            </h3>
        `;
        modal.appendChild(header);

        const body = document.createElement('div');
        body.className = 'modal-body text-center';
        body.innerHTML = `
            <p style="color: var(--color-text-secondary); margin-bottom: 24px;">Are you sure you want to log out of your account?</p>
            <div class="modal-actions centered">
                <button type="button" class="btn btn-ghost" id="cancel-logout-btn">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirm-logout-btn">Log Out</button>
            </div>
        `;
        
        modal.appendChild(body);
        this.element.appendChild(modal);

        this.attachEvents();
    }

    private attachEvents(): void {
        const cancelBtn = this.element.querySelector('#cancel-logout-btn');
        const confirmBtn = this.element.querySelector('#confirm-logout-btn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                ModalsManager.closeModal('logout-confirm-modal');
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                ModalsManager.closeModal('logout-confirm-modal');
                Router.logout();
            });
        }
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
