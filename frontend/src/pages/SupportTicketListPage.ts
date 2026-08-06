import { SearchIcon } from '../components/common/Icons';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { LayoutManager } from '../layouts/LayoutManager';
import { ticketsAPI } from '../services/api';
import { DepartmentService } from '../services/DepartmentService';
import { sseClient } from '../services/sseClient';
import { store } from '../state/store';
import { Ticket } from '../types';
import { debounce } from '../utils/debounce';
import { getErrorMessage, handleUIError } from '../utils/errorHandler';
import { escapeHTML, formatDate, getSeverityBadgeClass, getStatusBadgeClass } from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { SupportTicketFilters, TicketFilterMode } from '../utils/SupportTicketFilters';
import { TransitionManager } from '../utils/transitionManager';

export class SupportTicketListPage {
    private static currentTickets: Ticket[] = [];
    private static activeMode: TicketFilterMode = TicketFilterMode.All;
    private static initializedSSE: boolean = false;
    private static silentReload = debounce(async () => {
        try {
            SupportTicketListPage.currentTickets = await ticketsAPI.getAll();
            const container = getPortalContentContainer('it-support');
            if (container && document.getElementById('support-search')) {
                SupportTicketListPage.renderTickets(container);
            }
        } catch (e) {
            console.error('Silent reload failed', e);
        }
    }, 1000);

