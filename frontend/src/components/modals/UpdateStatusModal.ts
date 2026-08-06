import { EditIcon } from '../common/Icons';

export class UpdateStatusModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'update-status-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${EditIcon({ size: 20 })}
                Update Status
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'update-status-form';
        form.innerHTML = `
            <div class="modal-body">
                <div class="form-group">
                    <label for="update-status-select">Status</label>
                    <select id="update-status-select" class="form-control">
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" id="cancel-update-status-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Update Status</button>
            </div>
        `;
        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
