import { PaletteIcon } from '../Icons';
import { ColorMode, DesignLanguage,ThemeManager } from './ThemeManager';

export class ThemeToggle {
    private element: HTMLDivElement;
    private button: HTMLButtonElement;
    private dropdown: HTMLDivElement;
    private isOpen: boolean = false;
    private instanceId: string;

    constructor(globalMode: boolean = false) {
        this.instanceId = Math.random().toString(36).substring(2, 9);
        this.element = document.createElement('div');
        this.element.className = 'appearance-picker-container' + (globalMode ? ' global-theme-container' : '');
        if (!globalMode) {
            this.element.style.position = 'relative';
        }

        this.button = document.createElement('button');
        this.button.className = 'theme-toggle';
        this.button.innerHTML = `<span class="theme-icon">${PaletteIcon({ size: 20 })}</span>` + (globalMode ? ` <span>Appearance</span>` : '');
        
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'appearance-dropdown';
        // CSS styles have been moved to sidebar.css to allow for fluid CSS animations

        this.renderDropdownContent();

        this.element.appendChild(this.button);
        this.element.appendChild(this.dropdown);

        this.bindEvents();
    }

    private renderDropdownContent() {
        const currentColorMode = ThemeManager.getColorMode();
        const currentDesignLanguage = ThemeManager.getDesignLanguage();
        
        // Use a unique name for this instance to prevent radio groups from clashing across multiple topbars
        const colorName = `colorMode_${this.instanceId}`;
        const designName = `designLanguage_${this.instanceId}`;

        if (this.dropdown.children.length === 0) {
            this.dropdown.innerHTML = `
                <div>
                    <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">Color Mode</div>
                    <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                        <input type="radio" class="custom-radio" name="${colorName}" value="light" ${currentColorMode === 'light' ? 'checked' : ''}> Light
                    </label>
                    <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                        <input type="radio" class="custom-radio" name="${colorName}" value="dark" ${currentColorMode === 'dark' ? 'checked' : ''}> Dark
                    </label>
                    <label style="display: flex; gap: 8px; align-items: center; cursor: pointer;">
                        <input type="radio" class="custom-radio" name="${colorName}" value="system" ${currentColorMode === 'system' ? 'checked' : ''}> System
                    </label>
                </div>
                <div style="height: 1px; background: var(--color-border); width: 100%;"></div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">Design Language</div>
                    <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                        <input type="radio" class="custom-radio" name="${designName}" value="standard" ${currentDesignLanguage === 'standard' ? 'checked' : ''}> Standard (Clean)
                    </label>
                    <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                        <input type="radio" class="custom-radio" name="${designName}" value="hexagon-blue" ${currentDesignLanguage === 'hexagon-blue' ? 'checked' : ''}> Hexagon Blue
                    </label>
                    <label style="display: flex; gap: 8px; align-items: center; cursor: pointer;">
                        <input type="radio" class="custom-radio" name="${designName}" value="quantum" ${currentDesignLanguage === 'quantum' ? 'checked' : ''}> Quantum Flux
                    </label>
                </div>
            `;

            this.dropdown.querySelectorAll(`input[name="${colorName}"]`).forEach(input => {
                input.addEventListener('change', (e) => {
                    ThemeManager.setColorMode((e.target as HTMLInputElement).value as ColorMode);
                });
            });

            this.dropdown.querySelectorAll(`input[name="${designName}"]`).forEach(input => {
                input.addEventListener('change', (e) => {
                    ThemeManager.setDesignLanguage((e.target as HTMLInputElement).value as DesignLanguage);
                });
            });
        } else {
            const colorInput = this.dropdown.querySelector(`input[name="${colorName}"][value="${currentColorMode}"]`) as HTMLInputElement;
            if (colorInput) colorInput.checked = true;

            const designInput = this.dropdown.querySelector(`input[name="${designName}"][value="${currentDesignLanguage}"]`) as HTMLInputElement;
            if (designInput) designInput.checked = true;
        }
    }

    private bindEvents(): void {
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('close-dropdowns', { detail: { except: 'theme' } }));
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                this.dropdown.classList.add('open');
            } else {
                this.dropdown.classList.remove('open');
            }
        });

        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.element.contains(e.target as Node)) {
                this.isOpen = false;
                this.dropdown.classList.remove('open');
            }
        });
        
        document.addEventListener('close-dropdowns', ((e: CustomEvent) => {
            if (e.detail?.except !== 'theme') {
                this.isOpen = false;
                this.dropdown.classList.remove('open');
            }
        }) as EventListener);

        window.addEventListener('appearanceChanged', (() => {
            this.renderDropdownContent();
        }) as EventListener);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
