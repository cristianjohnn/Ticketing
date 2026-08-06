import { Stats } from '../types';

export class StatCardsComponent {
    public static render(stats: Stats | null): void {
        if (!stats) return;

        const setVal = (id: string, val: string | number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };

        setVal('stat-total', stats.total);
        setVal('stat-open', stats.open);
        setVal('stat-in-progress', stats.inProgress);
        setVal('stat-resolved', stats.resolved);
        setVal('stat-severe', stats.severe);
        setVal('stat-rating', stats.avgRating ? `${stats.avgRating} ★` : 'N/A');
    }
}
