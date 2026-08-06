import { createElement } from '../../utils/dom';

export interface BarChartProps {
    data: { label: string; value: number; colorVar?: string }[];
    height?: string;
    showValues?: boolean;
    showPercentages?: boolean;
    formatValue?: (v: number) => string;
    onClick?: (item: { label: string; value: number; colorVar?: string }) => void;
}

export class BarChart {
    private element: HTMLElement;

    constructor(private props: BarChartProps) {
        this.element = this.render();
    }

    private render(): HTMLElement {
        const container = createElement('div', { className: 'bar-chart-container fade-in' });
        if (this.props.height) {
            container.style.height = this.props.height;
        }

        if (this.props.data.length === 0) {
            container.innerHTML = `
                <div style="padding: var(--space-lg); text-align: center; color: var(--color-text-secondary); font-size: 0.875rem;">
                    No data available.
                </div>
            `;
            return container;
        }

        const totalVal = this.props.data.reduce((acc, d) => acc + d.value, 0);
        const maxVal = Math.max(...this.props.data.map(d => d.value), 1);

        this.props.data.forEach((item, index) => {
            const row = createElement('div', { className: 'bar-chart-row' });
            row.style.animationDelay = `${index * 50}ms`;

            if (this.props.onClick) {
                row.style.cursor = 'pointer';
                row.setAttribute('title', `Filter by ${item.label}`);
                row.addEventListener('click', () => {
                    this.props.onClick!(item);
                });
            }

            const label = createElement('div', { className: 'bar-chart-label', textContent: item.label });
            const track = createElement('div', { className: 'bar-chart-track' });
            const bar = createElement('div', { className: 'bar-chart-bar' });

            const percentage = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
            const sharePct = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;

            bar.style.width = '0%';
            bar.style.transitionDelay = `${index * 60}ms`;

            // Animate bar width smoothly
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    bar.style.width = item.value > 0 ? `${Math.max(percentage, 2)}%` : '0%';
                });
            });

            if (item.colorVar) {
                bar.style.background = `linear-gradient(90deg, var(${item.colorVar}), color-mix(in srgb, var(${item.colorVar}) 80%, white))`;
            }

            track.appendChild(bar);
            row.appendChild(label);
            row.appendChild(track);

            const valueWrap = createElement('div', { className: 'bar-chart-value-wrap' });

            if (this.props.showValues !== false) {
                const valText = this.props.formatValue ? this.props.formatValue(item.value) : String(item.value);
                const valueEl = createElement('div', { className: 'bar-chart-value', textContent: valText });
                valueWrap.appendChild(valueEl);
            }

            if (this.props.showPercentages !== false && totalVal > 0) {
                const pctEl = createElement('div', { className: 'bar-chart-pct', textContent: `${sharePct}%` });
                valueWrap.appendChild(pctEl);
            }

            row.appendChild(valueWrap);
            container.appendChild(row);
        });

        return container;
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
