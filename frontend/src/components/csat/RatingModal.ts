import { RatingMapper } from '../../mappers/RatingMapper';
import { ratingStore } from '../../state/RatingStore';
import { Ticket, TicketRating } from '../../types';
import { escapeHTML } from '../../utils/formatters';
import { TransitionLifecycle } from '../../utils/TransitionLifecycle';
import { showToast } from '../Toast';
import { StarRatingInput } from './StarRatingInput';

export class RatingModal {
    private static instance: RatingModal | null = null;
    private element: HTMLDivElement;
    private currentTicket: Ticket | null = null;
    private starInput: StarRatingInput | null = null;
    private openedTimestamp: number = 0;
    private isSubmitting: boolean = false;
    private onCompleteCallback?: (rating: TicketRating) => void;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'rating-modal';
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');
        this.element.setAttribute('aria-labelledby', 'rating-modal-title');

        this.renderShell();
        this.bindGlobalEvents();
        RatingModal.instance = this;
    }

    public static getInstance(): RatingModal {
        if (!this.instance) {
            this.instance = new RatingModal();
        }
        return this.instance;
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    private renderShell() {
        this.element.innerHTML = `
            <div class="modal glass-card csat-rating-modal">
                <div class="modal-header csat-modal-header">
                    <div class="csat-modal-title-group">
                        <div class="csat-modal-icon-badge" aria-hidden="true">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 id="rating-modal-title" class="csat-modal-title">Rate Support Service</h3>
                            <span class="csat-modal-subtitle">Help us improve by rating your resolution experience</span>
                        </div>
                    </div>
                    <button type="button" class="modal-close csat-modal-close" aria-label="Close survey">&times;</button>
                </div>
                
                <div class="modal-body csat-modal-body" id="rating-modal-body">
                    <!-- Dynamic body injected on open -->
                    <div class="csat-loading-state">
                        <div class="csat-spinner"></div>
                        <span>Checking survey eligibility...</span>
                    </div>
                </div>
            </div>
        `;
    }

    private bindGlobalEvents() {
        this.element.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('modal-overlay') || target.closest('.modal-close') || target.closest('.csat-btn-cancel')) {
                this.close();
            }
        });

        // Close on Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.element.classList.contains('show')) {
                this.close();
            }
        });
    }

    private storeUnsubscribe: (() => void) | null = null;
    private isOpening = false;

    /**
     * Open RatingModal for a specific ticket
     */
    public static async open(ticket: Ticket, onComplete?: (rating: TicketRating) => void): Promise<void> {
        const instance = this.getInstance();
        
        if (instance.isOpening || instance.element.classList.contains('show')) {
            return;
        }
        
        instance.isOpening = true;

        // Ensure modal is in DOM
        if (!document.getElementById('rating-modal')) {
            const root = document.getElementById('modal-root') || document.body;
            root.appendChild(instance.getElement());
        }

        try {
            await instance.show(ticket, onComplete);
        } finally {
            instance.isOpening = false;
        }
    }

    public async show(ticket: Ticket, onComplete?: (rating: TicketRating) => void): Promise<void> {
        this.currentTicket = ticket;
        this.onCompleteCallback = onComplete;
        this.openedTimestamp = Date.now();
        this.isSubmitting = false;

        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
        }
        
        this.storeUnsubscribe = ratingStore.subscribe((event) => {
            if (event.type === 'ELIGIBILITY_CHANGED' && event.ticketId === ticket.id) {
                // If eligibility changed while open (e.g. rated on another tab or expired)
                if (event.eligibility && !event.eligibility.canRate && !this.isSubmitting) {
                    this.renderIneligibleState(event.eligibility.reason, event.eligibility.rating);
                }
            } else if (event.type === 'RATING_SUBMITTED' && event.ticketId === ticket.id && !this.isSubmitting) {
                // Submitted from another tab
                this.renderIneligibleState('ALREADY_RATED', event.rating || null);
            }
        });

        const bodyEl = this.element.querySelector('#rating-modal-body') as HTMLElement;
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="csat-loading-state">
                    <div class="csat-spinner"></div>
                    <span>Checking survey eligibility...</span>
                </div>
            `;
        }

        // Open modal overlay with transition
        TransitionLifecycle.open(this.element, { locksBody: true, timeoutMs: 400 });

        try {
            // Strictly delegate eligibility to RatingStore (backend is single source of truth)
            const eligibility = await ratingStore.getEligibility(ticket.id);

            if (!eligibility.canRate) {
                this.renderIneligibleState(eligibility.reason, eligibility.rating);
                return;
            }

            const vm = RatingMapper.mapToModalViewModel(ticket, eligibility);
            this.renderEligibleState(vm);
        } catch (err: any) {
            this.renderErrorState(err.message || 'Failed to verify survey eligibility');
        }
    }

    private renderIneligibleState(reason: string | null, existingRating: TicketRating | null) {
        const bodyEl = this.element.querySelector('#rating-modal-body') as HTMLElement;
        if (!bodyEl) return;

        if (reason === 'ALREADY_RATED' && existingRating) {
            const summaryVm = RatingMapper.mapToRatingSummary(existingRating);
            bodyEl.innerHTML = `
                <div class="csat-ineligible-container csat-already-rated">
                    <div class="csat-ineligible-icon csat-icon-success">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <h4>Rating Already Submitted</h4>
                    <p class="csat-ineligible-text">Thank you! You have already submitted a rating for this ticket on ${escapeHTML(summaryVm.submittedAtFormatted)}.</p>
                    <div class="csat-existing-rating-preview">
                        <div class="csat-existing-score">${summaryVm.ratingScoreText} (${escapeHTML(summaryVm.sentimentLabel)})</div>
                        ${summaryVm.hasFeedback ? `<p class="csat-existing-comment">"${escapeHTML(summaryVm.feedback!)}"}</p>` : ''}
                    </div>
                    <div class="csat-modal-actions">
                        <button type="button" class="btn btn-primary csat-btn-cancel">Done</button>
                    </div>
                </div>
            `;
            return;
        }

        if (reason === 'SURVEY_EXPIRED') {
            bodyEl.innerHTML = `
                <div class="csat-ineligible-container csat-expired">
                    <div class="csat-ineligible-icon csat-icon-warning">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h4>Survey Window Expired</h4>
                    <p class="csat-ineligible-text">This rating survey has expired. Customer satisfaction surveys must be submitted within 7 days of ticket resolution.</p>
                    <div class="csat-modal-actions">
                        <button type="button" class="btn btn-ghost csat-btn-cancel">Close</button>
                    </div>
                </div>
            `;
            return;
        }

        bodyEl.innerHTML = `
            <div class="csat-ineligible-container">
                <div class="csat-ineligible-icon csat-icon-info">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                </div>
                <h4>Survey Unavailable</h4>
                <p class="csat-ineligible-text">This ticket is not eligible for a customer satisfaction rating at this time.</p>
                <div class="csat-modal-actions">
                    <button type="button" class="btn btn-ghost csat-btn-cancel">Close</button>
                </div>
            </div>
        `;
    }

    private renderErrorState(errorMessage: string) {
        const bodyEl = this.element.querySelector('#rating-modal-body') as HTMLElement;
        if (!bodyEl) return;

        bodyEl.innerHTML = `
            <div class="csat-ineligible-container csat-error">
                <div class="csat-ineligible-icon csat-icon-danger">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                </div>
                <h4>Error Loading Survey</h4>
                <p class="csat-ineligible-text">${escapeHTML(errorMessage)}</p>
                <div class="csat-modal-actions">
                    <button type="button" class="btn btn-ghost csat-btn-cancel">Close</button>
                </div>
            </div>
        `;
    }

    private renderEligibleState(vm: any) {
        const bodyEl = this.element.querySelector('#rating-modal-body') as HTMLElement;
        if (!bodyEl) return;

        bodyEl.innerHTML = `
            <div class="csat-survey-form">
                <!-- Ticket & Resolution Context Header -->
                <div class="csat-ticket-banner">
                    <div class="csat-banner-info">
                        <span class="csat-banner-label">Ticket #${escapeHTML(vm.ticketId.substring(0, 8))}</span>
                        <h4 class="csat-banner-title">${escapeHTML(vm.ticketTitle)}</h4>
                        <div class="csat-banner-meta">
                            <span>Resolved by <strong>${escapeHTML(vm.technicianName)}</strong></span>
                            <span class="csat-meta-divider">•</span>
                            <span class="csat-expiry-pill">${escapeHTML(vm.expiresInText)}</span>
                        </div>
                    </div>
                </div>

                <!-- Interactive Star Selector Container -->
                <div class="csat-selector-wrapper" id="csat-star-selector-container"></div>

                <!-- Optional Feedback Textarea -->
                <div class="form-group csat-feedback-group">
                    <div class="csat-textarea-label-row">
                        <label for="csat-feedback-input" class="csat-form-label">
                            Written Feedback <span class="csat-optional-tag">(Optional)</span>
                        </label>
                        <span class="csat-char-counter" id="csat-char-counter">0 / 1000</span>
                    </div>
                    <textarea id="csat-feedback-input" 
                              class="form-control csat-feedback-textarea" 
                              rows="3" 
                              maxlength="1000"
                              placeholder="What went well? Any suggestions for improvement?"></textarea>
                </div>

                <!-- Submission Error Notice -->
                <div class="csat-submit-error" id="csat-submit-error" style="display: none;"></div>

                <!-- Action Buttons -->
                <div class="modal-actions csat-modal-actions">
                    <button type="button" class="btn btn-ghost csat-btn-cancel" id="csat-btn-cancel">Cancel</button>
                    <button type="button" class="btn btn-primary csat-btn-submit" id="csat-btn-submit" disabled>
                        <span class="csat-btn-text">Submit Rating</span>
                        <div class="csat-btn-spinner" style="display: none;"></div>
                    </button>
                </div>
            </div>
        `;

        // Mount Interactive Star Selector
        const starContainer = bodyEl.querySelector('#csat-star-selector-container') as HTMLElement;
        const submitBtn = bodyEl.querySelector('#csat-btn-submit') as HTMLButtonElement;
        const feedbackInput = bodyEl.querySelector('#csat-feedback-input') as HTMLTextAreaElement;
        const charCounter = bodyEl.querySelector('#csat-char-counter') as HTMLElement;

        this.starInput = new StarRatingInput(starContainer, {
            options: vm.ratingOptions,
            onChange: (val) => {
                if (submitBtn) {
                    submitBtn.disabled = val < 1 || val > 5;
                }
            }
        });

        // Character counter tracking
        if (feedbackInput && charCounter) {
            feedbackInput.addEventListener('input', () => {
                const len = feedbackInput.value.length;
                charCounter.textContent = `${len} / 1000`;
            });
        }

        // Submit action
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    }

    private async handleSubmit() {
        if (this.isSubmitting || !this.currentTicket || !this.starInput) return;

        const ratingVal = this.starInput.getValue();
        if (ratingVal < 1 || ratingVal > 5) {
            this.showSubmitError('Please select a star rating between 1 and 5.');
            return;
        }

        const feedbackInput = this.element.querySelector('#csat-feedback-input') as HTMLTextAreaElement;
        const feedback = feedbackInput ? feedbackInput.value.trim() : undefined;
        const submitBtn = this.element.querySelector('#csat-btn-submit') as HTMLButtonElement;
        const btnText = submitBtn?.querySelector('.csat-btn-text') as HTMLElement;
        const btnSpinner = submitBtn?.querySelector('.csat-btn-spinner') as HTMLElement;
        const cancelBtn = this.element.querySelector('#csat-btn-cancel') as HTMLButtonElement;

        const responseTimeSeconds = Math.max(1, Math.round((Date.now() - this.openedTimestamp) / 1000));

        this.isSubmitting = true;
        if (submitBtn) submitBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
        if (this.starInput) this.starInput.setDisabled(true);
        if (feedbackInput) feedbackInput.disabled = true;
        if (btnText) btnText.textContent = 'Submitting...';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';
        this.hideSubmitError();

        try {
            const ratingRecord = await ratingStore.submitRating({
                ticketId: this.currentTicket.id,
                rating: ratingVal,
                feedback: feedback && feedback.length > 0 ? feedback : undefined,
                responseTimeSeconds,
                submittedFrom: 'web_portal',
                clientVersion: '1.0.0',
                device: navigator.userAgent.substring(0, 100)
            });

            this.renderSuccessState(ratingVal);

            showToast('Thank you for your rating and feedback!', 'success');

            if (this.onCompleteCallback) {
                this.onCompleteCallback(ratingRecord);
            }

            // Smoothly auto-close modal after brief celebration
            window.setTimeout(() => {
                this.close();
            }, 1800);
        } catch (err: any) {
            this.isSubmitting = false;
            if (submitBtn) submitBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            if (this.starInput) this.starInput.setDisabled(false);
            if (feedbackInput) feedbackInput.disabled = false;
            if (btnText) btnText.textContent = 'Submit Rating';
            if (btnSpinner) btnSpinner.style.display = 'none';

            this.showSubmitError(err.message || 'Failed to submit rating. Please try again.');
        }
    }

    private renderSuccessState(score: number) {
        const bodyEl = this.element.querySelector('#rating-modal-body') as HTMLElement;
        if (!bodyEl) return;

        bodyEl.innerHTML = `
            <div class="csat-success-container">
                <div class="csat-success-burst" aria-hidden="true">
                    <svg class="csat-success-checkmark" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <h4 class="csat-success-title">Thank You!</h4>
                <p class="csat-success-subtitle">Your feedback helps us continuously improve our IT support service.</p>
                <div class="csat-success-score-pill">
                    <span>★ ${score} / 5</span>
                </div>
            </div>
        `;
    }

    private showSubmitError(msg: string) {
        const errEl = this.element.querySelector('#csat-submit-error') as HTMLElement;
        if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
        }
    }

    private hideSubmitError() {
        const errEl = this.element.querySelector('#csat-submit-error') as HTMLElement;
        if (errEl) {
            errEl.style.display = 'none';
        }
    }

    public close() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
        TransitionLifecycle.close(this.element);
        this.currentTicket = null;
        this.starInput = null;
        this.isSubmitting = false;
    }
}
