import { TicketDetailModal } from '../components/TicketDetailModal';
import { statsAPI, ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket, ExecutiveKPIs, RecentFeedback, TicketTrend } from '../types';
import { getErrorMessage, handleUIError } from '../utils/errorHandler';
import {
    escapeHTML,
    getSeverityBadgeClass,
    getSeverityColor,
    getStatusBadgeClass,
} from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';
import { StatCard } from '../components/analytics/StatCard';
import { LineChart } from '../components/analytics/LineChart';
import { BarChart } from '../components/analytics/BarChart';
import { createElement } from '../utils/dom';
import { IconService } from '../utils/iconService';

export class DashboardPage {

    public static async load(): Promise<void> {
        const currentUser = store.getState().currentUser;
        if (!currentUser) return;
        
        const container = getPortalContentContainer(currentUser.role);
        if (!container) return;

        LoadingManager.registerSkeleton('dashboard', () => `
            <div class="page-header" style="margin-bottom: var(--space-lg)">
                <div class="skeleton skeleton-text" style="width: 240px; height: 32px; margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 360px; height: 16px;"></div>
            </div>
            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: var(--space-lg);">
                ${Array.from({ length: 4 }).map(() => `
                    <div style="background: var(--color-bg-surface); border-radius: var(--radius); padding: var(--space-lg); border: 1px solid var(--color-border); height: 120px;">
                        <div class="skeleton skeleton-text" style="width: 32px; height: 32px; border-radius: var(--radius); margin-bottom: 12px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; height: 24px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%;"></div>
                    </div>
                `).join('')}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); margin-bottom: var(--space-lg);">
                <div class="skeleton skeleton-text" style="height: 280px; border-radius: var(--radius);"></div>
                <div class="skeleton skeleton-text" style="height: 280px; border-radius: var(--radius);"></div>
            </div>
            <div class="skeleton skeleton-text" style="height: 200px; width: 100%; border-radius: var(--radius);"></div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'dashboard');
            
            const role = currentUser.role;

            // Parallel fetch — include trends + breakdowns for admin
            const [recentTickets, kpis, sidebarStats, recentFeedback, trends, breakdowns] = await Promise.all([
                ticketsAPI.getRecent(5),
                statsAPI.getExecutiveKPIs({}),
                statsAPI.getSidebarStats({}),
                statsAPI.getRecentFeedback({}),
                role === 'admin' ? statsAPI.getTicketTrends({}) : Promise.resolve([]),
                role === 'admin' ? statsAPI.getBreakdowns({}) : Promise.resolve(null)
            ]);
            
            await LoadingManager.hideSkeleton(container);

            await TransitionManager.crossFadeContent(container, () => {
                this.updateAdminSidebarStats(sidebarStats);

                // Page header
                const header = createElement('div', { className: 'page-header' });
                header.style.marginBottom = 'var(--space-lg)';
                header.innerHTML = `
                    <h2 style="margin: 0 0 var(--space-xs) 0; font-size: 1.5rem; color: var(--foreground);">
                        ${role === 'admin' ? 'Executive Dashboard' : 'My Dashboard'}
                    </h2>
                    <p style="margin: 0; color: var(--color-text-secondary); font-size: 0.9rem;">
                        ${role === 'admin' ? 'System-wide performance overview.' : 'Your personal performance summary.'}
                    </p>
                `;
                container.innerHTML = '';
                container.appendChild(header);

                // Dashboard content
                const content = createElement('div', { id: 'dashboard-content' });

                if (role === 'admin') {
                    this.renderAdminDashboard(content, kpis, recentTickets, trends as TicketTrend[], breakdowns);
                } else {
                    this.renderTechDashboard(content, kpis, recentTickets, recentFeedback);
                }

                container.appendChild(content);
                IconService.renderIcons(container);
            });
        } catch (err) {
            await LoadingManager.hideSkeleton(container);
            handleUIError(err, 'Failed to load dashboard');
            container.innerHTML = `
                <div class="empty-state" style="margin-top: var(--space-xl);">
                    <div class="empty-state-icon" style="color: var(--color-danger);">
                        <i data-lucide="alert-triangle" style="width: 48px; height: 48px;"></i>
                    </div>
                    <div class="empty-state-title" style="color: var(--color-danger); font-size: 1.25rem;">Failed to Load Dashboard</div>
                    <p>${escapeHTML(getErrorMessage(err, 'An unexpected error occurred.'))}</p>
                    <button class="btn btn-primary" style="margin-top: var(--space-md);" onclick="window.location.reload()">Retry</button>
                </div>
            `;
            IconService.renderIcons(container);
        }
    }

    private static updateAdminSidebarStats(sidebarStats: any): void {
        const setStat = (id: string, val: string | number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };
        
        const avg = sidebarStats.avg_csat ? Number(sidebarStats.avg_csat).toFixed(1) : '—';

        setStat('as-open', sidebarStats.open_tickets || 0);
        setStat('as-progress', sidebarStats.in_progress_tickets || 0);
        setStat('as-severe', sidebarStats.severe_tickets || 0);
        setStat('as-resolved', sidebarStats.resolved_tickets || 0);
        setStat('as-rating', avg !== '—' ? `${avg}★` : '—');
    }

    private static getTrend(current: number | null | undefined, prev: number | null | undefined, inverse = false) {
        if (current == null || prev == null || prev === 0) return undefined;
        const diff = current - prev;
        if (diff === 0) return { direction: 'neutral' as const, label: 'No change' };
        const pct = Math.abs((diff / prev) * 100).toFixed(1);
        const direction: 'up' | 'down' | 'neutral' = diff > 0 ? 'up' : 'down';
        return {
            direction,
            label: `${diff > 0 ? '+' : '-'}${pct}% vs prev`,
            colorVar: (diff > 0 ? (inverse ? '--color-danger' : '--color-success') : (inverse ? '--color-success' : '--color-danger'))
        };
    }

    private static renderAdminDashboard(container: HTMLElement, kpis: ExecutiveKPIs, tickets: Ticket[], trends: TicketTrend[], breakdowns: any): void {
        container.innerHTML = '';
        
        // 1. KPI Grid
        const grid = createElement('div', { className: 'stats-grid' });
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.marginBottom = 'var(--space-lg)';

        const cards = [
            new StatCard({ title: 'Open Tickets', value: kpis.open_tickets, icon: 'inbox', colorVar: '--color-warning', trend: this.getTrend(kpis.open_tickets, kpis.prev_open_tickets, true) }),
            new StatCard({ title: 'Resolved', value: kpis.resolved_tickets, icon: 'check-circle', colorVar: '--color-success', trend: this.getTrend(kpis.resolved_tickets, kpis.prev_resolved_tickets) }),
            new StatCard({ title: 'Avg Resolution', value: kpis.avg_resolution_time_seconds ? `${Math.round(kpis.avg_resolution_time_seconds / 3600)} hrs` : '—', icon: 'clock', colorVar: '--color-info', trend: this.getTrend(kpis.avg_resolution_time_seconds, kpis.prev_avg_resolution_time_seconds, true) }),
            new StatCard({ title: 'Overall CSAT', value: kpis.overall_csat ? `${kpis.overall_csat.toFixed(1)} / 5` : '—', icon: 'star', colorVar: '--color-primary' }),
        ];

        cards.forEach((card, i) => {
            const el = card.getElement();
            el.style.animationDelay = `${i * 60}ms`;
            grid.appendChild(el);
        });
        container.appendChild(grid);

        // 2. Two-column: Trend chart + Category breakdown
        const midRow = createElement('div', { className: 'analytics-charts-grid' });
        midRow.style.marginBottom = 'var(--space-lg)';

        // Trend chart
        const trendSection = createElement('div', { className: 'analytics-section fade-in' });
        trendSection.style.animationDelay = '200ms';
        const trendTitle = createElement('h3', { className: 'analytics-section-title' });
        trendTitle.innerHTML = '<i data-lucide="trending-up"></i> Ticket Trend (30 Days)';
        trendSection.appendChild(trendTitle);

        const trendChart = new LineChart({
            data: trends.map(t => ({ label: t.date, value: Number(t.created) })),
            secondaryData: trends.map(t => ({ label: t.date, value: Number(t.resolved) })),
            height: '220px',
            colorVar: '--color-primary',
            secondaryColorVar: '--color-success',
            legendLabels: ['Created', 'Resolved']
        });
        trendSection.appendChild(trendChart.getElement());
        midRow.appendChild(trendSection);

        // Status breakdown
        const statusSection = createElement('div', { className: 'analytics-section fade-in' });
        statusSection.style.animationDelay = '260ms';
        const statusTitle = createElement('h3', { className: 'analytics-section-title' });
        statusTitle.innerHTML = '<i data-lucide="pie-chart"></i> Status Breakdown';
        statusSection.appendChild(statusTitle);

        if (breakdowns?.byStatus?.length > 0) {
            const statusColorMap: Record<string, string> = {
                'Open': '--color-warning',
                'In Progress': '--color-info',
                'Pending': '--color-text-secondary',
                'Resolved': '--color-success',
                'Closed': '--color-success'
            };
            const statusChart = new BarChart({
                data: breakdowns.byStatus.map((s: any) => ({
                    label: s.status,
                    value: Number(s.count),
                    colorVar: statusColorMap[s.status] || '--color-primary'
                }))
            });
            statusSection.appendChild(statusChart.getElement());
        } else {
            statusSection.innerHTML += '<div style="padding: var(--space-lg); text-align: center; color: var(--color-text-secondary);">No status data yet.</div>';
        }

        midRow.appendChild(statusSection);
        container.appendChild(midRow);

        // 3. Recent Activity
        this.renderRecentActivity(container, tickets);
    }

    private static renderTechDashboard(container: HTMLElement, kpis: ExecutiveKPIs, tickets: Ticket[], recentFeedback: RecentFeedback[]): void {
        container.innerHTML = '';
        
        // 1. Tech KPI Grid
        const grid = createElement('div', { className: 'stats-grid' });
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.marginBottom = 'var(--space-lg)';

        const cards = [
            new StatCard({ title: 'My Open Tasks', value: kpis.open_tickets + kpis.in_progress_tickets, icon: 'briefcase', colorVar: '--color-warning', trend: this.getTrend(kpis.open_tickets + kpis.in_progress_tickets, (kpis.prev_open_tickets || 0), true) }),
            new StatCard({ title: 'My Resolved', value: kpis.resolved_tickets, icon: 'check-square', colorVar: '--color-success', trend: this.getTrend(kpis.resolved_tickets, kpis.prev_resolved_tickets) }),
            new StatCard({ title: 'My CSAT', value: kpis.overall_csat ? `${kpis.overall_csat.toFixed(1)} / 5` : '—', icon: 'star', colorVar: '--color-primary' }),
            new StatCard({ title: 'My Reopens', value: kpis.total_reopens, icon: 'rotate-ccw', colorVar: '--color-danger' }),
        ];

        cards.forEach((card, i) => {
            const el = card.getElement();
            el.style.animationDelay = `${i * 60}ms`;
            grid.appendChild(el);
        });
        container.appendChild(grid);

        // 2. Two-column: CSAT Feedback + Recent Tickets
        const midRow = createElement('div', { className: 'analytics-charts-grid' });
        midRow.style.marginBottom = 'var(--space-lg)';

        // CSAT Feedback section
        const feedbackSection = createElement('div', { className: 'analytics-section fade-in' });
        feedbackSection.style.animationDelay = '200ms';
        const feedbackTitle = createElement('h3', { className: 'analytics-section-title' });
        feedbackTitle.innerHTML = '<i data-lucide="message-square"></i> Recent CSAT Feedback';
        feedbackSection.appendChild(feedbackTitle);

        if (recentFeedback.length === 0) {
            const emptyDiv = createElement('div');
            emptyDiv.style.cssText = 'padding: var(--space-xl); text-align: center; color: var(--color-text-secondary);';
            emptyDiv.innerHTML = `
                <i data-lucide="message-circle" style="width: 36px; height: 36px; margin-bottom: var(--space-sm); opacity: 0.5;"></i>
                <p style="margin: 0;">No feedback received yet.</p>
            `;
            feedbackSection.appendChild(emptyDiv);
        } else {
            const feedbackList = createElement('div');
            feedbackList.innerHTML = recentFeedback.map(fb => `
                <div class="mini-card" data-id="${escapeHTML(fb.ticket_id)}" style="border-left: 3px solid ${fb.rating >= 4 ? 'var(--color-success)' : (fb.rating === 3 ? 'var(--color-warning)' : 'var(--color-danger)')}">
                    <div class="mini-card-top">
                        <span style="font-weight: 600; color: var(--color-text-primary);">${fb.rating} <span style="color: var(--color-warning);">&#9733;</span></span>
                        <span class="mini-card-date" style="font-size: 0.75rem; color: var(--color-text-secondary);">${new Date(fb.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="mini-card-title">${escapeHTML(fb.ticket_title)}</div>
                    ${fb.comment ? `<div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 4px; font-style: italic;">"${escapeHTML(fb.comment)}"</div>` : ''}
                </div>
            `).join('');

            feedbackList.addEventListener('click', async (e) => {
                const card = (e.target as HTMLElement).closest('.mini-card');
                if (card) {
                    const id = card.getAttribute('data-id');
                    if (id) {
                        try {
                            const ticket = await ticketsAPI.getById(id);
                            new TicketDetailModal(ticket, () => DashboardPage.load()).open();
                        } catch (err) {
                            handleUIError(err, 'Failed to load ticket details');
                        }
                    }
                }
            });

            feedbackSection.appendChild(feedbackList);
        }

        midRow.appendChild(feedbackSection);

        // My Recent Tickets section
        const myUserId = store.getState().currentUser?.id;
        const myTickets = tickets.filter(t => t.primary_assignee_id === myUserId);
        
        const recentSection = createElement('div', { className: 'analytics-section fade-in' });
        recentSection.style.animationDelay = '260ms';
        const recentTitle = createElement('h3', { className: 'analytics-section-title' });
        recentTitle.innerHTML = '<i data-lucide="clipboard-list"></i> My Recent Tickets';
        recentSection.appendChild(recentTitle);

        this.renderTicketList(recentSection, myTickets);

        midRow.appendChild(recentSection);
        container.appendChild(midRow);
    }

    private static renderRecentActivity(container: HTMLElement, tickets: Ticket[]): void {
        const section = createElement('div', { className: 'analytics-section fade-in' });
        section.style.animationDelay = '320ms';
        const title = createElement('h3', { className: 'analytics-section-title' });
        title.innerHTML = '<i data-lucide="activity"></i> Recent Activity';
        section.appendChild(title);

        this.renderTicketList(section, tickets);
        container.appendChild(section);
    }

    private static renderTicketList(section: HTMLElement, tickets: Ticket[]): void {
        const recent = [...tickets]
            .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
            .slice(0, 5);

        if (recent.length === 0) {
            const emptyDiv = createElement('div');
            emptyDiv.style.cssText = 'padding: var(--space-xl); text-align: center; color: var(--color-text-secondary);';
            emptyDiv.innerHTML = `
                <i data-lucide="inbox" style="width: 36px; height: 36px; margin-bottom: var(--space-sm); opacity: 0.5;"></i>
                <p style="margin: 0;">No recent tickets.</p>
            `;
            section.appendChild(emptyDiv);
        } else {
            const list = createElement('div');
            list.innerHTML = recent.map((ticket, i) => `
                <div class="mini-card fade-in" data-id="${escapeHTML(ticket.id)}" style="border-left: 3px solid ${getSeverityColor(ticket.severity)}; animation-delay: ${320 + i * 50}ms;">
                    <div class="mini-card-top">
                        <span class="mini-card-id">${escapeHTML(ticket.id)}</span>
                        <span class="badge ${getStatusBadgeClass(ticket.status)}">${escapeHTML(ticket.status)}</span>
                    </div>
                    <div class="mini-card-title">${escapeHTML(ticket.title)}</div>
                    <div class="mini-card-badges">
                        <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${escapeHTML(ticket.severity)}</span>
                        <span style="font-size: 0.75rem; color: var(--color-text-secondary);">${escapeHTML(ticket.department || '')}</span>
                    </div>
                </div>
            `).join('');

            list.addEventListener('click', (e) => {
                const card = (e.target as HTMLElement).closest('.mini-card');
                if (card) {
                    const id = card.getAttribute('data-id');
                    const ticket = recent.find(t => t.id === id);
                    if (ticket) {
                        new TicketDetailModal(ticket, () => DashboardPage.load()).open();
                    }
                }
            });

            section.appendChild(list);
        }
    }
}
