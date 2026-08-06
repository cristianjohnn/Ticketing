import { store } from '../state/store';
import { ticketsAPI, statsAPI } from '../services/api';
import { StatCardsComponent } from '../components/StatCards';
import { TicketTableComponent } from '../components/TicketTable';
import { ModalsComponent } from '../components/Modals';

export class DashboardPage {
    public static async load(): Promise<void> {
        try {
            const [tickets, stats] = await Promise.all([
                ticketsAPI.getAll(),
                statsAPI.get()
            ]);

            store.setTickets(tickets);
            store.setStats(stats);

            // Render Overview stat cards
            StatCardsComponent.render(stats);

            // Render Recent Urgent / Open Tickets
            const recentOpen = tickets
                .filter(t => t.status === 'Open' || t.status === 'In Progress')
                .slice(0, 5);

            TicketTableComponent.renderTable('dashboard-tickets-table', recentOpen, (ticket) => {
                ModalsComponent.showTicketDetail(ticket, () => DashboardPage.load());
            });
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        }
    }
}
