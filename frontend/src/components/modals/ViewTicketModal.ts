import { DocumentIcon } from '../common/Icons';

export class ViewTicketModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'view-ticket-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card modal-view';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${DocumentIcon({ size: 20 })}
                Ticket Details
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const body = document.createElement('div');
        body.id = 'view-modal-body';
        body.className = 'modal-body';
        // Populated by JS in legacy component
        
        modal.appendChild(body);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
