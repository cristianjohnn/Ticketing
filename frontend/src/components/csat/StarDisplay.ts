export type StarDisplaySize = 'sm' | 'md' | 'lg' | 'xl';

export interface StarDisplayOptions {
    rating: number; // 0 to 5 (e.g. 4.5)
    maxStars?: number; // default 5
    size?: StarDisplaySize; // default 'md'
    showNumeric?: boolean; // default false
    className?: string;
    ariaLabel?: string;
}

const SIZE_MAP: Record<StarDisplaySize, { starSize: number; gap: number; fontSize: string }> = {
    sm: { starSize: 14, gap: 3, fontSize: '0.75rem' },
    md: { starSize: 18, gap: 4, fontSize: '0.875rem' },
    lg: { starSize: 24, gap: 6, fontSize: '1rem' },
    xl: { starSize: 32, gap: 8, fontSize: '1.25rem' }
};

export class StarDisplay {
    /**
     * Render SVG star path
     */
    private static renderStarSvg(fillPercent: number, starSize: number, uniqueId: string): string {
        const pathData = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
        
        if (fillPercent >= 100) {
            return `
                <svg class="csat-star csat-star-full" width="${starSize}" height="${starSize}" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="${pathData}"/>
                </svg>
            `;
        }

        if (fillPercent <= 0) {
            return `
                <svg class="csat-star csat-star-empty" width="${starSize}" height="${starSize}" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="${pathData}"/>
                </svg>
            `;
        }

        // Fractional Star with linearGradient
        const gradId = `star-grad-${uniqueId}-${Math.round(fillPercent)}`;
        return `
            <svg class="csat-star csat-star-partial" width="${starSize}" height="${starSize}" viewBox="0 0 24 24" aria-hidden="true">
                <defs>
                    <linearGradient id="${gradId}">
                        <stop offset="${fillPercent}%" stop-color="var(--csat-star-filled, #f59e0b)"/>
                        <stop offset="${fillPercent}%" stop-color="var(--csat-star-empty, rgba(148, 163, 184, 0.25))"/>
                    </linearGradient>
                </defs>
                <path fill="url(#${gradId})" d="${pathData}"/>
            </svg>
        `;
    }

    /**
     * Render pure read-only StarDisplay HTML
     */
    public static render(options: StarDisplayOptions): string {
        const {
            rating = 0,
            maxStars = 5,
            size = 'md',
            showNumeric = false,
            className = '',
            ariaLabel
        } = options;

        const clampedRating = Math.max(0, Math.min(maxStars, rating));
        const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
        const uniquePrefix = Math.random().toString(36).substring(2, 8);

        const starsHtml: string[] = [];
        for (let i = 1; i <= maxStars; i++) {
            let fillPercent = 0;
            if (clampedRating >= i) {
                fillPercent = 100;
            } else if (clampedRating > i - 1) {
                fillPercent = Math.round((clampedRating - (i - 1)) * 100);
            }
            starsHtml.push(this.renderStarSvg(fillPercent, sizeConfig.starSize, `${uniquePrefix}-${i}`));
        }

        const label = ariaLabel || `Rating: ${clampedRating.toFixed(1)} out of ${maxStars} stars`;

        return `
            <div class="csat-star-display csat-star-display-${size} ${className}" 
                 role="img" 
                 aria-label="${label}"
                 style="--star-gap: ${sizeConfig.gap}px; --star-font-size: ${sizeConfig.fontSize};">
                <div class="csat-star-track">
                    ${starsHtml.join('')}
                </div>
                ${showNumeric ? `<span class="csat-star-numeric">${clampedRating.toFixed(1)}</span>` : ''}
            </div>
        `;
    }
}
