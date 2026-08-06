import { RatingModal } from './RatingModal';
import { Ticket } from '../../types';

export class CSATPromptCard {
    public static render(ticket: Ticket): HTMLElement {
        const container = document.createElement('div');
        container.className = 'csat-prompt-card';
        
        container.innerHTML = `
            <div class="csat-prompt-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
            </div>
            <div class="csat-prompt-content">
                <h4>How did we do?</h4>
                <p>This ticket has been resolved. Please take a moment to rate your support experience.</p>
            </div>
            <div class="csat-prompt-action">
                <button type="button" class="csat-btn csat-btn-primary csat-rate-btn">Rate Experience</button>
            </div>
        `;

        const btn = container.querySelector('.csat-rate-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                RatingModal.open(ticket);
            });
        }

        return container;
    }
}
