import { ticketsAPI, usersAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import { createElement } from '../utils/dom';
import { handleUIError } from '../utils/errorHandler';
import { ModalsManager } from './modals/ModalsManager';
import { showToast } from './Toast';

export class AddCollaboratorModal {
    private ticket: Ticket;
    private onSaveCallback: () => void;
    private boundSubmitHandler?: (e: Event) => void;
    private boundCancelHandler?: () => void;
    
    constructor(ticket: Ticket, onSave: () => void) {
        this.ticket = ticket;
        this.onSaveCallback = onSave;
        const modal = document.getElementById('add-collaborator-modal');
        if (!modal) throw new Error('Add Collaborator modal not found');
    }

    public async open(): Promise<void> {
        this.destroy();
        await this.create();
        this.attachEvents();
        
        // Update modal title/button text based on role
        const currentUser = store.getState().currentUser;
        const isAdmin = currentUser?.role === 'admin';
        
        const titleEl = document.querySelector('#add-collaborator-modal h2');
        const submitBtn = document.querySelector('#add-collaborator-form button[type="submit"]');
        if (titleEl) titleEl.textContent = isAdmin ? 'Add Collaborator' : 'Invite Collaborator';
        if (submitBtn) submitBtn.textContent = isAdmin ? 'Add Collaborator' : 'Send Invite';
        
        ModalsManager.openModal('add-collaborator-modal');
    }

    private async create(): Promise<void> {
        const select = document.getElementById('collab-user-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '';
        select.appendChild(createElement('option', { attributes: { value: '', disabled: 'true', selected: 'true' }, textContent: 'Select a technician...' }));

        try {
            const agents = await usersAPI.getByRole('it-support');
            agents.forEach(agent => {
                // Do not allow adding themselves or the primary assignee
                if (this.ticket.primary_assignee_id === agent.id) return;
                
                select.appendChild(createElement('option', { 
                    attributes: { value: agent.id }, 
                    textContent: `${agent.fullName} (${agent.username})` 
                }));
            });
        } catch (err) {
            console.error('Failed to load agents for collaborator selection:', err);
            select.innerHTML = '';
            select.appendChild(createElement('option', { attributes: { value: '', disabled: 'true', selected: 'true' }, textContent: 'Failed to load technicians' }));
        }
    }

    private attachEvents(): void {
        const form = document.getElementById('add-collaborator-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-collab-btn');

        if (cancelBtn) {
            this.boundCancelHandler = () => {
                ModalsManager.closeModal('add-collaborator-modal');
            };
            cancelBtn.addEventListener('click', this.boundCancelHandler);
        }

        if (form) {
            this.boundSubmitHandler = async (e: Event) => {
                e.preventDefault();

                const select = document.getElementById('collab-user-select') as HTMLSelectElement;
                const collabId = select.value;

                if (!collabId) {
                    showToast('Please select a technician.', 'error');
                    return;
                }

                try {
                    const currentUser = store.getState().currentUser;
                    const isAdmin = currentUser?.role === 'admin';
                    
                    if (isAdmin) {
                        await ticketsAPI.addCollaborator(this.ticket.id, collabId);
                        showToast('Collaborator added successfully', 'success');
                    } else {
                        await ticketsAPI.requestCollaboration(this.ticket.id, collabId);
                        showToast('Collaboration invite sent successfully', 'success');
                    }
                    
                    ModalsManager.closeModal('add-collaborator-modal');
                    this.onSaveCallback();
                } catch (err: unknown) {
                    handleUIError(err, 'Failed to process collaboration request');
                }
            };
            form.addEventListener('submit', this.boundSubmitHandler);
        }
    }

    public destroy(): void {
        const form = document.getElementById('add-collaborator-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-collab-btn');

        if (cancelBtn && this.boundCancelHandler) {
            cancelBtn.removeEventListener('click', this.boundCancelHandler);
        }
        if (form && this.boundSubmitHandler) {
            form.removeEventListener('submit', this.boundSubmitHandler);
        }
    }
}
