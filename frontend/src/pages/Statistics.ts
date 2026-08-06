import { Stats } from '../types';
import { statsAPI } from '../services/api';
import { store } from '../state/store';
import { StatCardsComponent } from '../components/StatCards';

export class StatisticsPage {
    public static async load(): Promise<void> {
        try {
            const stats = await statsAPI.get();
            store.setStats(stats);

            // Reuse the shared StatCards component for header metrics
            StatCardsComponent.render(stats);

            // Render the detailed breakdown (unique to the Statistics view)
            this.renderBreakdown(stats);
        } catch (err) {
            console.error('Failed to load statistics:', err);
        }
    }

    private static renderBreakdown(stats: Stats): void {
        const container = document.getElementById('stats-breakdown-content');
        if (!container) return;

        const resolveRate = stats.total > 0
            ? ((stats.resolved / stats.total) * 100).toFixed(1)
            : '0.0';

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-box">
                    <h4>Resolution Rate</h4>
                    <div class="stat-number">${resolveRate}%</div>
                </div>
                <div class="stat-box">
                    <h4>Active (Open + In Progress)</h4>
                    <div class="stat-number text-open">${stats.open + stats.inProgress}</div>
                </div>
                <div class="stat-box">
                    <h4>Critical / Severe SLA Breaches</h4>
                    <div class="stat-number text-severe">${stats.severe + stats.critical}</div>
                </div>
                <div class="stat-box">
                    <h4>Rated Tickets</h4>
                    <div class="stat-number">${stats.rated}</div>
                </div>
                <div class="stat-box">
                    <h4>Average User Rating</h4>
                    <div class="stat-number text-rating">${stats.avgRating ? `${stats.avgRating} ★` : 'N/A'}</div>
                </div>
            </div>
        `;
    }
}
