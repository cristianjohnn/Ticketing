import { Ticket } from '../types';
import {
    escapeHTML,
    formatDate,
    formatAssignees,
    getStatusBadgeClass,
    getPriorityBadgeClass,
    getSeverityBadgeClass
} from '../utils/formatters';

export class TicketTableComponent {
    public static renderTable(containerId: string, tickets: Ticket[], onSelectTicket: (ticket: Ticket) => void): void {
        const tbody = document.querySelector(`#${containerId} tbody`);
        if (!tbody) return;

        if (tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-icon">📂</div>
                        <p>No tickets found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = tickets.map(ticket => `
            <tr class="ticket-row" data-id="${ticket.id}">
                <td><span class="ticket-id">${escapeHTML(ticket.id)}</span></td>
                <td>
                    <div class="ticket-title-cell">
                        <strong>${escapeHTML(ticket.title)}</strong>
                        <small class="text-muted">${escapeHTML(ticket.category)}</small>
                    </div>
                </td>
                <td><span class="badge ${getPriorityBadgeClass(ticket.priority)}">${ticket.priority}</span></td>
                <td><span class="badge ${getSeverityBadgeClass(ticket.severity)}">${ticket.severity}</span></td>
                <td><span class="badge ${getStatusBadgeClass(ticket.status)}">${ticket.status}</span></td>
                <td>${escapeHTML(ticket.department)}</td>
                <td>${escapeHTML(formatAssignees(ticket))}</td>
                <td><small>${formatDate(ticket.createdAt)}</small></td>
            </tr>
        `).join('');

        // Attach row click listeners
        tbody.querySelectorAll('.ticket-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.getAttribute('data-id');
                const ticket = tickets.find(t => t.id === id);
                if (ticket) onSelectTicket(ticket);
            });
        });
    }
}
