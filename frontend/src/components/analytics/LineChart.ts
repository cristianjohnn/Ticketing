import { createElement } from '../../utils/dom';

export interface LineChartProps {
    data: { label: string; value: number }[];
    secondaryData?: { label: string; value: number }[];
    height?: string;
    colorVar?: string;
    secondaryColorVar?: string;
    legendLabels?: [string, string];
    daysCount?: number;
    autoFillDateGaps?: boolean;
}

interface ChartPoint {
    x: number;
    y: number;
    val: number;
    label: string;
    fullDateStr: string;
}

export class LineChart {
    private element: HTMLElement;
    private resizeObserver: ResizeObserver | null = null;
    private hasAnimated = false;
    private drawRaf: number | null = null;

    constructor(private props: LineChartProps) {
        this.element = createElement('div', { className: 'line-chart-wrapper fade-in' });
        this.element.style.width = '100%';
        this.element.style.height = this.props.height || '280px';
        this.element.style.position = 'relative';

        if (!this.props.data || this.props.data.length === 0) {
            this.element.innerHTML = `
                <div class="line-chart-empty" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <i data-lucide="trending-up" style="width: 36px; height: 36px; opacity: 0.35;"></i>
                    <p>No trend data available for this period.</p>
                </div>
            `;
            return;
        }

        // Bind ResizeObserver to dynamically update SVG mapping 1:1 to pixel dimensions
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const rect = entry.contentRect;
                if (rect.width > 0 && rect.height > 0) {
                    if (this.drawRaf) cancelAnimationFrame(this.drawRaf);
                    this.drawRaf = requestAnimationFrame(() => {
                        this.draw(rect.width, rect.height);
                    });
                }
            }
        });
        this.resizeObserver.observe(this.element);
    }

    private draw(svgW: number, svgH: number): void {
        const autoFill = this.props.autoFillDateGaps !== false;
        const daysCount = this.props.daysCount || 30;
        const { normalizedPrimary, normalizedSecondary } = this.normalizeTimeSeries(
            this.props.data,
            this.props.secondaryData,
            autoFill,
            daysCount
        );

        const allValues = [
            ...normalizedPrimary.map(d => d.value),
            ...(normalizedSecondary ? normalizedSecondary.map(d => d.value) : [])
        ];
        const rawMax = Math.max(...allValues, 0);
        const { yMax, ticks } = this.computeYAxis(rawMax);

        // Responsive padding based on size
        const padL = 48;
        const padR = 16;
        const padT = 16;
        let legendOffset = 0;
        if (this.props.legendLabels) {
            legendOffset = 32; // Reserve space for legend at the bottom
        }
        
        const padB = 24; 
        const chartW = svgW - padL - padR;
        const chartH = svgH - padT - padB - legendOffset;
        const baseY = padT + chartH;

        // If height is incredibly small, don't try to draw
        if (chartH <= 0) return;

        const color1 = `var(${this.props.colorVar || '--color-primary'})`;
        const color2 = this.props.secondaryColorVar ? `var(${this.props.secondaryColorVar})` : 'var(--color-success)';

        const mapPoints = (data: { label: string; value: number; fullDateStr: string }[]): ChartPoint[] => {
            return data.map((d, i) => ({
                x: data.length === 1 ? padL + chartW / 2 : padL + (i / (data.length - 1)) * chartW,
                y: yMax === 0 ? baseY : baseY - (d.value / yMax) * chartH,
                val: d.value,
                label: d.label,
                fullDateStr: d.fullDateStr
            }));
        };

        const priPoints = mapPoints(normalizedPrimary);
        const secPoints = normalizedSecondary ? mapPoints(normalizedSecondary) : null;

        const priPath = this.buildSmoothedPath(priPoints, baseY, padT);
        const secPath = secPoints ? this.buildSmoothedPath(secPoints, baseY, padT) : null;

        const gridSVG = ticks.map(t => {
            const y = baseY - (t / yMax) * chartH;
            return `<line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="var(--color-border)" stroke-opacity="0.5" stroke-dasharray="4 4" />`;
        }).join('');

        const yLabelSVG = ticks.map(t => {
            const y = baseY - (t / yMax) * chartH;
            return `<text x="${padL - 10}" y="${y + 4}" fill="var(--color-text-secondary)" font-size="11" font-weight="500" text-anchor="end" font-family="inherit">${t}</text>`;
        }).join('');

        // Dynamic X labels based on width (max 8)
        const numLabels = Math.min(priPoints.length, Math.max(3, Math.floor(chartW / 80)));
        const xLabelSVG = Array.from({ length: numLabels }, (_, i) => {
            const idx = Math.round((i / Math.max(numLabels - 1, 1)) * (priPoints.length - 1));
            const pt = priPoints[idx];
            return `<text x="${pt.x}" y="${baseY + 18}" fill="var(--color-text-secondary)" font-size="10" font-weight="500" text-anchor="middle" font-family="inherit">${this.formatDate(pt.label)}</text>`;
        }).join('');

        const uid = `lc-${Math.random().toString(36).substring(2, 8)}`;

        let legendHTML = '';
        if (this.props.legendLabels) {
            legendHTML = `
                <div class="lc-legend" style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${legendOffset}px; display: flex; justify-content: center; align-items: flex-end; gap: 24px;">
                    <div class="lc-legend-item" style="display:flex; align-items:center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: var(--color-text-secondary);">
                        <span class="lc-legend-swatch" style="width: 12px; height: 3px; border-radius: 2px; background: ${color1};"></span>
                        ${this.props.legendLabels[0]}
                    </div>
                    <div class="lc-legend-item" style="display:flex; align-items:center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: var(--color-text-secondary);">
                        <span class="lc-legend-swatch" style="width: 12px; height: 3px; border-radius: 2px; background: ${color2};"></span>
                        ${this.props.legendLabels[1]}
                    </div>
                </div>
            `;
        }

        // We use absolute positioning inside so the wrapper establishes the correct layout size,
        // and SVG just fills the available pixel space precisely.
        this.element.innerHTML = `
            <div class="line-chart-canvas" style="position: absolute; top: 0; left: 0; right: 0; bottom: ${legendOffset}px;">
                <svg viewBox="0 0 ${svgW} ${svgH - legendOffset}" style="width: 100%; height: 100%; display: block; overflow: visible;" class="line-chart-svg">
                    <defs>
                        <linearGradient id="gp-${uid}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="${color1}" stop-opacity="0.28" />
                            <stop offset="100%" stop-color="${color1}" stop-opacity="0" />
                        </linearGradient>
                        <linearGradient id="gs-${uid}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="${color2}" stop-opacity="0.20" />
                            <stop offset="100%" stop-color="${color2}" stop-opacity="0" />
                        </linearGradient>
                    </defs>

                    <!-- Grid -->
                    ${gridSVG}
                    ${yLabelSVG}
                    ${xLabelSVG}

                    <!-- Baseline -->
                    <line x1="${padL}" y1="${baseY}" x2="${svgW - padR}" y2="${baseY}" stroke="var(--color-border)" stroke-opacity="0.7" />

                    <!-- Secondary area + line -->
                    ${secPath ? `
                        <path d="${secPath.area}" fill="url(#gs-${uid})" class="lc-area" style="transition: none;" />
                        <path d="${secPath.line}" fill="none" stroke="${color2}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lc-line" style="transition: none;" />
                    ` : ''}

                    <!-- Primary area + line -->
                    ${priPath.area ? `<path d="${priPath.area}" fill="url(#gp-${uid})" class="lc-area" style="transition: none;" />` : ''}
                    <path d="${priPath.line}" fill="none" stroke="${color1}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lc-line" style="transition: none;" />

                    <!-- Crosshair -->
                    <line id="xh-${uid}" class="lc-crosshair" x1="0" y1="${padT}" x2="0" y2="${baseY}" />

                    <!-- Hover dots -->
                    <circle id="pd-${uid}" class="lc-hover-dot" r="5" fill="var(--color-bg-surface)" stroke="${color1}" stroke-width="2.5" />
                    ${secPoints ? `<circle id="sd-${uid}" class="lc-hover-dot" r="4.5" fill="var(--color-bg-surface)" stroke="${color2}" stroke-width="2" />` : ''}

                    <!-- Hover capture zone -->
                    <rect id="hz-${uid}" x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" fill="transparent" style="cursor: crosshair;" />
                </svg>

                <!-- Tooltip -->
                <div class="lc-tooltip" id="tt-${uid}"></div>
            </div>

            ${legendHTML}
        `;

        this.attachInteraction(this.element, uid, priPoints, secPoints, svgW, svgH - legendOffset, color1, color2);

        if (!this.hasAnimated) {
            this.hasAnimated = true;
            requestAnimationFrame(() => {
                this.element.querySelectorAll('.lc-line').forEach(el => {
                    const p = el as SVGPathElement;
                    const len = p.getTotalLength();
                    p.style.strokeDasharray = `${len}`;
                    p.style.strokeDashoffset = `${len}`;
                    
                    // Wait a frame to apply transition, then animate offset to 0
                    requestAnimationFrame(() => {
                        p.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)';
                        p.style.strokeDashoffset = '0';
                    });
                });
                this.element.querySelectorAll('.lc-area').forEach(el => {
                    (el as SVGPathElement).style.transition = 'opacity 0.6s ease-out 0.25s';
                    (el as SVGPathElement).style.opacity = '1';
                });
            });
        } else {
            // Already animated, ensure it's visible instantly without transition
            this.element.querySelectorAll('.lc-line').forEach(el => {
                const p = el as SVGPathElement;
                p.style.strokeDasharray = 'none';
                p.style.strokeDashoffset = '0';
                p.style.transition = 'none';
            });
            this.element.querySelectorAll('.lc-area').forEach(el => {
                (el as SVGPathElement).style.opacity = '1';
                (el as SVGPathElement).style.transition = 'none';
            });
        }
    }

    private attachInteraction(
        wrapper: HTMLElement,
        uid: string,
        priPoints: ChartPoint[],
        secPoints: ChartPoint[] | null,
        svgW: number,
        svgH: number,
        color1: string,
        color2: string
    ): void {
        const hoverZone = wrapper.querySelector(`#hz-${uid}`) as SVGRectElement;
        const tooltip = wrapper.querySelector(`#tt-${uid}`) as HTMLElement;
        const crosshair = wrapper.querySelector(`#xh-${uid}`) as SVGLineElement;
        const priDot = wrapper.querySelector(`#pd-${uid}`) as SVGCircleElement;
        const secDot = wrapper.querySelector(`#sd-${uid}`) as SVGCircleElement | null;
        const svgEl = wrapper.querySelector('.line-chart-svg') as SVGSVGElement;

        if (!hoverZone || !tooltip || !crosshair || !priDot || !svgEl) return;

        const onMove = (e: MouseEvent) => {
            const svgRect = svgEl.getBoundingClientRect();
            // Get mouse X in relative pixel coordinates (0 to svgW)
            const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * svgW;

            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < priPoints.length; i++) {
                const d = Math.abs(priPoints[i].x - mouseX);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }

            const pp = priPoints[bestIdx];
            const sp = secPoints ? secPoints[bestIdx] : null;

            crosshair.setAttribute('x1', `${pp.x}`);
            crosshair.setAttribute('x2', `${pp.x}`);
            crosshair.style.opacity = '1';

            priDot.setAttribute('cx', `${pp.x}`);
            priDot.setAttribute('cy', `${pp.y}`);
            priDot.style.opacity = '1';

            if (secDot && sp) {
                secDot.setAttribute('cx', `${sp.x}`);
                secDot.setAttribute('cy', `${sp.y}`);
                secDot.style.opacity = '1';
            }

            let html = `<div class="lc-tooltip-date">${pp.fullDateStr}</div>`;
            html += `<div class="lc-tooltip-row"><span class="lc-tooltip-dot" style="background:${color1}"></span><span class="lc-tooltip-label">${this.props.legendLabels?.[0] || 'Created'}</span><span class="lc-tooltip-value">${pp.val}</span></div>`;
            if (sp) {
                html += `<div class="lc-tooltip-row"><span class="lc-tooltip-dot" style="background:${color2}"></span><span class="lc-tooltip-label">${this.props.legendLabels?.[1] || 'Resolved'}</span><span class="lc-tooltip-value">${sp.val}</span></div>`;
            }
            tooltip.innerHTML = html;

            // Compute pixel positions for CSS Tooltip
            const pxX = (pp.x / svgW) * svgRect.width;
            const topY = sp ? Math.min(pp.y, sp.y) : pp.y;
            const pxY = (topY / svgH) * svgRect.height;

            const ttW = tooltip.offsetWidth || 140;
            let left = pxX - ttW / 2;
            if (left < 4) left = 4;
            if (left + ttW > svgRect.width - 4) left = svgRect.width - ttW - 4;

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${pxY - 12}px`;
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(-100%)';
        };

        const onLeave = () => {
            crosshair.style.opacity = '0';
            priDot.style.opacity = '0';
            if (secDot) secDot.style.opacity = '0';
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(-100%) scale(0.96)';
        };

        hoverZone.addEventListener('mousemove', onMove);
        hoverZone.addEventListener('mouseleave', onLeave);
    }

    private computeYAxis(maxVal: number): { yMax: number; ticks: number[] } {
        if (maxVal <= 0) return { yMax: 5, ticks: [0, 1, 2, 3, 4, 5] };
        if (maxVal <= 5) {
            const ceil = maxVal + 1;
            return { yMax: ceil, ticks: Array.from({ length: ceil + 1 }, (_, i) => i) };
        }
        const step = this.niceStep(maxVal / 4);
        const yMax = Math.ceil(maxVal / step) * step;
        const ticks: number[] = [];
        for (let v = 0; v <= yMax; v += step) ticks.push(v);
        return { yMax, ticks };
    }

    private niceStep(raw: number): number {
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const r = raw / mag;
        if (r <= 1.5) return mag;
        if (r <= 3) return 2 * mag;
        if (r <= 7) return 5 * mag;
        return 10 * mag;
    }

    private normalizeTimeSeries(
        primary: { label: string; value: number }[],
        secondary: { label: string; value: number }[] | undefined,
        autoFill: boolean,
        daysCount: number
    ) {
        const isDate = primary.every(d => !isNaN(Date.parse(d.label)));
        if (!isDate || !autoFill) {
            return {
                normalizedPrimary: primary.map(d => ({ ...d, fullDateStr: d.label })),
                normalizedSecondary: secondary?.map(d => ({ ...d, fullDateStr: d.label }))
            };
        }

        const now = new Date();
        const allDates = primary.map(d => new Date(d.label).getTime());
        if (secondary) allDates.push(...secondary.map(d => new Date(d.label).getTime()));
        const maxTime = Math.max(...allDates, now.getTime());
        const endDate = new Date(maxTime);
        endDate.setHours(0, 0, 0, 0);

        const toKey = (d: Date) => d.toISOString().slice(0, 10);
        const priMap = new Map<string, number>();
        primary.forEach(d => {
            const k = toKey(new Date(d.label));
            priMap.set(k, (priMap.get(k) || 0) + Number(d.value));
        });
        const secMap = new Map<string, number>();
        if (secondary) {
            secondary.forEach(d => {
                const k = toKey(new Date(d.label));
                secMap.set(k, (secMap.get(k) || 0) + Number(d.value));
            });
        }

        const out: { label: string; value: number; fullDateStr: string }[] = [];
        const out2: { label: string; value: number; fullDateStr: string }[] = [];
        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - i);
            const k = toKey(d);
            out.push({ label: k, value: priMap.get(k) || 0, fullDateStr: this.formatFullDate(k) });
            if (secondary) out2.push({ label: k, value: secMap.get(k) || 0, fullDateStr: this.formatFullDate(k) });
        }
        return { normalizedPrimary: out, normalizedSecondary: secondary ? out2 : undefined };
    }

    private buildSmoothedPath(
        points: ChartPoint[],
        baseY: number,
        minY: number
    ): { line: string; area: string } {
        if (points.length === 0) return { line: '', area: '' };
        if (points.length === 1) {
            return { line: `M ${points[0].x},${points[0].y}`, area: '' };
        }

        let path = `M ${points[0].x},${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            if (Math.abs(p1.y - baseY) < 0.5 && Math.abs(p2.y - baseY) < 0.5) {
                path += ` L ${p2.x},${p2.y}`;
                continue;
            }

            const t = 0.3;
            let cp1x = p1.x + (p2.x - p0.x) * t;
            let cp1y = p1.y + (p2.y - p0.y) * t;
            let cp2x = p2.x - (p3.x - p1.x) * t;
            let cp2y = p2.y - (p3.y - p1.y) * t;

            cp1y = Math.min(baseY, Math.max(minY, cp1y));
            cp2y = Math.min(baseY, Math.max(minY, cp2y));

            path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
        }

        const first = points[0];
        const last = points[points.length - 1];
        const area = `${path} L ${last.x},${baseY} L ${first.x},${baseY} Z`;

        return { line: path, area };
    }

    private formatDate(str: string): string {
        try {
            const d = new Date(str);
            if (isNaN(d.getTime())) return str;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch { return str.substring(0, 10); }
    }

    private formatFullDate(str: string): string {
        try {
            const d = new Date(str);
            if (isNaN(d.getTime())) return str;
            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return str; }
    }

    public getElement(): HTMLElement {
        return this.element;
    }
    
    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.drawRaf) {
            cancelAnimationFrame(this.drawRaf);
        }
    }
}
