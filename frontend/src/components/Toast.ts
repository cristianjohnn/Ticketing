import { TransitionLifecycle } from '../utils/TransitionLifecycle';

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const getIconSvg = () => {
        if (type === 'success') {
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
        if (type === 'error') {
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        }
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    };

    toast.innerHTML = `
        <span class="toast-icon" style="display: flex; align-items: center; justify-content: center;">${getIconSvg()}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    
    // Begin opening lifecycle
    TransitionLifecycle.open(toast, { timeoutMs: 400 });

    setTimeout(() => {
        // Begin closing lifecycle, and physically remove DOM node when done
        TransitionLifecycle.close(toast, { 
            timeoutMs: 400,
            onCleanup: () => toast.remove() 
        });
    }, 4000);
}
