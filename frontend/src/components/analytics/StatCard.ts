import { createElement } from '../../utils/dom';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        label: string;
    };
    colorVar?: string; // CSS custom property name like '--primary'
}

export class StatCard {
    private element: HTMLElement;

    constructor(private props: StatCardProps) {
        this.element = this.render();
    }

    private render(): HTMLElement {
        const color = this.props.colorVar ? `var(${this.props.colorVar})` : 'var(--color-text-primary)';
        
        const container = createElement('div', { className: 'stat-card fade-in' });
        
        const header = createElement('div', { className: 'stat-card-header' });
        const title = createElement('span', { className: 'stat-card-title', textContent: this.props.title });
        const iconWrapper = createElement('div', { className: 'stat-card-icon' });
        
        // Use Lucide standard HTML contract
        iconWrapper.innerHTML = `<i data-lucide="${this.props.icon}"></i>`;
        iconWrapper.style.backgroundColor = `color-mix(in srgb, ${color} 10%, transparent)`;
        iconWrapper.style.color = color;
        
        header.appendChild(title);
        header.appendChild(iconWrapper);
        
        const value = createElement('div', { className: 'stat-card-value', textContent: String(this.props.value) });
        
        container.appendChild(header);
        container.appendChild(value);

        if (this.props.trend) {
            const trend = createElement('div', { className: `stat-card-trend trend-${this.props.trend.direction}` });
            const trendIconStr = this.props.trend.direction === 'up' ? 'arrow-up' : (this.props.trend.direction === 'down' ? 'arrow-down' : 'minus');
            
            trend.innerHTML = `<span class="trend-icon"><i data-lucide="${trendIconStr}" style="width: 14px; height: 14px;"></i></span> ${this.props.trend.label}`;
            container.appendChild(trend);
        }

        return container;
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
