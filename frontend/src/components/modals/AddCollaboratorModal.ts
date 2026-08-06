import { EditIcon } from '../common/Icons';

export class AddCollaboratorModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'add-collaborator-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${EditIcon({ size: 20 })}
                Add Collaborator
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'add-collaborator-form';
        form.innerHTML = `
            <div class="modal-body">
                <div class="form-group">
                    <label for="collab-user-select">Select Technician</label>
                    <select id="collab-user-select" class="form-control" required>
                        <option value="" disabled selected>Loading technicians...</option>
                    </select>
                    <small class="text-muted" style="display: block; margin-top: 4px;">
                        Collaborators can assist with the ticket without taking primary ownership.
                    </small>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" id="cancel-collab-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Collaborator</button>
            </div>
        `;
        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
