export class CSATExpiredBanner {
    public static render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'csat-expired-banner';
        
        container.innerHTML = `
            <div class="csat-expired-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            </div>
            <div class="csat-expired-content">
                <p>The feedback window for this ticket has closed.</p>
            </div>
        `;

        return container;
    }
}
