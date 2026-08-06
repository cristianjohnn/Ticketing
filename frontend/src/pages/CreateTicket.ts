import { ModalsManager } from '../components/modals/ModalsManager';
import { showToast } from '../components/Toast';
import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { handleUIError } from '../utils/errorHandler';
import { LoadingManager } from '../utils/loadingManager';
import { TicketsPage } from './Tickets';

export class CreateTicketPage {
    public static init(): void {
        const form = document.getElementById('ticket-form') as HTMLFormElement;
        const openBtn = document.getElementById('client-new-ticket-btn');
        const departmentSelect = document.getElementById('ticket-department') as HTMLSelectElement;
        const customDeptGroup = document.getElementById('custom-dept-group');
        const customDeptInput = document.getElementById(
            'ticket-custom-department',
        ) as HTMLInputElement;

        openBtn?.addEventListener('click', () => {
            ModalsManager.openModal('ticket-modal');
            const titleInput = document.getElementById('ticket-title') as HTMLInputElement;
            titleInput?.focus();
        });

        document.getElementById('close-modal-btn')?.addEventListener('click', () => {
            this.closeModal(form);
        });
        document.getElementById('cancel-modal-btn')?.addEventListener('click', () => {
            this.closeModal(form);
        });

        departmentSelect?.addEventListener('change', () => {
            if (departmentSelect.value === 'other') {
                if (customDeptGroup) customDeptGroup.style.display = '';
                customDeptInput?.setAttribute('required', 'true');
            } else {
                if (customDeptGroup) customDeptGroup.style.display = 'none';
                customDeptInput?.removeAttribute('required');
                if (customDeptInput) customDeptInput.value = '';
            }
        });

        form?.addEventListener('submit', async e => {
            e.preventDefault();

            const user = store.getState().currentUser;
            const titleInput = document.getElementById('ticket-title') as HTMLInputElement;
            const descInput = document.getElementById('ticket-description') as HTMLTextAreaElement;
            const categorySelect = document.getElementById('ticket-category') as HTMLSelectElement;
            const severitySelect = document.getElementById('ticket-severity') as HTMLSelectElement;
            const fileInput = document.getElementById('ticket-file') as HTMLInputElement;
            const submitBtn = document.getElementById('submit-ticket-btn') as HTMLButtonElement;

            let department = departmentSelect?.value || '';
            if (department === 'other') {
                department = customDeptInput?.value.trim() || '';
                if (!department) {
                    showToast('Please specify the custom department', 'error');
                    return;
                }
            }

            if (
                !titleInput?.value.trim() ||
                !descInput?.value.trim() ||
                !department ||
                !severitySelect?.value
            ) {
                showToast('Please fill out all required fields', 'error');
                return;
            }

            try {
                if (submitBtn) {
                    LoadingManager.setButtonLoading(submitBtn, true);
                }

                const newTicket = await ticketsAPI.create({
                    title: titleInput.value.trim(),
                    description: descInput.value.trim(),
                    category: categorySelect?.value || 'Other',
                    department,
                    priority: 'Medium',
                    severity: severitySelect.value,
                    requester: user ? user.username : 'Guest Requester',
                });

                if (fileInput?.files?.length) {
                    try {
                        await ticketsAPI.uploadAttachment(newTicket.id, fileInput.files[0]);
                    } catch {
                        showToast('Ticket created, but attachment upload failed', 'info');
                    }
                }

                showToast('Support ticket created successfully!', 'success');
                this.closeModal(form);

                await TicketsPage.load('my-tickets');
            } catch (err: unknown) {
                handleUIError(err, 'Failed to create ticket');
            } finally {
                if (submitBtn) {
                    LoadingManager.setButtonLoading(submitBtn, false);
                }
            }
        });
    }

    private static closeModal(form: HTMLFormElement | null): void {
        ModalsManager.closeModal('ticket-modal');
        form?.reset();
        const customDeptGroup = document.getElementById('custom-dept-group');
        const customDeptInput = document.getElementById(
            'ticket-custom-department',
        ) as HTMLInputElement;
        if (customDeptGroup) customDeptGroup.style.display = 'none';
        if (customDeptInput) {
            customDeptInput.removeAttribute('required');
            customDeptInput.value = '';
        }
    }
}
