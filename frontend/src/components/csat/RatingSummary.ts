import { RatingMapper } from '../../mappers/RatingMapper';
import { TicketRating } from '../../types';
import { escapeHTML } from '../../utils/formatters';
import { RatingSummaryViewModel } from '../../viewmodels/rating.viewmodels';
import { StarDisplay } from './StarDisplay';

export type RatingSummaryVariant = 'full' | 'compact' | 'inline';

export interface RatingSummaryOptions {
    rating: TicketRating | RatingSummaryViewModel;
    variant?: RatingSummaryVariant;
    showAttribution?: boolean;
    className?: string;
}

export class RatingSummary {
    /**
     * Render RatingSummary component HTML
     */
    public static render(options: RatingSummaryOptions): string {
        const {
            rating,
            variant = 'full',
            showAttribution = true,
            className = ''
        } = options;

        // Ensure we have a ViewModel
        const vm: RatingSummaryViewModel = 'sentiment' in rating 
            ? rating 
            : RatingMapper.mapToRatingSummary(rating);

        if (variant === 'inline') {
            return this.renderInline(vm, className);
        }

        if (variant === 'compact') {
            return this.renderCompact(vm, showAttribution, className);
        }

        return this.renderFull(vm, showAttribution, className);
    }

    private static renderInline(vm: RatingSummaryViewModel, className: string): string {
        const starHtml = StarDisplay.render({ rating: vm.rating, size: 'sm' });
        return `
            <div class="csat-summary-inline ${className}">
                ${starHtml}
                <span class="csat-badge ${vm.badgeClass}">${escapeHTML(vm.sentimentLabel)}</span>
            </div>
        `;
    }

    private static renderCompact(vm: RatingSummaryViewModel, showAttribution: boolean, className: string): string {
        const starHtml = StarDisplay.render({ rating: vm.rating, size: 'md', showNumeric: true });
        
        return `
            <div class="csat-summary-card csat-summary-compact ${className}">
                <div class="csat-summary-header">
                    <div class="csat-summary-stars-wrapper">
                        ${starHtml}
                    </div>
                    <span class="csat-badge ${vm.badgeClass}">${escapeHTML(vm.sentimentLabel)}</span>
                </div>
                ${vm.hasFeedback ? `
                    <div class="csat-summary-feedback-preview">
                        <p class="csat-feedback-text">"${escapeHTML(vm.feedback!)}"}</p>
                    </div>
                ` : ''}
                ${showAttribution ? `
                    <div class="csat-summary-meta">
                        <span class="csat-meta-item">${escapeHTML(vm.clientName)}</span>
                        <span class="csat-meta-divider">•</span>
                        <span class="csat-meta-item">${escapeHTML(vm.submittedAtRelative)}</span>
                        <span class="csat-meta-divider">•</span>
                        <span class="csat-meta-item">Supported by ${escapeHTML(vm.technicianName)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private static renderFull(vm: RatingSummaryViewModel, showAttribution: boolean, className: string): string {
        const starHtml = StarDisplay.render({ rating: vm.rating, size: 'lg', showNumeric: false });

        return `
            <div class="csat-summary-card csat-summary-full ${className}">
                <div class="csat-summary-header">
                    <div class="csat-summary-score-group">
                        <div class="csat-score-numeric">${vm.rating}</div>
                        <div class="csat-score-stars">
                            ${starHtml}
                            <span class="csat-score-label">${escapeHTML(vm.sentimentLabel)} Experience</span>
                        </div>
                    </div>
                    <span class="csat-badge ${vm.badgeClass}">${escapeHTML(vm.ratingScoreText)}</span>
                </div>

                ${vm.hasFeedback ? `
                    <div class="csat-summary-feedback">
                        <div class="csat-feedback-quote-icon" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                            </svg>
                        </div>
                        <blockquote class="csat-feedback-blockquote">
                            <p>${escapeHTML(vm.feedback!)}</p>
                        </blockquote>
                    </div>
                ` : `
                    <div class="csat-summary-no-feedback">
                        <span>No written feedback provided.</span>
                    </div>
                `}

                ${showAttribution ? `
                    <div class="csat-summary-footer">
                        <div class="csat-attribution-user">
                            <div class="csat-avatar-initials" aria-hidden="true">${escapeHTML(vm.clientInitials)}</div>
                            <div class="csat-attribution-details">
                                <span class="csat-attribution-name">${escapeHTML(vm.clientName)}</span>
                                <span class="csat-attribution-date">${escapeHTML(vm.submittedAtFormatted)} (${escapeHTML(vm.submittedAtRelative)})</span>
                            </div>
                        </div>
                        <div class="csat-attribution-tech">
                            <span class="csat-meta-item">Supported by ${escapeHTML(vm.technicianName)}</span>
                        </div>
                        ${vm.responseTimeFormatted ? `
                            <div class="csat-response-time-badge" title="Survey completed in ${escapeHTML(vm.responseTimeFormatted)}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>${escapeHTML(vm.responseTimeFormatted)}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
}
