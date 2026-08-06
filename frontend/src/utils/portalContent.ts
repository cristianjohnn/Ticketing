import { LayoutManager } from '../layouts/LayoutManager';
import { createElement } from './dom';

export function getPortalContentContainer(role: string): HTMLElement | null {
    if (role === 'admin') {
        if (LayoutManager.admin) {
            return LayoutManager.admin.getContentArea();
        }
        return document.getElementById('admin-content');
    } else if (role === 'it-support') {
        if (LayoutManager.support) {
            return LayoutManager.support.getContentArea();
        }
        return document.getElementById('support-content');
    } else {
        if (LayoutManager.client) {
            return LayoutManager.client.getContentArea();
        }
        return document.getElementById('client-content');
    }
}

function clearPortalContent(role: string): HTMLElement | null {
    const container = getPortalContentContainer(role);
    if (container) {
        container.innerHTML = '';
    }
    return container;
}

export function renderPlaceholder(role: string, message: string): void {
    const container = clearPortalContent(role);
    if (!container) return;

    const iconSvg = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

    const stateDiv = createElement('div', { className: 'empty-state' });
    
    const iconDiv = createElement('div', { className: 'empty-icon', innerHTML: iconSvg });
    const textP = createElement('p', { textContent: message });
    
    stateDiv.appendChild(iconDiv);
    stateDiv.appendChild(textP);
    
    container.appendChild(stateDiv);
}