    public static async load(mode: TicketFilterMode): Promise<void> {
        this.activeMode = mode;
        const container = getPortalContentContainer('it-support');
        if (!container) return;

        this.setupRealtimeUpdates();

        // Register skeleton if not already
        LoadingManager.registerSkeleton('support-tickets-table', () => `
            <div class="controls-row" style="margin-bottom: 20px; display: flex; justify-content: space-between;">
                <div class="skeleton skeleton-btn"></div>
                <div style="display: flex; gap: 10px;">
                    <div class="skeleton skeleton-btn"></div>
                    <div class="skeleton skeleton-btn" style="width: 200px;"></div>
                </div>
            </div>
            <div style="background: var(--color-bg-surface); border-radius: 8px; border: 1px solid var(--color-border); overflow: hidden;">
                ${Array.from({ length: 5 }).map(() => `
                    <div style="display: flex; padding: 16px; border-bottom: 1px solid var(--color-border); align-items: center;">
                        <div class="skeleton skeleton-text" style="width: 40px; margin-bottom: 0; margin-right: 16px;"></div>
                        <div style="flex: 1;">
                            <div class="skeleton skeleton-text" style="width: 40%; margin-bottom: 8px;"></div>
                            <div class="skeleton skeleton-text" style="width: 20%; margin-bottom: 0;"></div>
                        </div>
                        <div class="skeleton skeleton-btn" style="width: 80px; height: 24px; border-radius: 12px;"></div>
                    </div>
                `).join('')}
            </div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'support-tickets-table');
            this.currentTickets = await ticketsAPI.getAll();
            await LoadingManager.hideSkeleton(container);

            const user = store.getState().currentUser;
            if (!user || user.role !== 'it-support') return;

            await TransitionManager.crossFadeContent(container, () => {
                LayoutManager.support?.getTopbar().setActions(this.createFilters());
                this.renderTickets(container);
            });
        } catch (err) {
            await LoadingManager.hideSkeleton(container);
            handleUIError(err, 'Failed to load tickets');
            container.innerHTML = `
                <div class="empty-state" style="margin-top: var(--space-xl);">
                    <div class="empty-state-icon" style="color: var(--color-danger);">
                        <i data-lucide="alert-triangle" style="width: 48px; height: 48px;"></i>
                    </div>
                    <div class="empty-state-title" style="color: var(--color-danger); font-size: 1.25rem;">Failed to Load Tickets</div>
                    <p>${escapeHTML(getErrorMessage(err, 'An unexpected error occurred.'))}</p>
                    <button class="btn btn-primary" style="margin-top: var(--space-md);" onclick="window.location.reload()">Retry</button>
                </div>
            `;
            // @ts-ignore
            if (window.lucide) window.lucide.createIcons({ root: container });
        }
    }

    private static setupRealtimeUpdates() {
        if (this.initializedSSE) return;
        this.initializedSSE = true;

        const eventsToWatch = [
            'ticket.created',
            'ticket.claimed',
            'ticket.transferred',
            'ticket.reopened',
            'ticket.status_updated',
            'note.added',
            'collaboration.approved',
            'collaboration.rejected'
        ];

        eventsToWatch.forEach(event => {
            sseClient.on(event, () => this.silentReload());
        });
    }

    private static createFilters(): HTMLElement {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.alignItems = 'center';
        
        const departments = DepartmentService.getDepartmentsSync();
        const deptOptions = departments.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');

        // Apply some defaults based on mode if needed
        let statusDefault = 'all';
        if (this.activeMode === TicketFilterMode.WaitingForClient) {
            statusDefault = 'Pending Client';
        }

        container.innerHTML = `
            <div class="search-box">
                ${SearchIcon({ size: 14 })}
                <input type="text" id="support-search" placeholder="Search tickets...">
            </div>
            <select id="support-filter-status" class="filter-sel">
                <option value="all">All Statuses</option>
                <option value="Open" ${statusDefault === 'Open' ? 'selected' : ''}>Open</option>
                <option value="In Progress" ${statusDefault === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Pending Client" ${statusDefault === 'Pending Client' ? 'selected' : ''}>Pending Client</option>
                <option value="Resolved" ${statusDefault === 'Resolved' ? 'selected' : ''}>Resolved</option>
                <option value="Closed" ${statusDefault === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
            <select id="support-filter-severity" class="filter-sel">
                <option value="all">All Severities</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
                <option value="Critical">Critical</option>
            </select>
            <select id="support-filter-dept" class="filter-sel">
                <option value="all">All Departments</option>
                ${deptOptions}
            </select>
        `;

        const rerender = debounce(() => {
            const listContainer = getPortalContentContainer('it-support');
            if (listContainer) {
                this.renderTickets(listContainer);
            }
        }, 300);

        container.querySelector('#support-search')?.addEventListener('input', rerender);
        container.querySelector('#support-filter-status')?.addEventListener('change', rerender);
        container.querySelector('#support-filter-severity')?.addEventListener('change', rerender);
        container.querySelector('#support-filter-dept')?.addEventListener('change', rerender);

        return container;
    }

    private static getFilteredTickets(): Ticket[] {
        const user = store.getState().currentUser;
        if (!user) return [];

        // 1. Base list scoped by the active mode
        const modeTickets = SupportTicketFilters.applyFilter(this.currentTickets, this.activeMode, user);

        // 2. Client-side search and dropdown filters
        const status = (document.getElementById('support-filter-status') as HTMLSelectElement)?.value || 'all';
        const severity = (document.getElementById('support-filter-severity') as HTMLSelectElement)?.value || 'all';
        const dept = (document.getElementById('support-filter-dept') as HTMLSelectElement)?.value || 'all';
        const search = (document.getElementById('support-search') as HTMLInputElement)?.value.trim().toLowerCase() || '';

        return SupportTicketFilters.filterBySearchAndDropdowns(modeTickets, status, severity, dept, search);
    }

    private static renderTickets(container: HTMLElement): void {
        const tickets = this.getFilteredTickets();

        container.innerHTML = `
            <div class="table-container">
                <table class="glass-table">
                    <thead>
                        <tr>
                            <th style="width: 88px">ID</th>
                            <th>Title</th>
                            <th style="width: 110px">Department</th>
                            <th style="width: 86px">Severity</th>
                            <th style="width: 108px">Status</th>
                            <th style="width: 100px">Requester</th>
                            <th style="width: 86px">Updated</th>
                        </tr>
                    </thead>
                    <tbody id="support-ticket-table-body"></tbody>
                </table>
            </div>
        `;

        const body = document.getElementById('support-ticket-table-body');
        if (!body) return;

        if (tickets.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: var(--space-2xl);">
                        <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                            <div class="empty-state-title">No tickets found</div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            body.innerHTML = tickets.map(t => `
                <tr class="clickable-row" data-id="${escapeHTML(t.id)}">
                    <td style="font-family:monospace;font-size:11px;color:var(--color-text-muted)">${escapeHTML(t.id)}</td>
                    <td style="font-weight:600;color:var(--color-text-heading);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.title)}</td>
                    <td><span class="badge-dept">${escapeHTML(t.department)}</span></td>
                    <td><span class="badge ${getSeverityBadgeClass(t.severity)}">${escapeHTML(t.severity)}</span></td>
                    <td><span class="badge ${getStatusBadgeClass(t.status)}">${escapeHTML(t.status)}</span></td>
                    <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.requester)}</td>
                    <td style="color:var(--color-text-muted);font-size:11px">${formatDate(t.updatedAt)}</td>
                </tr>
            `).join('');

            body.addEventListener('click', (e) => {
                const row = (e.target as HTMLElement).closest('.clickable-row');
                if (row) {
                    const id = row.getAttribute('data-id');
                    const ticket = tickets.find(t => t.id === id);
                    if (ticket) {
                        new TicketDetailModal(ticket, () => this.load(this.activeMode)).open();
                    }
                }
            });
        }
    }
}
