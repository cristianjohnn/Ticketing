import { DesignLanguage,ThemeManager } from '../common/theme/ThemeManager';
import { HexagonBackground } from './HexagonBackground';
import { QuantumBackground } from './QuantumBackground';

export class BackgroundRenderer {
    private static initialized = false;

    public static init(): void {
        if (this.initialized) return;
        this.initialized = true;

        HexagonBackground.init();
        QuantumBackground.init();

        this.updateBackgroundVisibility(ThemeManager.getDesignLanguage());

        window.addEventListener('appearanceChanged', ((e: CustomEvent) => {
            this.updateBackgroundVisibility(e.detail.designLanguage);
        }) as EventListener);
    }



    private static hexTimeout: number | null = null;
    private static quantumTimeout: number | null = null;

    private static updateBackgroundVisibility(designLanguage: DesignLanguage): void {
        const hexCanvas = document.getElementById('hex-bg-global');
        const isHex = designLanguage === 'hexagon-blue';
        
        if (isHex) {
            if (this.hexTimeout) { clearTimeout(this.hexTimeout); this.hexTimeout = null; }
            HexagonBackground.setVisible(true);
            if (hexCanvas) {
                hexCanvas.style.opacity = '1';
                hexCanvas.style.transition = 'opacity 0.6s ease';
            }
        } else {
            if (hexCanvas) {
                hexCanvas.style.opacity = '0';
                hexCanvas.style.transition = 'opacity 0.6s ease';
            }
            if (this.hexTimeout) clearTimeout(this.hexTimeout);
            this.hexTimeout = window.setTimeout(() => HexagonBackground.setVisible(false), 600);
        }

        const quantumCanvas = document.getElementById('quantum-bg-global');
        const isQuantum = designLanguage === 'quantum';
        
        if (isQuantum) {
            if (this.quantumTimeout) { clearTimeout(this.quantumTimeout); this.quantumTimeout = null; }
            QuantumBackground.setVisible(true);
            if (quantumCanvas) quantumCanvas.style.opacity = '1';
        } else {
            if (quantumCanvas) quantumCanvas.style.opacity = '0';
            if (this.quantumTimeout) clearTimeout(this.quantumTimeout);
            this.quantumTimeout = window.setTimeout(() => QuantumBackground.setVisible(false), 600);
        }
    }
}
