export class TransitionManager {
    /**
     * Executes a callback and performs a true cross-fade between the old and new content.
     * Uses View Transitions API if available, with a manual DOM cross-fade fallback.
     */
    public static async crossFadeContent(container: HTMLElement, updateCallback: () => void | Promise<void>): Promise<void> {
        if (typeof (document as any).startViewTransition === 'function') {
            const transition = (document as any).startViewTransition(async () => {
                await updateCallback();
            });
            await transition.finished;
            return;
        }

        // Manual cross-fade fallback
        // 1. Create a ghost of the old content
        const oldGhost = document.createElement('div');
        oldGhost.innerHTML = container.innerHTML;
        oldGhost.style.position = 'absolute';
        oldGhost.style.top = 'var(--space-lg)';
        oldGhost.style.left = 'var(--space-lg)';
        oldGhost.style.right = 'var(--space-lg)';
        oldGhost.style.bottom = 'var(--space-lg)';
        oldGhost.style.transition = 'opacity var(--duration-normal) var(--ease-out)';
        oldGhost.style.pointerEvents = 'none';
        oldGhost.style.boxSizing = 'border-box';

        const originalPosition = container.style.position;
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        // 2. Execute update (mutates container)
        await updateCallback();

        // 3. Wrap new content
        const newWrapper = document.createElement('div');
        newWrapper.style.position = 'relative';
        newWrapper.style.width = '100%';
        newWrapper.style.height = '100%';
        newWrapper.style.opacity = '0';
        newWrapper.style.transition = 'opacity var(--duration-normal) var(--ease-out)';
        
        while (container.firstChild) {
            newWrapper.appendChild(container.firstChild);
        }

        container.appendChild(newWrapper);
        container.appendChild(oldGhost);

        // 4. Animate
        void container.offsetWidth; // Force reflow
        oldGhost.style.opacity = '0';
        newWrapper.style.opacity = '1';

        await new Promise(resolve => setTimeout(resolve, 250));

        // 5. Cleanup
        oldGhost.remove();
        while (newWrapper.firstChild) {
            container.appendChild(newWrapper.firstChild);
        }
        newWrapper.remove();
        container.style.position = originalPosition;
    }
}
