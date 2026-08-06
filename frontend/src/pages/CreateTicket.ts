import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { showToast } from '../components/Toast';
import { ModalsComponent } from '../components/Modals';

export class CreateTicketPage {
    public static init(): void {
        const form = document.getElementById('create-ticket-form') as HTMLFormElement;
        const newTicketBtns = document.querySelectorAll('.new-ticket-trigger');

        newTicketBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                ModalsComponent.openModal('create-ticket-modal');
            });
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user = store.getState().currentUser;
            const titleInput = document.getElementById('ticket-title') as HTMLInputElement;
            const descInput = document.getElementById('ticket-desc') as HTMLTextAreaElement;
            const categorySelect = document.getElementById('ticket-category') as HTMLSelectElement;
            const departmentSelect = document.getElementById('ticket-department') as HTMLSelectElement;
            const prioritySelect = document.getElementById('ticket-priority') as HTMLSelectElement;
            const severitySelect = document.getElementById('ticket-severity') as HTMLSelectElement;
            const fileInput = document.getElementById('ticket-attachment') as HTMLInputElement;

            if (!titleInput.value.trim() || !descInput.value.trim() || !departmentSelect.value) {
                showToast('Please fill out all required fields', 'error');
                return;
            }

            try {
                const newTicket = await ticketsAPI.create({
                    title: titleInput.value.trim(),
                    description: descInput.value.trim(),
                    category: categorySelect.value,
                    department: departmentSelect.value,
                    priority: prioritySelect.value,
                    severity: severitySelect.value,
                    requester: user ? user.username : 'Guest Requester',
                });

                // Upload attachment if selected
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    try {
                        await ticketsAPI.uploadAttachment(newTicket.id, fileInput.files[0]);
                    } catch {
                        showToast('Ticket created, but attachment upload failed', 'info');
                    }
                }

                showToast('Support ticket created successfully!', 'success');
                form.reset();
                ModalsComponent.closeModal('create-ticket-modal');

                // Re-fetch all tickets and notify store subscribers (Dashboard, Tickets, Admin) reactively
                const updatedTickets = await ticketsAPI.getAll();
                store.setTickets(updatedTickets);
            } catch (err: any) {
                showToast(err.message || 'Failed to create ticket', 'error');
            }
        });
    }
}
