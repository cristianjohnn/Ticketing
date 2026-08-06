import { store } from '../state/store';
import { getPortalContentContainer } from '../utils/portalContent';
import { handleUIError, getErrorMessage } from '../utils/errorHandler';
import { escapeHTML } from '../utils/formatters';
import { createElement } from '../utils/dom';
import { IconService } from '../utils/iconService';
import { statsAPI } from '../services/api';
import { BarChart } from '../components/analytics/BarChart';
import { LineChart } from '../components/analytics/LineChart';
import { StatCard } from '../components/analytics/StatCard';
import { TicketsPage } from './Tickets';
import { LoadingManager } from '../utils/loadingManager';
import { TransitionManager } from '../utils/transitionManager';

export class AnalyticsPage {
    private static currentFilters: Record<string, string> = {};
    private static activeTab: 'overview' | 'leaderboards' | 'reports' = 'overview';

    public static async load(): Promise<void> {
        const user = store.getState().currentUser;
        if (!user || user.role === 'client') return;

        const container = getPortalContentContainer(user.role);
        if (!container) return;

        LoadingManager.registerSkeleton('analytics', () => `
            <div class="page-header" style="margin-bottom: var(--space-md)">
                <div class="skeleton skeleton-text" style="width: 200px; height: 32px; margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 300px; height: 16px; margin-bottom: 0;"></div>
            </div>
            <div style="display: flex; gap: 0; margin-bottom: var(--space-lg); border-bottom: 1px solid var(--color-border);">
                <div class="skeleton skeleton-text" style="width: 80px; height: 24px; margin: var(--space-sm) var(--space-lg) var(--space-sm) 0;"></div>
                <div class="skeleton skeleton-text" style="width: 100px; height: 24px; margin: var(--space-sm) var(--space-lg) var(--space-sm) 0;"></div>
                <div class="skeleton skeleton-text" style="width: 120px; height: 24px; margin: var(--space-sm) 0;"></div>
            </div>
            <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-lg);">
                <div class="skeleton skeleton-text" style="flex: 1; height: 38px; border-radius: var(--radius-sm);"></div>
                <div class="skeleton skeleton-text" style="flex: 1; height: 38px; border-radius: var(--radius-sm);"></div>
                <div class="skeleton skeleton-text" style="flex: 1; height: 38px; border-radius: var(--radius-sm);"></div>
            </div>
            <div class="stats-grid" style="margin-bottom: var(--space-lg);">
                ${Array.from({ length: 4 }).map(() => `
                    <div style="background: var(--color-bg-surface); border-radius: var(--radius); padding: var(--space-lg); border: 1px solid var(--color-border); height: 120px;">
                        <div class="skeleton skeleton-text" style="width: 32px; height: 32px; border-radius: var(--radius); margin-bottom: 12px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; height: 24px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: 0;"></div>
                    </div>
                `).join('')}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); margin-bottom: var(--space-lg);">
                <div class="skeleton skeleton-text" style="height: 180px; border-radius: var(--radius);"></div>
                <div class="skeleton skeleton-text" style="height: 180px; border-radius: var(--radius);"></div>
            </div>
            <div class="skeleton skeleton-text" style="height: 300px; width: 100%; border-radius: var(--radius);"></div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'analytics');

            const [kpis, breakdowns, trends, leaderboards] = await Promise.all([
                statsAPI.getExecutiveKPIs(this.currentFilters),
                statsAPI.getBreakdowns(this.currentFilters),
                statsAPI.getTicketTrends(this.currentFilters),
                statsAPI.getLeaderboards(this.currentFilters)
            ]);

            await LoadingManager.hideSkeleton(container);

            await TransitionManager.crossFadeContent(container, () => {
                const headerHtml = `
                    <div class="page-header" style="margin-bottom: var(--space-lg)">
                        <h2 style="margin: 0 0 var(--space-xs) 0; font-size: 1.5rem; color: var(--foreground);">Analytics</h2>
                        <p style="margin: 0; color: var(--color-text-secondary); font-size: 0.9rem;">Historical reports, trends, and performance metrics.</p>
                    </div>
                    <div class="analytics-tabs">
                        <button class="analytics-tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
                        <button class="analytics-tab-btn ${this.activeTab === 'leaderboards' ? 'active' : ''}" data-tab="leaderboards">Leaderboards</button>
                        <button class="analytics-tab-btn ${this.activeTab === 'reports' ? 'active' : ''}" data-tab="reports">Reports & Exports</button>
                    </div>
                    <div class="analytics-filters">
                        <select id="an-filter-dept" class="input"><option value="">All Departments</option><option value="IT">IT</option><option value="HR">HR</option><option value="Facilities">Facilities</option></select>
                        <select id="an-filter-cat" class="input"><option value="">All Categories</option><option value="Hardware">Hardware</option><option value="Software">Software</option><option value="Network">Network</option><option value="Access">Access</option></select>
                        <select id="an-filter-status" class="input"><option value="">All Statuses</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select>
                    </div>
                    <div id="analytics-content"></div>
                `;
                container.innerHTML = headerHtml;

                const contentContainer = document.getElementById('analytics-content') as HTMLElement;

                if (this.activeTab === 'overview') {
                    this.renderOverview(contentContainer, kpis, breakdowns, trends);
                } else if (this.activeTab === 'leaderboards') {
                    this.renderLeaderboards(contentContainer, leaderboards);
                } else if (this.activeTab === 'reports') {
                    this.renderReports(contentContainer);
                }

                this.bindEvents(container);

                // Sync Filters
                (document.getElementById('an-filter-dept') as HTMLSelectElement).value = this.currentFilters.department || '';
                (document.getElementById('an-filter-cat') as HTMLSelectElement).value = this.currentFilters.category || '';
                (document.getElementById('an-filter-status') as HTMLSelectElement).value = this.currentFilters.status || '';

                IconService.renderIcons(container);
            });
        } catch (err) {
            await LoadingManager.hideSkeleton(container);
            handleUIError(err, 'Failed to load Analytics');
            container.innerHTML = `
                <div class="empty-state" style="margin-top: var(--space-xl);">
                    <div class="empty-state-icon" style="color: var(--color-danger);">
                        <i data-lucide="alert-triangle" style="width: 48px; height: 48px;"></i>
                    </div>
                    <div class="empty-state-title" style="color: var(--color-danger); font-size: 1.25rem;">Failed to Load Analytics</div>
                    <p>${escapeHTML(getErrorMessage(err, 'An unexpected error occurred.'))}</p>
                    <button class="btn btn-primary" style="margin-top: var(--space-md);" onclick="window.location.reload()">Retry</button>
                </div>
            `;
            IconService.renderIcons(container);
        }
    }

    private static bindEvents(container: HTMLElement): void {
        container.querySelectorAll('.analytics-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeTab = (e.target as HTMLElement).dataset.tab as any;
                this.load();
            });
        });

        const selects = ['an-filter-dept', 'an-filter-cat', 'an-filter-status'];
        const keys = ['department', 'category', 'status'];
        selects.forEach((id, index) => {
            const el = document.getElementById(id) as HTMLSelectElement;
            if (el) {
                el.addEventListener('change', () => {
                    if (el.value) {
                        this.currentFilters[keys[index]] = el.value;
                    } else {
                        delete this.currentFilters[keys[index]];
                    }
                    this.load();
                });
            }
        });
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

    private static renderOverview(container: HTMLElement, kpis: any, breakdowns: any, trends: any): void {
        container.innerHTML = '';

        // 1. KPI Stat Cards
        const grid = createElement('div', { className: 'stats-grid' });
        grid.style.marginBottom = 'var(--space-lg)';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

        const addStaggerDelay = (el: HTMLElement, index: number) => {
            el.style.animationDelay = `${index * 60}ms`;
        };

        grid.appendChild(new StatCard({ title: 'Open Tickets', value: kpis.open_tickets, icon: 'inbox', colorVar: '--color-warning', trend: this.getTrend(kpis.open_tickets, kpis.prev_open_tickets, true) }).getElement());
        grid.appendChild(new StatCard({ title: 'Resolved', value: kpis.resolved_tickets, icon: 'check-circle', colorVar: '--color-success', trend: this.getTrend(kpis.resolved_tickets, kpis.prev_resolved_tickets) }).getElement());
        grid.appendChild(new StatCard({ title: 'Avg Resolution', value: kpis.avg_resolution_time_seconds ? `${Math.round(kpis.avg_resolution_time_seconds / 3600)} hrs` : '—', icon: 'clock', colorVar: '--color-info', trend: this.getTrend(kpis.avg_resolution_time_seconds, kpis.prev_avg_resolution_time_seconds, true) }).getElement());
        grid.appendChild(new StatCard({ title: 'Overall CSAT', value: kpis.overall_csat ? `${kpis.overall_csat.toFixed(1)} / 5` : '—', icon: 'star', colorVar: '--color-primary' }).getElement());

        Array.from(grid.children).forEach((child, i) => addStaggerDelay(child as HTMLElement, i));
        container.appendChild(grid);

        // 2. Breakdown Charts (side-by-side)
        const chartsWrapper = createElement('div', { className: 'analytics-charts-grid' });

        // Category breakdown
        const catSection = createElement('div', { className: 'analytics-section fade-in' });
        catSection.style.animationDelay = '200ms';
        const catTitle = createElement('h3', { className: 'analytics-section-title' });
        catTitle.innerHTML = '<i data-lucide="layers"></i> Tickets by Category';
        catSection.appendChild(catTitle);

        if (breakdowns.byCategory.length === 0) {
            catSection.innerHTML += '<div style="padding: var(--space-md); text-align: center; color: var(--color-text-secondary);">No category data.</div>';
        } else {
            const catChart = new BarChart({
                data: breakdowns.byCategory.map((c: any) => ({
                    label: c.category || 'Unassigned',
                    value: Number(c.count),
                    colorVar: '--color-primary'
                })),
                onClick: (item) => {
                    if (item.label !== 'Unassigned') {
                        TicketsPage.applyFilterAndNavigate('category', item.label);
                    }
                }
            });
            catSection.appendChild(catChart.getElement());
        }

        // Status breakdown
        const statSection = createElement('div', { className: 'analytics-section fade-in' });
        statSection.style.animationDelay = '260ms';
        const statTitle = createElement('h3', { className: 'analytics-section-title' });
        statTitle.innerHTML = '<i data-lucide="pie-chart"></i> Tickets by Status';
        statSection.appendChild(statTitle);

        if (breakdowns.byStatus.length === 0) {
            statSection.innerHTML += '<div style="padding: var(--space-md); text-align: center; color: var(--color-text-secondary);">No status data.</div>';
        } else {
            const statusColorMap: Record<string, string> = {
                'Open': '--color-warning',
                'In Progress': '--color-info',
                'Pending': '--color-text-secondary',
                'Resolved': '--color-success',
                'Closed': '--color-success'
            };
            const statChart = new BarChart({
                data: breakdowns.byStatus.map((s: any) => ({
                    label: s.status,
                    value: Number(s.count),
                    colorVar: statusColorMap[s.status] || '--color-primary'
                })),
                onClick: (item) => {
                    TicketsPage.applyFilterAndNavigate('status', item.label);
                }
            });
            statSection.appendChild(statChart.getElement());
        }

        chartsWrapper.appendChild(catSection);
        chartsWrapper.appendChild(statSection);
        container.appendChild(chartsWrapper);

        // 3. Priority breakdown & Aging (side-by-side, second row)
        if (breakdowns.byPriority?.length > 0 || breakdowns.byAging?.length > 0) {
            const row2 = createElement('div', { className: 'analytics-charts-grid' });

            if (breakdowns.byPriority?.length > 0) {
                const prioSection = createElement('div', { className: 'analytics-section fade-in' });
                prioSection.style.animationDelay = '320ms';
                const prioTitle = createElement('h3', { className: 'analytics-section-title' });
                prioTitle.innerHTML = '<i data-lucide="alert-circle"></i> Tickets by Priority';
                prioSection.appendChild(prioTitle);

                const prioColorMap: Record<string, string> = {
                    'Critical': '--color-danger',
                    'High': '--color-warning',
                    'Medium': '--color-info',
                    'Low': '--color-success'
                };
                const prioChart = new BarChart({
                    data: breakdowns.byPriority.map((p: any) => ({
                        label: p.priority || 'Unset',
                        value: Number(p.count),
                        colorVar: prioColorMap[p.priority] || '--color-text-secondary'
                    }))
                });
                prioSection.appendChild(prioChart.getElement());
                row2.appendChild(prioSection);
            }

            if (breakdowns.byAging?.length > 0) {
                const agingSection = createElement('div', { className: 'analytics-section fade-in' });
                agingSection.style.animationDelay = '380ms';
                const agingTitle = createElement('h3', { className: 'analytics-section-title' });
                agingTitle.innerHTML = '<i data-lucide="hourglass"></i> Ticket Aging';
                agingSection.appendChild(agingTitle);
                const agingChart = new BarChart({
                    data: breakdowns.byAging.map((a: any) => ({
                        label: a.age_group,
                        value: Number(a.count),
                        colorVar: '--color-warning'
                    }))
                });
                agingSection.appendChild(agingChart.getElement());
                row2.appendChild(agingSection);
            }

            container.appendChild(row2);
        }

        // 4. Trend Chart (full width)
        const trendSection = createElement('div', { className: 'analytics-section fade-in' });
        trendSection.style.animationDelay = '440ms';
        const trendTitle = createElement('h3', { className: 'analytics-section-title' });
        trendTitle.innerHTML = '<i data-lucide="trending-up"></i> Ticket Volume Trend (Last 30 Days)';
        trendSection.appendChild(trendTitle);

        const trendChart = new LineChart({
            data: trends.map((t: any) => ({ label: t.date, value: Number(t.created) })),
            secondaryData: trends.map((t: any) => ({ label: t.date, value: Number(t.resolved) })),
            height: '280px',
            colorVar: '--color-primary',
            secondaryColorVar: '--color-success',
            legendLabels: ['Created', 'Resolved']
        });
        trendSection.appendChild(trendChart.getElement());
        container.appendChild(trendSection);
    }

    private static renderLeaderboards(container: HTMLElement, leaderboards: any[]): void {
        container.innerHTML = '';
        const lbGrid = createElement('div', { className: 'analytics-charts-grid' });

        const sortedDesc = [...leaderboards].sort((a, b) => b.tickets_resolved - a.tickets_resolved);
        const top5 = sortedDesc.slice(0, 5);
        const bottom5 = [...sortedDesc].reverse().slice(0, 5);

        const renderTable = (title: string, icon: string, data: any[]) => {
            const section = createElement('div', { className: 'analytics-section fade-in' });
            const sectionTitle = createElement('h3', { className: 'analytics-section-title' });
            sectionTitle.innerHTML = `<i data-lucide="${icon}"></i> ${title}`;
            section.appendChild(sectionTitle);

            if (data.length === 0) {
                section.innerHTML += `
                    <div style="padding: var(--space-xl); text-align: center; color: var(--color-text-secondary);">
                        <i data-lucide="users" style="width: 36px; height: 36px; margin-bottom: var(--space-sm); opacity: 0.5;"></i>
                        <p style="margin: 0;">No technician data available yet.</p>
                    </div>
                `;
            } else {
                const table = createElement('table', { className: 'leaderboard-table' });
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th style="width: 40px;">#</th>
                            <th>Technician</th>
                            <th>Resolved</th>
                            <th>CSAT</th>
                            <th>Reopens</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((lb, i) => {
                            const rank = i + 1;
                            const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
                            const csatVal = lb.avg_csat ? Number(lb.avg_csat).toFixed(1) : '—';
                            return `
                                <tr>
                                    <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                                    <td style="font-weight: 500;">${escapeHTML(lb.tech_name || 'Unknown')}</td>
                                    <td><span style="font-weight: 600;">${lb.tickets_resolved}</span></td>
                                    <td>${csatVal !== '—' ? `${csatVal} <span style="color: var(--color-warning);">&#9733;</span>` : '—'}</td>
                                    <td>${lb.total_reopens || 0}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                `;
                section.appendChild(table);
            }

            return section;
        };

        lbGrid.appendChild(renderTable('Top 5 Technicians', 'trophy', top5));
        lbGrid.appendChild(renderTable('Needs Improvement', 'alert-triangle', bottom5));

        Array.from(lbGrid.children).forEach((child, i) => {
            (child as HTMLElement).style.animationDelay = `${i * 80}ms`;
        });

        container.appendChild(lbGrid);
    }

    private static renderReports(container: HTMLElement): void {
        container.innerHTML = '';

        const reportsGrid = createElement('div', { className: 'analytics-charts-grid' });

        // Export Center
        const exportSection = createElement('div', { className: 'analytics-section fade-in' });
        const exportTitle = createElement('h3', { className: 'analytics-section-title' });
        exportTitle.innerHTML = '<i data-lucide="download"></i> Export Center';
        exportSection.appendChild(exportTitle);
        exportSection.innerHTML += `
            <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg); font-size: 0.875rem;">Download ticket data for external analysis or archiving.</p>
            
            <div style="margin-bottom: var(--space-lg);">
                <label style="display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 500; color: var(--color-text-secondary);">Data Scope</label>
                <select id="export-scope" class="input" style="width: 100%;">
                    <option value="filters">Current Filters (Based on top dropdowns)</option>
                    <option value="all">Entire Dataset</option>
                </select>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md);">
                <button class="btn btn-primary" id="btn-export-csv" style="justify-content: center; gap: 6px;">
                    <i data-lucide="file-spreadsheet" style="width: 16px; height: 16px;"></i> CSV
                </button>
                <button class="btn btn-secondary" id="btn-export-xlsx" style="justify-content: center; gap: 6px;">
                    <i data-lucide="table" style="width: 16px; height: 16px;"></i> XLSX
                </button>
                <button class="btn btn-primary" id="btn-export-pdf" style="justify-content: center; gap: 6px;">
                    <i data-lucide="file-text" style="width: 16px; height: 16px;"></i> PDF
                </button>
            </div>
        `;

        // Saved Reports
        const savedSection = createElement('div', { className: 'analytics-section fade-in' });
        savedSection.style.animationDelay = '80ms';
        const savedTitle = createElement('h3', { className: 'analytics-section-title' });
        savedTitle.innerHTML = '<i data-lucide="bookmark"></i> Saved Reports';
        savedSection.appendChild(savedTitle);
        savedSection.innerHTML += `
            <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg); font-size: 0.875rem;">Quick access to frequently used filter combinations.</p>
            
            <table class="leaderboard-table">
                <tbody>
                    <tr>
                        <td style="font-weight: 500;">Monthly Hardware Issues</td>
                        <td style="color: var(--color-text-secondary);">Category: Hardware</td>
                        <td style="text-align: right;"><button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.75rem;">Run</button></td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">High Severity Open</td>
                        <td style="color: var(--color-text-secondary);">Status: Open, Severity: Severe</td>
                        <td style="text-align: right;"><button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.75rem;">Run</button></td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">IT Dept Performance</td>
                        <td style="color: var(--color-text-secondary);">Department: IT, Status: Resolved</td>
                        <td style="text-align: right;"><button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.75rem;">Run</button></td>
                    </tr>
                </tbody>
            </table>
        `;

        reportsGrid.appendChild(exportSection);
        reportsGrid.appendChild(savedSection);
        container.appendChild(reportsGrid);

        const triggerExport = (format: string) => {
            const scope = (document.getElementById('export-scope') as HTMLSelectElement).value;
            alert(`Exporting ${scope} data as ${format.toUpperCase()}...`);
        };

        container.querySelector('#btn-export-csv')?.addEventListener('click', () => triggerExport('csv'));
        container.querySelector('#btn-export-xlsx')?.addEventListener('click', () => triggerExport('xlsx'));
        container.querySelector('#btn-export-pdf')?.addEventListener('click', () => triggerExport('pdf'));
    }
}
