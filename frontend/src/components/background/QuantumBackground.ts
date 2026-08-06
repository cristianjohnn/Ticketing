/**
 * Quantum Flux Background — Smoke-in-Water Filaments
 *
 * Visual reference: thin luminous threads that flow horizontally like
 * smoke dissolving in water. Volume comes from layered blur strokes,
 * not from thick line widths. Filaments branch and split as they
 * travel, creating an organic loom-like texture.
 *
 * Color palette:
 *   Primary   #FFBF00  (amber/gold)
 *   Secondary #FF003C  (magenta/crimson)
 *   Tertiary  #1A1A1A  (carbon grey, used as subtle warm dark)
 *   Neutral   #000000  (the void)
 */

export class QuantumBackground {
    private static initialized = false;
    public static isActive = false;
    private static animationFrameId = 0;
    private static loopFn: (now: number) => void;

    public static setVisible(visible: boolean) {
        this.isActive = visible;
        if (visible && this.initialized) {
            this.animationFrameId = requestAnimationFrame(this.loopFn);
        } else if (!visible && this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    public static init(): void {
        if (this.initialized) return;
        this.initialized = true;

        const canvas = document.createElement('canvas');
        canvas.id = 'quantum-bg-global';
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '-1',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.6s ease'
        });
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let w: number, h: number;
        let lastFrame = performance.now();
        const FPS_CAP = 30;
        const frameInterval = 1000 / FPS_CAP;

        // Parallax
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let currentOffsetX = 0;
        let currentOffsetY = 0;

        document.addEventListener('mousemove', (e) => {
            const dx = (e.clientX / window.innerWidth - 0.5) * 30;
            const dy = (e.clientY / window.innerHeight - 0.5) * 15;
            targetOffsetX = -dx;
            targetOffsetY = -dy;
        });

        // Light/dark mode interpolation
        const getComputedLight = () => {
            const mode = document.documentElement.getAttribute('data-color-mode');
            if (mode === 'system') return window.matchMedia('(prefers-color-scheme: light)').matches ? 1.0 : 0.0;
            return mode === 'light' ? 1.0 : 0.0;
        };
        let themeProgress = getComputedLight();
        let lastThemeTime = performance.now();

        // ─── Filament data structures ───

        interface ControlPoint {
            x: number;
            y: number;
        }

        // Diagonal flow angle: ~30° from horizontal (bottom-left → top-right)
        const FLOW_ANGLE = -Math.PI / 6; // -30°
        const FLOW_DX = Math.cos(FLOW_ANGLE);
        const FLOW_DY = Math.sin(FLOW_ANGLE);
        // Perpendicular direction for oscillation
        const PERP_DX = -FLOW_DY;
        const PERP_DY = FLOW_DX;

        interface Filament {
            /** Pre-computed smooth path points */
            points: ControlPoint[];
            /** RGB string, e.g. "255, 191, 0" */
            color: string;
            /** Core line width (very thin, 0.3–1.5px) */
            coreWidth: number;
            /** Opacity multiplier 0–1 */
            opacity: number;
            /** Drift speed along the diagonal (px/s) — slow */
            driftSpeed: number;
            /** Current offset along the diagonal from drift */
            driftOffset: number;
            /** Oscillation amplitude (perpendicular to flow) */
            oscAmplitude: number;
            /** Oscillation frequency */
            oscFreq: number;
            /** Phase offset for oscillation */
            oscPhase: number;
            /** Secondary oscillation for organic feel */
            oscFreq2: number;
            oscPhase2: number;
            oscAmplitude2: number;
        }

        // Palette — weighted towards amber with occasional magenta accents
        const PALETTE = [
            { rgb: '255, 191, 0',   weight: 5 },  // Amber primary
            { rgb: '255, 210, 60',  weight: 3 },  // Warm gold
            { rgb: '255, 160, 0',   weight: 2 },  // Deep amber
            { rgb: '255, 0, 60',    weight: 2 },  // Magenta/crimson secondary
            { rgb: '255, 80, 40',   weight: 1 },  // Ember bridge
            { rgb: '220, 180, 120', weight: 1 },  // Muted warm
        ];

        function pickColor(): string {
            const totalWeight = PALETTE.reduce((s, c) => s + c.weight, 0);
            let r = Math.random() * totalWeight;
            for (const c of PALETTE) {
                r -= c.weight;
                if (r <= 0) return c.rgb;
            }
            return PALETTE[0].rgb;
        }

        let filaments: Filament[] = [];

        // The diagonal path length needed to fully cross the viewport
        const diagLen = () => Math.sqrt(w * w + h * h) + 800;

        /**
         * Build a single filament along the diagonal direction.
         * Points are placed along the flow angle with gentle perpendicular wander.
         */
        function createFilament(): Filament {
            const pathLen = diagLen();
            // Greatly reduce segment count for enterprise performance
            const segCount = 15;
            const segLen = pathLen / segCount;

            // Span the entire screen diagonally by starting far left
            // and distributing the start Y from way above the screen to way below the screen
            const startX = -200;
            const startY = -h + (Math.random() * (h * 3 + w));

            const points: ControlPoint[] = [];
            let cx = startX;
            let cy = startY;

            // Gentle perpendicular wander per segment
            const wanderStrength = 6 + Math.random() * 14;

            for (let i = 0; i <= segCount; i++) {
                points.push({ x: cx, y: cy });
                // Advance along the diagonal
                cx += FLOW_DX * segLen;
                cy += FLOW_DY * segLen;
                // Wander perpendicular to flow
                const perp = (Math.random() - 0.5) * wanderStrength;
                cx += PERP_DX * perp;
                cy += PERP_DY * perp;
            }

            return {
                points,
                color: pickColor(),
                coreWidth: 0.3 + Math.random() * 1.0,
                opacity: 0.15 + Math.random() * 0.45,
                driftSpeed: 0, // No physical drift, the wave travels via phase
                driftOffset: 0,
                oscAmplitude: 20 + Math.random() * 60, // Much larger vertical waves
                oscFreq: 0.001 + Math.random() * 0.002, // Wave frequency
                oscPhase: Math.random() * Math.PI * 2,
                oscFreq2: 0.0005 + Math.random() * 0.001,
                oscPhase2: Math.random() * Math.PI * 2,
                oscAmplitude2: 10 + Math.random() * 30, // Secondary vertical wave
            };
        }

        function initFilaments() {
            filaments = [];
            // Reduced count for enterprise performance, but enough to fill screen vertically
            const count = Math.max(10, Math.floor((w * h) / 80000));
            for (let i = 0; i < count; i++) {
                filaments.push(createFilament());
            }
        }

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
            initFilaments();
        }

