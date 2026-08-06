import { SearchIcon } from '../components/common/Icons';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { LayoutManager } from '../layouts/LayoutManager';
import { HtmlViewName } from '../router/router';
import { ticketsAPI } from '../services/api';
import { DepartmentService } from '../services/DepartmentService';
import { sseClient } from '../services/sseClient';
import { store } from '../state/store';
import { Ticket } from '../types';
import { getErrorMessage, handleUIError } from '../utils/errorHandler';
import {
    debounce,
    escapeHTML,
    formatAssignees,
    formatDate,
    getSeverityBadgeClass,
    getSeverityColor,
    getStatusBadgeClass,
    isResolved,
} from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';

export class TicketsPage {
    private static currentTickets: Ticket[] = [];
    private static pendingFilters: Record<string, string> = {};
    private static initializedSSE: boolean = false;
    private static activeHtmlView: HtmlViewName = 'all-tickets';
    private static silentReload = debounce(async () => {
        try {
            TicketsPage.currentTickets = await ticketsAPI.getAll();
            const container = getPortalContentContainer(store.getState().currentUser!.role);
            if (container) {
                const user = store.getState().currentUser;
                if (!user) return;
                
                const tickets = TicketsPage.currentTickets;
                if (user.role === 'admin' || user.role === 'it-support') {
                    TicketsPage.updateAdminSidebarStats(tickets);
                    if (TicketsPage.activeHtmlView === 'resolved') {
                        TicketsPage.renderResolvedView(container, tickets);
                    } else {
                        TicketsPage.renderAdminAllTickets(container, tickets);
                    }
                } else {
                    const mine = tickets.filter(t => t.userId === user.id || t.requester.toLowerCase() === user.username.toLowerCase());
                    TicketsPage.updateClientSidebarStats(mine);
                    TicketsPage.renderClientTickets(container, mine);
                }
            }
        } catch (e) {
            console.error('Silent reload failed in TicketsPage', e);
        }
    }, 1000);

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

