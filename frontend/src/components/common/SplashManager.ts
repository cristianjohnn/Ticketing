export class SplashManager {
    /**
     * Shows the initialization splash screen and locks body scroll.
     */
    static show(): void {
        document.body.style.overflow = 'hidden';
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('active');
        }
    }

    /**
     * Hides the initialization splash screen and restores body scroll.
     */
    static hide(): void {
        document.body.style.overflow = '';
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.remove('active');
        }
    }
}