        /**
         * Draw a single filament with layered bloom:
         *   1. Wide, very faint outer halo  (volume / glow)
         *   2. Medium soft glow layer
         *   3. Thin bright core
         *   4. Ultra-thin white-hot centre
         */
        function drawFilament(f: Filament, now: number, globalAlpha: number) {
            const pts = f.points;
            if (pts.length < 2) return;

            // Drift offset is along the diagonal direction
            const driftX = f.driftOffset * FLOW_DX + currentOffsetX;
            const driftY = f.driftOffset * FLOW_DY + currentOffsetY;

            // Create a single Path2D to avoid recalculating the path for every glow layer
            const path = new Path2D();

            let p = pts[0];
            let alongDist = p.x * FLOW_DX - p.y * FLOW_DY;
            // Negative now multiplier makes the wave travel along the diagonal
            let osc =
                Math.sin(alongDist * f.oscFreq + f.oscPhase - now * 0.0006) * f.oscAmplitude +
                Math.sin(alongDist * f.oscFreq2 + f.oscPhase2 - now * 0.0004) * f.oscAmplitude2;
            
            let prevPx = p.x + driftX + PERP_DX * osc;
            let prevPy = p.y + driftY + PERP_DY * osc;

            path.moveTo(prevPx, prevPy);

            for (let i = 1; i < pts.length; i++) {
                p = pts[i];
                alongDist = p.x * FLOW_DX - p.y * FLOW_DY;
                osc =
                    Math.sin(alongDist * f.oscFreq + f.oscPhase - now * 0.0006) * f.oscAmplitude +
                    Math.sin(alongDist * f.oscFreq2 + f.oscPhase2 - now * 0.0004) * f.oscAmplitude2;
                
                const px = p.x + driftX + PERP_DX * osc;
                const py = p.y + driftY + PERP_DY * osc;
                
                const cpx = (prevPx + px) / 2;
                const cpy = (prevPy + py) / 2;
                path.quadraticCurveTo(prevPx, prevPy, cpx, cpy);
                
                prevPx = px;
                prevPy = py;
            }

            ctx!.lineCap = 'round';
            ctx!.lineJoin = 'round';

            // Shimmer: gentle pulsation per filament
            const shimmer = 0.7 + Math.sin(now * 0.001 + f.oscPhase) * 0.3;
            const alpha = f.opacity * shimmer * globalAlpha;

            // Enterprise Optimization: Draw only 2 layers instead of 4, use standard blending
            // Layer 1 — wide soft halo (glow volume)
            ctx!.lineWidth = f.coreWidth * 12;
            ctx!.strokeStyle = `rgba(${f.color}, ${alpha * 0.15})`;
            ctx!.stroke(path);

            // Layer 2 — bright core
            ctx!.lineWidth = f.coreWidth * 1.5;
            ctx!.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            ctx!.stroke(path);
        }

        function draw(now: number) {
            ctx!.clearRect(0, 0, w, h);

            // Parallax interpolation
            currentOffsetX += (targetOffsetX - currentOffsetX) * 0.04;
            currentOffsetY += (targetOffsetY - currentOffsetY) * 0.04;

            // Theme interpolation
            const targetLight = getComputedLight();
            const timeDelta = Math.min(now - lastThemeTime, 100);
            lastThemeTime = now;
            const rate = 1 / 300;
            const step = timeDelta * rate;
            if (themeProgress !== targetLight) {
                if (Math.abs(themeProgress - targetLight) < step) {
                    themeProgress = targetLight;
                } else {
                    themeProgress += themeProgress < targetLight ? step : -step;
                }
            }

            // Dimmer in light mode
            const globalAlpha = 1.0 - themeProgress * 0.55;

            // Note: We deliberately do NOT use 'lighter' composite operation here.
            // Standard source-over is infinitely faster for enterprise web rendering.

            // Advance drift along diagonal & draw each filament
            for (const f of filaments) {
                // We no longer physically drift them, so they span continuously
                drawFilament(f, now, globalAlpha);
            }
        }

        this.loopFn = function loop(now: number) {
            if (!QuantumBackground.isActive) return;

            if (now - lastFrame >= frameInterval) {
                draw(now);
                lastFrame = now;
            }
            QuantumBackground.animationFrameId = requestAnimationFrame(QuantumBackground.loopFn);
        }

        let resizeTimer: number;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(resize, 150);
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                resize();
                if (QuantumBackground.isActive) {
                    QuantumBackground.animationFrameId = requestAnimationFrame(QuantumBackground.loopFn);
                }
            });
        } else {
            resize();
            if (QuantumBackground.isActive) {
                QuantumBackground.animationFrameId = requestAnimationFrame(QuantumBackground.loopFn);
            }
        }
    }
}
