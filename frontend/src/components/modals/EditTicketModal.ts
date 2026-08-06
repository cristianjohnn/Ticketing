import { EditIcon } from '../common/Icons';

export class EditTicketModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'edit-ticket-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${EditIcon({ size: 20 })}
                Edit Ticket
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'edit-ticket-form';
        form.innerHTML = `
            <div class="modal-body">
                <div class="form-group">
                    <label for="edit-ticket-status">Status</label>
                    <select id="edit-ticket-status" class="form-control">
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-ticket-severity">Severity</label>
                        <select id="edit-ticket-severity" class="form-control">
                            <option value="Low">Low</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Severe">Severe</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-ticket-priority">Priority</label>
                        <select id="edit-ticket-priority" class="form-control">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="edit-ticket-due">Due Date & Time</label>
                    <input type="datetime-local" id="edit-ticket-due" class="form-control">
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" id="cancel-edit-modal-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        `;
        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
