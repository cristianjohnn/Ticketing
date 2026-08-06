import { CATEGORIES,SEVERITIES } from '../../data/dropdownOptions';
import { DepartmentService } from '../../services/DepartmentService';
import { PlusIcon, SendIcon } from '../common/Icons';

export class TicketModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'ticket-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${PlusIcon({ size: 20 })}
                Submit New Ticket
            </h3>
            <button class="modal-close" id="close-modal-btn">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'ticket-form';

        const body = document.createElement('div');
        body.className = 'modal-body';

        // Title
        body.innerHTML += `
            <div class="form-group">
                <label for="ticket-title">Title <span class="required">*</span></label>
                <input type="text" id="ticket-title" class="form-control" placeholder="Brief summary of the issue" required>
            </div>
        `;

        // Department
        const deptGroup = document.createElement('div');
        deptGroup.className = 'form-group';
        deptGroup.innerHTML = `
            <label for="ticket-department">Department <span class="required">*</span></label>
            <select id="ticket-department" class="form-control" required>
                <option value="" disabled selected>Select your department</option>
                ${DepartmentService.getDepartmentsSync().map(dept => `<option value="${dept}">${dept}</option>`).join('')}
                <option value="other">Other (specify below)</option>
            </select>
        `;
        body.appendChild(deptGroup);

        // Custom Department
        body.innerHTML += `
            <div class="form-group" id="custom-dept-group" style="display:none">
                <label for="ticket-custom-department">Specify Department <span class="required">*</span></label>
                <input type="text" id="ticket-custom-department" class="form-control" placeholder="Enter your department name">
            </div>
        `;

        // Severity and Category Row
        const row = document.createElement('div');
        row.className = 'form-row';
        row.innerHTML = `
            <div class="form-group">
                <label for="ticket-severity">Severity <span class="required">*</span></label>
                <select id="ticket-severity" class="form-control" required>
                    <option value="" disabled selected>Select severity</option>
                    ${SEVERITIES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="ticket-category">Category</label>
                <select id="ticket-category" class="form-control">
                    ${CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                </select>
            </div>
        `;
        body.appendChild(row);

        // Description and File
        body.innerHTML += `
            <div class="form-group">
                <label for="ticket-description">Description <span class="required">*</span></label>
                <textarea id="ticket-description" class="form-control" rows="5" placeholder="Describe your issue in detail..." required></textarea>
            </div>
            <div class="form-group">
                <label for="ticket-file">Attachment (Optional)</label>
                <input type="file" id="ticket-file" class="form-control">
            </div>
        `;

        form.appendChild(body);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        actions.innerHTML = `
            <button type="button" class="btn btn-ghost" id="cancel-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submit-ticket-btn">
                ${SendIcon({ size: 18 })}
                <span>Submit Ticket</span>
            </button>
        `;
        form.appendChild(actions);

        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
