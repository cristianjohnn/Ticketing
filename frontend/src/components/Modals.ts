import { Ticket, Article } from '../types';
import { escapeHTML, formatDate, formatAssignees, getStatusBadgeClass, getPriorityBadgeClass, getSeverityBadgeClass } from '../utils/formatters';
import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { showToast } from './Toast';

export class ModalsComponent {
    public static openModal(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    public static closeModal(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    public static initModalCloseListeners(): void {
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = (e.target as HTMLElement).closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        });
    }

    public static showTicketDetail(ticket: Ticket, onRefresh: () => void): void {
        const modal = document.getElementById('ticket-detail-modal');
        const container = document.getElementById('ticket-detail-content');
        if (!modal || !container) return;

        const user = store.getState().currentUser;

        container.innerHTML = `
            <div class="detail-header">
                <div>
                    <span class="ticket-id-lg">${escapeHTML(ticket.id)}</span>
                    <h2>${escapeHTML(ticket.title)}</h2>
                </div>
                <div class="detail-badges">
                    <span class="badge ${getStatusBadgeClass(ticket.status)}">${ticket.status}</span>
                    <span class="badge ${getPriorityBadgeClass(ticket.priority)}">${ticket.priority}</span>
                    <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${ticket.severity}</span>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-item"><strong>Requester:</strong> ${escapeHTML(ticket.requester)}</div>
                <div class="detail-item"><strong>Department:</strong> ${escapeHTML(ticket.department)}</div>
                <div class="detail-item"><strong>Category:</strong> ${escapeHTML(ticket.category)}</div>
                <div class="detail-item"><strong>Assignee:</strong> ${escapeHTML(formatAssignees(ticket))}</div>
                <div class="detail-item"><strong>Created:</strong> ${formatDate(ticket.createdAt)}</div>
                <div class="detail-item"><strong>Due SLA:</strong> ${formatDate(ticket.dueAt)}</div>
            </div>

            <div class="detail-section">
                <h3>Description</h3>
                <p class="description-text">${escapeHTML(ticket.description || 'No description provided.')}</p>
            </div>

            ${ticket.attachments && ticket.attachments.length > 0 ? `
                <div class="detail-section">
                    <h3>Attachments</h3>
                    <ul class="attachment-list">
                        ${ticket.attachments.map(a => `
                            <li>
                                <a href="/uploads/${a.filename}" target="_blank" class="attachment-link">
                                    📎 ${escapeHTML(a.originalname)} (${Math.round(a.size / 1024)} KB)
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="detail-section">
                <h3>Activity & Notes</h3>
                <div class="notes-list">
                    ${ticket.notes && ticket.notes.length > 0 ? ticket.notes.map(n => `
                        <div class="note-item">
                            <div class="note-header">
                                <strong>${escapeHTML(n.author)}</strong>
                                <small>${n.time}</small>
                            </div>
                            <div class="note-body">${escapeHTML(n.text)}</div>
                        </div>
                    `).join('') : '<p class="text-muted">No notes recorded.</p>'}
                </div>

                <form id="add-note-form" class="add-note-form" style="margin-top:15px">
                    <textarea id="note-text" placeholder="Add a note or update..." rows="3" required></textarea>
                    <button type="submit" class="btn btn-secondary btn-sm" style="margin-top:8px">Post Note</button>
                </form>
            </div>
        `;

        modal.classList.add('active');

        // Note form submission handler
        const noteForm = document.getElementById('add-note-form');
        noteForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = document.getElementById('note-text') as HTMLTextAreaElement;
            if (!textarea || !textarea.value.trim()) return;

            try {
                const author = user ? user.username : 'User';
                await ticketsAPI.addNote(ticket.id, textarea.value.trim(), author);
                showToast('Note added successfully', 'success');
                const updated = await ticketsAPI.getById(ticket.id);
                this.showTicketDetail(updated, onRefresh);
                onRefresh();
            } catch (err: any) {
                showToast(err.message || 'Failed to add note', 'error');
            }
        });
    }
}
