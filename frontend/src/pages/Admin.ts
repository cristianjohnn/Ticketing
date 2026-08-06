import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { TicketTableComponent } from '../components/TicketTable';
import { ModalsComponent } from '../components/Modals';
import { showToast } from '../components/Toast';

export class AdminPage {
    public static async load(): Promise<void> {
        try {
            const user = store.getState().currentUser;
            if (!user || user.role !== 'admin') return;

            const tickets = await ticketsAPI.getAll();
            store.setTickets(tickets);

            TicketTableComponent.renderTable('admin-tickets-table', tickets, (ticket) => {
                ModalsComponent.showTicketDetail(ticket, () => AdminPage.load());
            });

            this.initBulkActions();
        } catch (err) {
            console.error('Failed to load admin panel data:', err);
        }
    }

    private static initBulkActions(): void {
        const updateStatusBtn = document.getElementById('admin-update-status-btn');
        updateStatusBtn?.addEventListener('click', async () => {
            const ticketIdInput = document.getElementById('admin-ticket-id') as HTMLInputElement;
            const statusSelect = document.getElementById('admin-status-select') as HTMLSelectElement;

            if (!ticketIdInput.value.trim() || !statusSelect.value) {
                showToast('Please specify a ticket ID and status', 'error');
                return;
            }

            try {
                await ticketsAPI.update(ticketIdInput.value.trim(), { status: statusSelect.value });
                showToast(`Ticket ${ticketIdInput.value.trim()} status updated to ${statusSelect.value}`, 'success');
                ticketIdInput.value = '';
                this.load();
            } catch (err: any) {
                showToast(err.message || 'Failed to update status', 'error');
            }
        });
    }
}