    public static async load(htmlView: HtmlViewName): Promise<void> {
        this.activeHtmlView = htmlView;
        const container = getPortalContentContainer(store.getState().currentUser!.role);
        if (!container) return;

        this.setupRealtimeUpdates();

        LoadingManager.registerSkeleton('tickets-table', () => `
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
            LoadingManager.showSkeleton(container, 'tickets-table');
            this.currentTickets = await ticketsAPI.getAll();
            const tickets = this.currentTickets;
            await LoadingManager.hideSkeleton(container);

            const user = store.getState().currentUser;
            if (!user) return;

            await TransitionManager.crossFadeContent(container, () => {
                if (user.role === 'admin' || user.role === 'it-support') {
                    this.updateAdminSidebarStats(tickets);
                    if (htmlView === 'all-tickets') {
                        LayoutManager.admin?.getTopbar().setActions(this.createAdminFilters());
                        this.renderAdminAllTickets(container, tickets);
                    } else if (htmlView === 'resolved') {
                        LayoutManager.admin?.getTopbar().clearActions();
                        this.renderResolvedView(container, tickets);
                    } else {
                        LayoutManager.admin?.getTopbar().setActions(this.createAdminFilters());
                        this.renderAdminAllTickets(container, tickets);
                    }
                } else {
                    LayoutManager.client?.getTopbar().clearActions();
                    const mine = tickets.filter(
                        t =>
                            t.userId === user.id ||
                            t.requester.toLowerCase() === user.username.toLowerCase(),
                    );
                    this.updateClientSidebarStats(mine);
                    this.renderClientTickets(container, mine);
                }
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

    private static updateClientSidebarStats(tickets: Ticket[]): void {
        const setStat = (id: string, val: number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };
        setStat('cs-open', tickets.filter(t => t.status === 'Open').length);
        setStat('cs-active', tickets.filter(t => t.status === 'In Progress').length);
        setStat('cs-resolved', tickets.filter(t => isResolved(t)).length);
    }

    private static updateAdminSidebarStats(tickets: Ticket[]): void {
        const setStat = (id: string, val: string | number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };
        const rated = tickets.filter(t => t.rating !== null);
        const avg = rated.length
            ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1)
            : '—';

        setStat('as-open', tickets.filter(t => t.status === 'Open').length);
        setStat('as-progress', tickets.filter(t => t.status === 'In Progress').length);
        setStat('as-severe', tickets.filter(t => t.severity === 'Severe' && !isResolved(t)).length);
        setStat('as-resolved', tickets.filter(t => isResolved(t)).length);
        setStat('as-rating', avg !== '—' ? `${avg}★` : '—');
    }

    private static renderClientTickets(container: HTMLElement, tickets: Ticket[]): void {
        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="empty-state-title">No tickets yet</div>
                    <p>Submit your first IT support request.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div id="client-tickets-grid" style="display: flex; flex-direction: column; gap: var(--space-md);">
                ${tickets.map(ticket => {
                    const notes = ticket.notes || [];
                    const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
                    return `
                        <div class="client-card" data-id="${escapeHTML(ticket.id)}" style="border-left: 3px solid ${getSeverityColor(ticket.severity)}">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                                <div style="flex:1;min-width:0">
                                    <div style="display:flex;gap:7px;align-items:center;margin-bottom:6px;flex-wrap:wrap;justify-content:flex-start;">
                                        <span style="font-family:monospace;font-size:10px;color:var(--color-text-muted)">${escapeHTML(ticket.id)}</span>
                                        <span class="badge ${getStatusBadgeClass(ticket.status)}">${escapeHTML(ticket.status)}</span>
                                        <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${escapeHTML(ticket.severity)}</span>
                                        <span class="badge-dept">${escapeHTML(ticket.department)}</span>
                                    </div>
                                    <div style="font-weight:600;font-size:15px;color:var(--color-text-heading);margin-bottom:4px">${escapeHTML(ticket.title)}</div>
                                    <div style="font-size:12px;color:var(--color-text-muted)">${escapeHTML(ticket.category)} · ${escapeHTML(formatAssignees(ticket))} · ${formatDate(ticket.updatedAt)}</div>
                                    ${lastNote ? `<div class="latest-note"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px; display:inline-block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${escapeHTML(lastNote.text.slice(0, 90))}${lastNote.text.length > 90 ? '…' : ''}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        const grid = document.getElementById('client-tickets-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const card = (e.target as HTMLElement).closest('.client-card');
                if (card) {
                    const id = card.getAttribute('data-id');
                    const ticket = tickets.find(t => t.id === id);
                    if (ticket) {
                        new TicketDetailModal(ticket, () => this.load('my-tickets')).open();
                    }
                }
            });
        }
    }

    private static getAdminFilteredTickets(tickets: Ticket[]): Ticket[] {
        const status =
            (document.getElementById('admin-filter-status') as HTMLSelectElement)?.value || 'all';
        const severity =
            (document.getElementById('admin-filter-severity') as HTMLSelectElement)?.value || 'all';
        const dept =
            (document.getElementById('admin-filter-dept') as HTMLSelectElement)?.value || 'all';
        const cat =
            (document.getElementById('admin-filter-cat') as HTMLSelectElement)?.value || 'all';
        const search =
            (document.getElementById('admin-search') as HTMLInputElement)?.value
                .trim()
                .toLowerCase() || '';

        return tickets
            .filter(t => status === 'all' || t.status === status)
            .filter(t => severity === 'all' || t.severity === severity)
            .filter(t => dept === 'all' || t.department === dept)
            .filter(t => cat === 'all' || t.category === cat)
            .filter(t => {
                if (!search) return true;
                const haystack = [t.id, t.title, t.requester, t.department, t.description || '']
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(search);
            });
    }

    private static renderAdminAllTickets(container: HTMLElement, allTickets: Ticket[]): void {
        const tickets = this.getAdminFilteredTickets(allTickets);

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
                            <th style="width: 56px">Rating</th>
                            <th style="width: 86px">Updated</th>
                        </tr>
                    </thead>
                    <tbody id="ticket-table-body"></tbody>
                </table>
            </div>
        `;

        const body = document.getElementById('ticket-table-body');
        if (!body) return;

        if (tickets.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: var(--space-2xl);">
                        <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                            <div class="empty-state-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
                            </div>
                            <div class="empty-state-title">No tickets found</div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            body.innerHTML = tickets
                .map(
                    t => `
                <tr class="clickable-row" data-id="${escapeHTML(t.id)}">
                    <td style="font-family:monospace;font-size:11px;color:var(--color-text-muted)">${escapeHTML(t.id)}</td>
                    <td style="font-weight:600;color:var(--color-text-heading);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.title)}</td>
                    <td><span class="badge-dept">${escapeHTML(t.department)}</span></td>
                    <td><span class="badge ${getSeverityBadgeClass(t.severity)}">${escapeHTML(t.severity)}</span></td>
                    <td><span class="badge ${getStatusBadgeClass(t.status)}">${escapeHTML(t.status)}</span></td>
                    <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.requester)}</td>
                    <td style="color:var(--color-success)">${t.rating != null ? t.rating + '★' : '—'}</td>
                    <td style="color:var(--color-text-muted);font-size:11px">${formatDate(t.updatedAt)}</td>
                </tr>
            `,
                )
                .join('');

            body.addEventListener('click', (e) => {
                const row = (e.target as HTMLElement).closest('.clickable-row');
                if (row) {
                    const id = row.getAttribute('data-id');
                    const ticket = tickets.find(t => t.id === id);
                    if (ticket) {
                        new TicketDetailModal(ticket, () => this.load('all-tickets')).open();
                    }
                }
            });
        }
    }

    private static createAdminFilters(): HTMLElement {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.alignItems = 'center';
        
        const departments = DepartmentService.getDepartmentsSync();
        const deptOptions = departments.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');

        container.innerHTML = `
            <div class="search-box">
                ${SearchIcon({ size: 14 })}
                <input type="text" id="admin-search" placeholder="Search tickets...">
            </div>
            <select id="admin-filter-status" class="filter-sel">
                <option value="all">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
            </select>
            <select id="admin-filter-severity" class="filter-sel">
                <option value="all">All Severities</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
            </select>
            <select id="admin-filter-dept" class="filter-sel">
                <option value="all">All Departments</option>
                ${deptOptions}
            </select>
            <select id="admin-filter-cat" class="filter-sel">
                <option value="all">All Categories</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Access">Access</option>
            </select>
        `;

        if (this.pendingFilters.status) (container.querySelector('#admin-filter-status') as HTMLSelectElement).value = this.pendingFilters.status;
        if (this.pendingFilters.severity) (container.querySelector('#admin-filter-severity') as HTMLSelectElement).value = this.pendingFilters.severity;
        if (this.pendingFilters.department) (container.querySelector('#admin-filter-dept') as HTMLSelectElement).value = this.pendingFilters.department;
        if (this.pendingFilters.category) (container.querySelector('#admin-filter-cat') as HTMLSelectElement).value = this.pendingFilters.category;
        
        // Clear pending filters after applying
        this.pendingFilters = {};

        const rerender = debounce(() => {
            const listContainer = getPortalContentContainer(store.getState().currentUser!.role);
            if (listContainer) {
                this.renderAdminAllTickets(listContainer, this.currentTickets);
            }
        }, 300);

        container.querySelector('#admin-search')?.addEventListener('input', rerender);
        container.querySelector('#admin-filter-status')?.addEventListener('change', rerender);
        container.querySelector('#admin-filter-severity')?.addEventListener('change', rerender);
        container.querySelector('#admin-filter-dept')?.addEventListener('change', rerender);
        container.querySelector('#admin-filter-cat')?.addEventListener('change', rerender);

        return container;
    }

    public static applyFilterAndNavigate(filterKey: string, value: string): void {
        this.pendingFilters[filterKey] = value;
        import('../router/router').then(({ Router }) => {
            Router.switchView('all-tickets');
        });
    }

    private static renderResolvedView(container: HTMLElement, allTickets: Ticket[]): void {
        const resolved = allTickets.filter(t => isResolved(t));
        const rated = resolved.filter(t => t.rating !== null);
        const avg = rated.length
            ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1)
            : null;

        container.innerHTML = `
            <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
                <div class="stat-card" style="border-top:3px solid var(--color-success)">
                    <div class="stat-number" style="color:var(--color-success)">${resolved.length}</div>
                    <div class="stat-label">Total Resolved</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--color-success)">
                    <div class="stat-number" style="color:var(--color-success)">${rated.length}</div>
                    <div class="stat-label">Rated Tickets</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--color-success)">
                    <div class="stat-number" style="color:var(--color-success)">${avg ? avg + '★' : '—'}</div>
                    <div class="stat-label">Avg Rating</div>
                </div>
            </div>
            <div class="table-container">
                <table class="glass-table">
                    <thead>
                        <tr>
                            <th style="width: 88px">ID</th>
                            <th>Ticket</th>
                            <th style="width: 100px">Requester</th>
                            <th style="width: 100px">Rating</th>
                            <th style="width: 86px">Resolved</th>
                        </tr>
                    </thead>
                    <tbody id="resolved-table-body"></tbody>
                </table>
            </div>
        `;

        const body = document.getElementById('resolved-table-body');
        if (!body) return;

        if (resolved.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: var(--space-2xl);">
                        <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                            <div class="empty-state-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </div>
                            <div class="empty-state-title">No resolved tickets yet</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = resolved
            .map(
                t => `
            <tr class="clickable-row" data-id="${escapeHTML(t.id)}">
                <td style="font-family:monospace;font-size:11px;color:var(--color-text-muted)">${escapeHTML(t.id)}</td>
                <td style="font-weight:600;color:var(--color-text-heading)">${escapeHTML(t.title)}</td>
                <td>${escapeHTML(t.requester)}</td>
                <td style="color:var(--color-success)">${t.rating != null ? t.rating + '★' : 'Unrated'}</td>
                <td style="color:var(--color-text-muted);font-size:11px">${formatDate(t.updatedAt)}</td>
            </tr>
        `,
            )
            .join('');

        body.addEventListener('click', (e) => {
            const row = (e.target as HTMLElement).closest('.clickable-row');
            if (row) {
                const id = row.getAttribute('data-id');
                const ticket = resolved.find(t => t.id === id);
                if (ticket) {
                    new TicketDetailModal(ticket, () => this.load('resolved')).open();
                }
            }
        });
    }
}
