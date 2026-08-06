export interface LoadingConfig {
    skeletonDelay: number;
    minimumSkeletonDisplay: number;
    longLoadThreshold: number;
}

export class LoadingManager {
    private static config: LoadingConfig = {
        skeletonDelay: 150,
        minimumSkeletonDisplay: 250,
        longLoadThreshold: 500
    };

    private static skeletonTimers = new Map<HTMLElement, number>();
    private static skeletonDisplayTimes = new Map<HTMLElement, number>();
    private static registry = new Map<string, () => string>();

    /**
     * Configure loading behavior thresholds.
     */
    public static configure(config: Partial<LoadingConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Register a page-specific skeleton layout.
     */
    public static registerSkeleton(type: string, generator: () => string): void {
        this.registry.set(type, generator);
    }

    /**
     * Initializes the bootstrap splash screen.
     */
    public static showSplash(): void {
        document.body.style.overflow = 'hidden';
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('active');
    }

    /**
     * Hides the bootstrap splash screen smoothly.
     */
    public static hideSplash(): void {
        document.body.style.overflow = '';
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.remove('active');
    }

    /**
     * Toggles a loading spinner state on a button.
     * @param button The HTMLButtonElement to toggle.
     * @param isLoading True to enable loading state, false to disable.
     */
    public static setButtonLoading(button: HTMLButtonElement | null, isLoading: boolean): void {
        if (!button) return;
        if (isLoading) {
            button.classList.add('is-loading');
            button.disabled = true;
        } else {
            button.classList.remove('is-loading');
            button.disabled = false;
        }
    }

    /**
     * Displays a skeleton placeholder in the given container after a short delay.
     * Prevents flashing for extremely fast requests.
     * @param container The container to inject the skeleton into.
     * @param type The structural type of the skeleton registered in the registry.
     */
    public static showSkeleton(container: HTMLElement | null, type: string): void {
        if (!container) return;
        
        // Clear any pending timers for this container
        if (this.skeletonTimers.has(container)) {
            clearTimeout(this.skeletonTimers.get(container));
        }

        const timer = window.setTimeout(() => {
            const html = this.registry.has(type) ? this.registry.get(type)!() : '<div class="skeleton" style="height: 200px; width: 100%;"></div>';
            container.innerHTML = html;
            this.skeletonDisplayTimes.set(container, Date.now());
            this.skeletonTimers.delete(container);
            
            // For requests taking longer than longLoadThreshold, we could add a message here
            // e.g. updating a specific DOM node inside the skeleton if it exists.
        }, this.config.skeletonDelay);

        this.skeletonTimers.set(container, timer);
    }

    /**
     * Cancels any pending skeleton renders for the container.
     * If the skeleton was displayed, resolves a promise after ensuring the minimum display time is met.
     */
    public static async hideSkeleton(container: HTMLElement | null): Promise<void> {
        if (!container) return;
        
        if (this.skeletonTimers.has(container)) {
            // Skeleton hasn't rendered yet (request finished before skeletonDelay)
            clearTimeout(this.skeletonTimers.get(container));
            this.skeletonTimers.delete(container);
            return;
        }

        const displayedAt = this.skeletonDisplayTimes.get(container);
        if (displayedAt) {
            const timeElapsed = Date.now() - displayedAt;
            const remainingTime = this.config.minimumSkeletonDisplay - timeElapsed;
            
            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }
            this.skeletonDisplayTimes.delete(container);
        }
        
        // Note: We no longer clear container.innerHTML here, it will be overwritten by the true cross-fade wrapper or the caller.
    }

    /**
     * Shows a global blocking overlay.
     */
    public static showOverlay(): void {
        let overlay = document.getElementById('global-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-overlay';
            overlay.className = 'global-overlay';
            overlay.innerHTML = '<div class="global-spinner"></div>';
            document.body.appendChild(overlay);
        }
        // Force reflow
        void overlay.offsetWidth;
        overlay.classList.add('active');
    }

    /**
     * Hides the global blocking overlay.
     */
    public static hideOverlay(): void {
        const overlay = document.getElementById('global-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
}
