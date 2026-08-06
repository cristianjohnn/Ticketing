import { EditIcon } from '../common/Icons';

export class TransferTicketModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'transfer-ticket-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${EditIcon({ size: 20 })}
                Transfer Ticket
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'transfer-ticket-form';
        form.innerHTML = `
            <div class="modal-body">
                <div class="form-group">
                    <label for="transfer-user-select">Target Technician</label>
                    <select id="transfer-user-select" class="form-control" required>
                        <option value="" disabled selected>Loading technicians...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="transfer-reason">Reason for transfer (optional)</label>
                    <input type="text" id="transfer-reason" class="form-control" placeholder="E.g., Requires specialized expertise">
                </div>
                <div class="form-group" style="margin-top: var(--space-md);">
                    <label style="display: flex; align-items: center; font-weight: normal; gap: var(--space-sm); cursor: pointer;">
                        <input type="checkbox" id="transfer-remain-collab" checked>
                        Remain as Collaborator
                    </label>
                    <small class="text-muted" style="display: block; margin-top: 4px;">
                        Checking this will keep you informed of updates to this ticket after transferring ownership.
                    </small>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" id="cancel-transfer-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Transfer Ticket</button>
            </div>
        `;
        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
