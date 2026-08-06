/**
 * Animated Hexagonal Grid Background
 * Single global canvas fixed behind all content.
 * Supports both dark and light themes with gradient hexagons and glowing edges.
 */

export class HexagonBackground {
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

        const HEX_RADIUS = 24;
        const LINE_WIDTH = 0.8;
        const GLOW_LINE_WIDTH = 1.8;
        const CLUSTER_COUNT = 8;
        const CLUSTER_SIZE = 6;
        const CYCLE_DURATION = 6000;
        const FPS_CAP = 30;

        const sqrt3 = Math.sqrt(3);
        const hexW = sqrt3 * HEX_RADIUS;
        const hexH = 2 * HEX_RADIUS;
        const frameInterval = 1000 / FPS_CAP;

        // Create a single global canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'hex-bg-global';
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '-1',
            pointerEvents: 'none'
        });
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        interface Hexagon { x: number; y: number; glow: number; }
        interface Cluster { indices: number[]; startTime: number; }
        
        let cols: number, rows: number;
        let hexagons: Hexagon[] = [];
        let clusters: Cluster[] = [];
        let lastFrame = 0;
        const getComputedLight = () => {
            const mode = document.documentElement.getAttribute('data-color-mode');
            if (mode === 'system') return window.matchMedia('(prefers-color-scheme: light)').matches ? 1.0 : 0.0;
            return mode === 'light' ? 1.0 : 0.0;
        };
        let themeProgress = getComputedLight();
        let lastThemeTime = performance.now();
        let w: number, h: number, centerX: number, centerY: number, maxDist: number;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
            centerX = w / 2;
            centerY = h / 2;
            maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
            buildGrid();
            buildClusters();
        }

        function buildGrid() {
            hexagons = [];
            cols = Math.ceil(w / hexW) + 2;
            rows = Math.ceil(h / (hexH * 0.75)) + 2;

            for (let row = -1; row < rows; row++) {
                for (let col = -1; col < cols; col++) {
                    const x = col * hexW + (row % 2 === 1 ? hexW / 2 : 0);
                    const y = row * hexH * 0.75;
                    hexagons.push({ x, y, glow: 0 });
                }
            }
        }

        function buildClusters() {
            clusters = [];
            for (let i = 0; i < CLUSTER_COUNT; i++) {
                clusters.push(newCluster(Math.random() * CYCLE_DURATION));
            }
        }

        function newCluster(phaseOffset: number) {
            if (!hexagons.length) return { indices: [], startTime: performance.now() };
            const seed = Math.floor(Math.random() * hexagons.length);
            const indices = [seed];
            const added = new Set([seed]);
            for (let i = 0; i < CLUSTER_SIZE - 1; i++) {
                const base = indices[Math.floor(Math.random() * indices.length)];
                const bx = hexagons[base].x;
                const by = hexagons[base].y;
                let best = -1, bestDist = Infinity;
                for (let j = 0; j < hexagons.length; j++) {
                    if (added.has(j)) continue;
                    const dx = hexagons[j].x - bx;
                    const dy = hexagons[j].y - by;
                    const d = dx * dx + dy * dy;
                    if (d < bestDist && d < (hexW * 2.5) * (hexW * 2.5)) {
                        bestDist = d;
                        best = j;
                    }
                }
                if (best >= 0) {
                    indices.push(best);
                    added.add(best);
                }
            }
            return { indices, startTime: performance.now() - (phaseOffset || 0) };
        }

        function hexPath(cx: number, cy: number) {
            ctx!.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const px = cx + HEX_RADIUS * Math.cos(angle);
                const py = cy + HEX_RADIUS * Math.sin(angle);
                if (i === 0) ctx!.moveTo(px, py);
                else ctx!.lineTo(px, py);
            }
            ctx!.closePath();
        }

        function draw(now: number) {
            ctx!.clearRect(0, 0, w, h);
            
            ctx!.save();

            // Interpolate themeProgress
            const targetLight = getComputedLight();
            const timeDelta = now - lastThemeTime;
            lastThemeTime = now;
            
            // Smooth transition over ~300ms
            const rate = 1 / 300;
            const step = timeDelta * rate;
            if (themeProgress !== targetLight) {
                if (Math.abs(themeProgress - targetLight) < step) {
                    themeProgress = targetLight;
                } else {
                    if (themeProgress < targetLight) {
                        themeProgress += step;
                    } else {
                        themeProgress -= step;
                    }
                }
            }

            // Colors & properties interpolation
            // Much darker base color for dark mode to remove the greyish look
            const r = 4 + (210 - 4) * themeProgress;
            const g = 6 + (225 - 6) * themeProgress;
            const b = 10 + (235 - 10) * themeProgress;

            const er = 0;
            const eg = 180 + (188 - 180) * themeProgress;
            const eb = 212;

            const gr = 0;
            const gg = 229 + (188 - 229) * themeProgress;
            const gb = 255 + (212 - 255) * themeProgress;
            const GLOW_COLOR = `rgb(${gr}, ${Math.round(gg)}, ${gb})`;

            // Reset glow
            for (let i = 0; i < hexagons.length; i++) hexagons[i].glow = 0;

            // Cluster glow calculation
            for (let c = 0; c < clusters.length; c++) {
                const cluster = clusters[c];
                const elapsed = now - cluster.startTime;
                const progress = (elapsed % CYCLE_DURATION) / CYCLE_DURATION;
                const intensity = Math.sin(progress * Math.PI);

                if (elapsed > CYCLE_DURATION) {
                    clusters[c] = newCluster(0);
                    continue;
                }

                for (let i = 0; i < cluster.indices.length; i++) {
                    const idx = cluster.indices[i];
                    if (idx < hexagons.length) {
                        hexagons[idx].glow = Math.max(hexagons[idx].glow, intensity);
                    }
                }
            }

            // Draw hexagons with radial fade from center
            for (let i = 0; i < hexagons.length; i++) {
                const hex = hexagons[i];

                // Distance from center for radial fade
                const dx = hex.x - centerX;
                const dy = hex.y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const distFactor = Math.min(dist / (maxDist * 0.75), 1);
                const centerBrightness = 1 - distFactor; // Brighter at center, darker at edges

                // Base fill
                hexPath(hex.x, hex.y);
                // Drastically INCREASED fill opacity to obscure the lighter DOM background 
                // and apply our very dark fill color.
                const baseFillOpacity = (0.9 - 0.4 * themeProgress) + centerBrightness * (0.1 - 0.05 * themeProgress);
                const fillOpacity = baseFillOpacity * (1 - distFactor * 0.5);
                ctx!.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${fillOpacity})`;
                ctx!.fill();

                // Base edges
                hexPath(hex.x, hex.y);
                const baseEdgeOpacity = (0.1 + 0.05 * themeProgress) + centerBrightness * (0.25 + 0.05 * themeProgress);
                const edgeDistFactorMult = 0.7 - 0.05 * themeProgress;
                const edgeAlpha = baseEdgeOpacity * (1 - distFactor * edgeDistFactorMult);
                ctx!.strokeStyle = `rgba(${er}, ${Math.round(eg)}, ${eb}, ${edgeAlpha})`;
                ctx!.lineWidth = LINE_WIDTH;
                ctx!.stroke();

                // Animated glow
                if (hex.glow > 0.05) {
                    hexPath(hex.x, hex.y);
                    const baseGlowAlpha = (0.8 - 0.05 * themeProgress) + centerBrightness * (0.2 + 0.05 * themeProgress);
                    const glowAlpha = hex.glow * baseGlowAlpha;
                    ctx!.strokeStyle = `rgba(0, 229, 255, ${glowAlpha})`;
                    ctx!.lineWidth = GLOW_LINE_WIDTH * (1.3 + 0.2 * themeProgress);
                    ctx!.shadowColor = GLOW_COLOR;
                    ctx!.shadowBlur = 16 * hex.glow;
                    ctx!.stroke();
                    ctx!.shadowBlur = 0;
                    
                    // Inner glow fill
                    hexPath(hex.x, hex.y);
                    const innerGlowRadiusMult = 0.7 + 0.05 * themeProgress;
                    const innerGlow = ctx!.createRadialGradient(
                        hex.x, hex.y, 0,
                        hex.x, hex.y, HEX_RADIUS * innerGlowRadiusMult
                    );
                    const innerGlowStartOpacity = hex.glow * (0.25 - 0.05 * themeProgress);
                    innerGlow.addColorStop(0, `rgba(0, 229, 255, ${innerGlowStartOpacity})`);
                    innerGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
                    ctx!.fillStyle = innerGlow;
                    ctx!.fill();
                }
            }
            ctx!.restore();
        }

        this.loopFn = function loop(now: number) {
            if (!HexagonBackground.isActive) return;

            if (now - lastFrame >= frameInterval) {
                lastFrame = now;
                draw(now);
            }
            HexagonBackground.animationFrameId = requestAnimationFrame(HexagonBackground.loopFn);
        }

        let resizeTimer: number;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(resize, 150);
        });

        // Initialize
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { 
                resize(); 
                if (HexagonBackground.isActive) {
                    HexagonBackground.animationFrameId = requestAnimationFrame(HexagonBackground.loopFn); 
                }
            });
        } else {
            resize();
            if (HexagonBackground.isActive) {
                HexagonBackground.animationFrameId = requestAnimationFrame(HexagonBackground.loopFn);
            }
        }
    }
}
