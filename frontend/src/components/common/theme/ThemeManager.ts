export type ColorMode = 'light' | 'dark' | 'system';
export type DesignLanguage = 'standard' | 'hexagon-blue' | 'quantum';

export class ThemeManager {
    static readonly COLOR_MODE_KEY = 'ticketing_color_mode';
    static readonly DESIGN_LANGUAGE_KEY = 'ticketing_design_language';
    
    static readonly DEFAULT_COLOR_MODE: ColorMode = 'system';
    static readonly DEFAULT_DESIGN_LANGUAGE: DesignLanguage = 'standard';

    /**
     * Initialize the theme based on session storage or system preference.
     */
    static initialize(): void {
        const savedColorMode = (sessionStorage.getItem(this.COLOR_MODE_KEY) as ColorMode) || this.DEFAULT_COLOR_MODE;
        const savedDesignLanguage = (sessionStorage.getItem(this.DESIGN_LANGUAGE_KEY) as DesignLanguage | null);
        const validatedDesignLanguage = (savedDesignLanguage && (['standard', 'hexagon-blue', 'quantum'] as DesignLanguage[]).includes(savedDesignLanguage)) ? savedDesignLanguage : this.DEFAULT_DESIGN_LANGUAGE;

        this.applyDesignLanguage(validatedDesignLanguage);
        this.applyColorMode(savedColorMode);

        // Listen for system changes if mode is 'system'
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.getColorMode() === 'system') {
                this.applySystemColorMode();
            }
        });
    }

    static setColorMode(mode: ColorMode): void {
        sessionStorage.setItem(this.COLOR_MODE_KEY, mode);
        this.applyColorMode(mode);
        window.dispatchEvent(new CustomEvent('appearanceChanged', { detail: { colorMode: mode, designLanguage: this.getDesignLanguage() } }));
    }

    static setDesignLanguage(language: DesignLanguage): void {
        sessionStorage.setItem(this.DESIGN_LANGUAGE_KEY, language);
        this.applyDesignLanguage(language);
        window.dispatchEvent(new CustomEvent('appearanceChanged', { detail: { colorMode: this.getColorMode(), designLanguage: language } }));
    }

    static getColorMode(): ColorMode {
        return (sessionStorage.getItem(this.COLOR_MODE_KEY) as ColorMode) || this.DEFAULT_COLOR_MODE;
    }

    static getDesignLanguage(): DesignLanguage {
        return (sessionStorage.getItem(this.DESIGN_LANGUAGE_KEY) as DesignLanguage) || this.DEFAULT_DESIGN_LANGUAGE;
    }

    private static applyColorMode(mode: ColorMode): void {
        if (mode === 'system') {
            this.applySystemColorMode();
        } else {
            document.documentElement.setAttribute('data-color-mode', mode);
        }
    }

    private static applySystemColorMode(): void {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-color-mode', isDark ? 'dark' : 'light');
    }

    private static applyDesignLanguage(language: DesignLanguage): void {
        document.documentElement.setAttribute('data-design-language', language);
    }
}
