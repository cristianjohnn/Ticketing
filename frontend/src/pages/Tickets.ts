import { store } from '../state/store';
import { ticketsAPI } from '../services/api';
import { TicketTableComponent } from '../components/TicketTable';
import { ModalsComponent } from '../components/Modals';
import { debounce } from '../utils/formatters';

export class TicketsPage {
    public static init(): void {
        this.initFilters();
        this.initSearch();
    }

    public static async load(): Promise<void> {
        try {
            const { activeFilter, activeDepartment, searchQuery } = store.getState();
            const tickets = await ticketsAPI.getAll({
                status: activeFilter,
                department: activeDepartment,
                search: searchQuery,
            });

            store.setTickets(tickets);

            TicketTableComponent.renderTable('all-tickets-table', tickets, (ticket) => {
                ModalsComponent.showTicketDetail(ticket, () => TicketsPage.load());
            });
        } catch (err) {
            console.error('Failed to load tickets:', err);
        }
    }

    private static initFilters(): void {
        const filterBtns = document.querySelectorAll('.status-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.getAttribute('data-status') || 'all';
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                store.setFilter(status);
                this.load();
            });
        });

        // Listen for department store changes
        store.subscribe(() => {
            this.load();
        });
    }

    private static initSearch(): void {
        const searchInput = document.getElementById('global-search') as HTMLInputElement;
        const handleSearch = debounce(() => {
            store.setSearch(searchInput.value.trim());
            this.load();
        }, 300);

        searchInput?.addEventListener('input', handleSearch);
    }
}
