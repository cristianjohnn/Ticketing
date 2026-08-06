export interface StarRatingOption {
    value: number;
    label: string;
    description: string;
}

export interface StarRatingInputOptions {
    name?: string;
    initialValue?: number;
    options?: StarRatingOption[];
    disabled?: boolean;
    onChange?: (value: number) => void;
}

const DEFAULT_OPTIONS: StarRatingOption[] = [
    { value: 1, label: 'Very Poor', description: 'Significant issues, unsatisfied with resolution' },
    { value: 2, label: 'Poor', description: 'Below expectations, unresolved concerns' },
    { value: 3, label: 'Average', description: 'Acceptable service, standard resolution' },
    { value: 4, label: 'Good', description: 'Met expectations, helpful support' },
    { value: 5, label: 'Excellent', description: 'Exceptional service and quick resolution' }
];

export class StarRatingInput {
    private element: HTMLElement;
    private currentValue: number;
    private hoverValue: number = 0;
    private options: StarRatingOption[];
    private disabled: boolean;
    private onChangeCallback?: (value: number) => void;
    private labelEl!: HTMLElement;
    private starButtons: HTMLButtonElement[] = [];

    constructor(container: HTMLElement | string, options: StarRatingInputOptions = {}) {
        this.element = typeof container === 'string' 
            ? (document.querySelector(container) as HTMLElement) 
            : container;

        if (!this.element) {
            throw new Error(`[StarRatingInput] Target container element not found`);
        }

        this.currentValue = options.initialValue || 0;
        this.options = options.options || DEFAULT_OPTIONS;
        this.disabled = !!options.disabled;
        this.onChangeCallback = options.onChange;

        this.render();
        this.bindEvents();
    }

    private render() {
        this.element.innerHTML = `
            <div class="csat-rating-input ${this.disabled ? 'csat-disabled' : ''}" 
                 role="radiogroup" 
                 aria-label="Rate your service experience from 1 to 5 stars"
                 tabindex="${this.disabled ? -1 : 0}">
                <div class="csat-stars-container">
                    ${this.options.map(opt => `
                        <button type="button" 
                                class="csat-star-btn" 
                                data-value="${opt.value}"
                                role="radio"
                                aria-checked="${this.currentValue === opt.value}"
                                aria-label="${opt.value} star - ${opt.label}: ${opt.description}"
                                tabindex="-1"
                                ${this.disabled ? 'disabled' : ''}>
                            <svg class="csat-interactive-star" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                        </button>
                    `).join('')}
                </div>
                <div class="csat-input-status">
                    <span class="csat-input-label-text">Select your rating</span>
                    <span class="csat-input-desc-text">Click or use arrow keys (1-5) to rate</span>
                </div>
            </div>
        `;

        this.labelEl = this.element.querySelector('.csat-input-label-text') as HTMLElement;
        this.starButtons = Array.from(this.element.querySelectorAll('.csat-star-btn'));
        this.updateVisuals();
    }

    private bindEvents() {
        const container = this.element.querySelector('.csat-rating-input') as HTMLElement;
        if (!container || this.disabled) return;

        // Hover handling on stars
        this.starButtons.forEach(btn => {
            const val = parseInt(btn.getAttribute('data-value') || '0', 10);

            btn.addEventListener('mouseenter', () => {
                this.hoverValue = val;
                this.updateVisuals();
            });

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setValue(val);
                container.focus();
            });
        });

        // Mouse leave from stars container
        const starsContainer = this.element.querySelector('.csat-stars-container') as HTMLElement;
        if (starsContainer) {
            starsContainer.addEventListener('mouseleave', () => {
                this.hoverValue = 0;
                this.updateVisuals();
            });
        }

        // Keyboard navigation on radiogroup container
        container.addEventListener('keydown', (e: KeyboardEvent) => {
            if (this.disabled) return;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowUp':
                    e.preventDefault();
                    this.setValue(Math.min(5, Math.max(1, (this.currentValue || 0) + 1)));
                    break;
                case 'ArrowLeft':
                case 'ArrowDown':
                    e.preventDefault();
                    this.setValue(Math.max(1, (this.currentValue || 2) - 1));
                    break;
                case 'Home':
                    e.preventDefault();
                    this.setValue(1);
                    break;
                case 'End':
                    e.preventDefault();
                    this.setValue(5);
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    e.preventDefault();
                    this.setValue(parseInt(e.key, 10));
                    break;
            }
        });
    }

    private updateVisuals() {
        const activeScore = this.hoverValue > 0 ? this.hoverValue : this.currentValue;
        const activeOption = this.options.find(o => o.value === activeScore);

        this.starButtons.forEach(btn => {
            const val = parseInt(btn.getAttribute('data-value') || '0', 10);
            const isFilled = val <= activeScore;
            const isSelected = val === this.currentValue;
            const isHovered = val === this.hoverValue;

            btn.classList.toggle('csat-filled', isFilled);
            btn.classList.toggle('csat-selected', isSelected);
            btn.classList.toggle('csat-hovered', isHovered);
            btn.setAttribute('aria-checked', isSelected.toString());
        });

        const statusEl = this.element.querySelector('.csat-input-status') as HTMLElement;
        const descEl = this.element.querySelector('.csat-input-desc-text') as HTMLElement;

        if (activeOption) {
            this.labelEl.textContent = `${activeOption.value} — ${activeOption.label}`;
            this.labelEl.setAttribute('data-rating', String(activeOption.value));
            if (descEl) descEl.textContent = activeOption.description;
            if (statusEl) statusEl.classList.add('csat-status-selected');
        } else {
            this.labelEl.textContent = 'Select your rating';
            this.labelEl.removeAttribute('data-rating');
            if (descEl) descEl.textContent = 'Click or use arrow keys (1-5) to rate';
            if (statusEl) statusEl.classList.remove('csat-status-selected');
        }
    }

    public setValue(val: number) {
        if (this.disabled) return;
        const clamped = Math.max(1, Math.min(5, val));
        if (this.currentValue !== clamped) {
            this.currentValue = clamped;
            this.hoverValue = 0;
            this.updateVisuals();
            if (this.onChangeCallback) {
                this.onChangeCallback(this.currentValue);
            }
        }
    }

    public getValue(): number {
        return this.currentValue;
    }

    public setDisabled(disabled: boolean) {
        this.disabled = disabled;
        const container = this.element.querySelector('.csat-rating-input');
        if (container) {
            container.classList.toggle('csat-disabled', disabled);
            container.setAttribute('tabindex', disabled ? '-1' : '0');
        }
        this.starButtons.forEach(btn => {
            if (disabled) {
                btn.setAttribute('disabled', 'true');
            } else {
                btn.removeAttribute('disabled');
            }
        });
    }

    public reset() {
        this.currentValue = 0;
        this.hoverValue = 0;
        this.updateVisuals();
    }
}
