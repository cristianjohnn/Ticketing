import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import { handleUIError } from '../utils/errorHandler';
import { ModalsManager } from './modals/ModalsManager';
import { showToast } from './Toast';

export class UpdateStatusModal {
    private ticket: Ticket;
    private onSaveCallback: () => void;
    private boundSubmitHandler?: (e: Event) => void;
    private boundCancelHandler?: () => void;
    
    constructor(ticket: Ticket, onSave: () => void) {
        this.ticket = ticket;
        this.onSaveCallback = onSave;
        const modal = document.getElementById('update-status-modal');
        if (!modal) throw new Error('Update Status modal not found');
    }

    public open(): void {
        this.destroy();
        this.create();
        this.attachEvents();
        ModalsManager.openModal('update-status-modal');
    }

    private create(): void {
        const select = document.getElementById('update-status-select') as HTMLSelectElement;
        if (select) {
            select.value = this.ticket.status;
        }
    }

    private attachEvents(): void {
        const form = document.getElementById('update-status-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-update-status-btn');

        if (cancelBtn) {
            this.boundCancelHandler = () => {
                ModalsManager.closeModal('update-status-modal');
            };
            cancelBtn.addEventListener('click', this.boundCancelHandler);
        }

        if (form) {
            this.boundSubmitHandler = async (e: Event) => {
                e.preventDefault();

                const select = document.getElementById('update-status-select') as HTMLSelectElement;
                const newStatus = select.value;
                const user = store.getState().currentUser;
                const changedBy = user ? user.username : 'System';

                try {
                    // Update the status by making a partial update via standard Edit API
                    // In a more structured workflow API, we might use a dedicated status endpoint,
                    // but the standard update endpoint handles status just fine and generates logs.
                    await ticketsAPI.update(this.ticket.id, {
                        status: newStatus,
                        changedBy
                    });

                    showToast('Ticket status updated', 'success');
                    ModalsManager.closeModal('update-status-modal');
                    this.onSaveCallback();
                } catch (err: unknown) {
                    handleUIError(err, 'Failed to update status');
                }
            };
            form.addEventListener('submit', this.boundSubmitHandler);
        }
    }

    public destroy(): void {
        const form = document.getElementById('update-status-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-update-status-btn');

        if (cancelBtn && this.boundCancelHandler) {
            cancelBtn.removeEventListener('click', this.boundCancelHandler);
        }
        if (form && this.boundSubmitHandler) {
            form.removeEventListener('submit', this.boundSubmitHandler);
        }
    }
}
