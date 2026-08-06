export type TransitionState = 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING';

export interface TransitionOptions {
    locksBody?: boolean;
    onCleanup?: () => void;
    // Fallback timeout slightly longer than our slowest transition (e.g. var(--duration-slow) is 300ms)
    timeoutMs?: number; 
}

class TransitionController {
    private activeLockCount = 0;

    // Track active timeouts to prevent leaks
    private activeTimeouts: WeakMap<HTMLElement, number> = new WeakMap();
    private activeListeners: WeakMap<HTMLElement, (e: TransitionEvent) => void> = new WeakMap();

    /**
     * Orchestrates the opening animation lifecycle for an element.
     */
    public open(element: HTMLElement, options: TransitionOptions = {}) {
        this.cancelCleanup(element);

        // Manage body lock globally
        if (options.locksBody) {
            // Need a way to ensure we only increment lock ONCE per element if open is called repeatedly
            if (!element.hasAttribute('data-body-locked')) {
                element.setAttribute('data-body-locked', 'true');
                this.activeLockCount++;
                this.updateBodyLock();
            }
        }

        element.classList.remove('is-closing');
        element.classList.add('show', 'is-opening');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // If it was closed immediately after opening, don't proceed to OPEN
                if (element.classList.contains('is-closing')) return;
                
                element.classList.remove('is-opening');
                element.classList.add('is-open');
            });
        });
    }

    /**
     * Orchestrates the closing animation lifecycle for an element, ensuring cleanup.
     */
    public close(element: HTMLElement, options: TransitionOptions = {}) {
        this.cancelCleanup(element);

        // If it's already closed or closing, ignore
        if (!element.classList.contains('show') || element.classList.contains('is-closing')) {
            return;
        }

        element.classList.add('is-closing');
        element.classList.remove('is-open', 'is-opening');

        const cleanup = () => {
            this.cancelCleanup(element);
            
            element.classList.remove('show', 'is-closing', 'is-opening', 'is-open');
            
            if (element.hasAttribute('data-body-locked')) {
                element.removeAttribute('data-body-locked');
                this.activeLockCount = Math.max(0, this.activeLockCount - 1);
                this.updateBodyLock();
            }

            if (options.onCleanup) {
                options.onCleanup();
            }
        };

        const timeoutMs = options.timeoutMs || 400; // 400ms is safe for 300ms transitions
        
        // 1. Timeout Fallback
        const timeoutId = window.setTimeout(cleanup, timeoutMs);
        this.activeTimeouts.set(element, timeoutId);

        // 2. TransitionEnd Listener
        const handleTransitionEnd = (e: TransitionEvent) => {
            if (e.target === element) {
                cleanup();
            }
        };
        element.addEventListener('transitionend', handleTransitionEnd);
        this.activeListeners.set(element, handleTransitionEnd);
    }

    /**
     * Cancels any pending cleanup timeouts or listeners.
     */
    private cancelCleanup(element: HTMLElement) {
        if (this.activeTimeouts.has(element)) {
            window.clearTimeout(this.activeTimeouts.get(element)!);
            this.activeTimeouts.delete(element);
        }
        
        if (this.activeListeners.has(element)) {
            element.removeEventListener('transitionend', this.activeListeners.get(element)!);
            this.activeListeners.delete(element);
        }
    }

    /**
     * Synchronizes document body overflow state with active overlay count.
     */
    private updateBodyLock() {
        if (this.activeLockCount > 0) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

export const TransitionLifecycle = new TransitionController();
