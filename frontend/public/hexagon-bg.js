/**
 * Animated Hexagonal Grid Background
 * Single global canvas fixed behind all content.
 * Supports both dark and light themes with gradient hexagons and glowing edges.
 */
(function () {
  'use strict';

  const GLOW_COLOR_DARK = '#00e5ff';
  const GLOW_COLOR_LIGHT = '#00bcd4';
  const HEX_RADIUS = 32;
  const LINE_WIDTH = 0.8;
  const GLOW_LINE_WIDTH = 1.8;
  const CLUSTER_COUNT = 5;
  const CLUSTER_SIZE = 6;
  const CYCLE_DURATION = 5000;
  const FPS_CAP = 24;

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
  let cols, rows, hexagons = [], clusters = [], lastFrame = 0;
  let w, h, centerX, centerY, maxDist;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    centerX = w / 2;
    centerY = h / 2;
    maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    buildGrid();
    buildClusters();
  }

  function buildGrid() {
    cols = Math.ceil(w / hexW) + 2;
    rows = Math.ceil(h / (hexH * 0.75)) + 2;
    hexagons = [];
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * hexW + (r % 2 !== 0 ? hexW / 2 : 0);
        const y = r * hexH * 0.75;
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

  function newCluster(phaseOffset) {
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

  function hexPath(cx, cy) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + HEX_RADIUS * Math.cos(angle);
      const py = cy + HEX_RADIUS * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);

    // Detect theme
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const GLOW_COLOR = isLight ? GLOW_COLOR_LIGHT : GLOW_COLOR_DARK;

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

      if (isLight) {
        // Light mode: clean hexagons with radial fade
        
        // Fill - subtle and fades toward edges
        hexPath(hex.x, hex.y);
        const fillOpacity = (0.12 + centerBrightness * 0.18) * (1 - distFactor * 0.5);
        ctx.fillStyle = `rgba(210, 225, 235, ${fillOpacity})`;
        ctx.fill();

        // Base edges - cyan tint, fades with distance
        hexPath(hex.x, hex.y);
        const edgeAlpha = (0.15 + centerBrightness * 0.3) * (1 - distFactor * 0.65);
        ctx.strokeStyle = `rgba(0, 188, 212, ${edgeAlpha})`;
        ctx.lineWidth = LINE_WIDTH;
        ctx.stroke();

        // Animated glow
        if (hex.glow > 0.05) {
          hexPath(hex.x, hex.y);
          const glowAlpha = hex.glow * (0.75 + centerBrightness * 0.25);
          ctx.strokeStyle = `rgba(0, 229, 255, ${glowAlpha})`;
          ctx.lineWidth = GLOW_LINE_WIDTH * 1.5;
          ctx.shadowColor = GLOW_COLOR;
          ctx.shadowBlur = 16 * hex.glow;
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // Inner glow fill
          hexPath(hex.x, hex.y);
          const innerGlow = ctx.createRadialGradient(
            hex.x, hex.y, 0,
            hex.x, hex.y, HEX_RADIUS * 0.75
          );
          innerGlow.addColorStop(0, `rgba(0, 229, 255, ${hex.glow * 0.2})`);
          innerGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
          ctx.fillStyle = innerGlow;
          ctx.fill();
        }
      } else {
        // Dark mode: clean hexagons with radial fade
        
        // Fill - darker at edges
        hexPath(hex.x, hex.y);
        const fillOpacity = (0.5 + centerBrightness * 0.3) * (1 - distFactor * 0.5);
        ctx.fillStyle = `rgba(8, 12, 15, ${fillOpacity})`;
        ctx.fill();

        // Base edges - fade with distance
        hexPath(hex.x, hex.y);
        const edgeAlpha = (0.1 + centerBrightness * 0.25) * (1 - distFactor * 0.7);
        ctx.strokeStyle = `rgba(0, 180, 212, ${edgeAlpha})`;
        ctx.lineWidth = LINE_WIDTH;
        ctx.stroke();

        // Animated glow
        if (hex.glow > 0.05) {
          hexPath(hex.x, hex.y);
          const glowAlpha = hex.glow * (0.8 + centerBrightness * 0.2);
          ctx.strokeStyle = `rgba(0, 229, 255, ${glowAlpha})`;
          ctx.lineWidth = GLOW_LINE_WIDTH * 1.3;
          ctx.shadowColor = GLOW_COLOR;
          ctx.shadowBlur = 16 * hex.glow;
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // Inner glow fill
          hexPath(hex.x, hex.y);
          const innerGlow = ctx.createRadialGradient(
            hex.x, hex.y, 0,
            hex.x, hex.y, HEX_RADIUS * 0.7
          );
          innerGlow.addColorStop(0, `rgba(0, 229, 255, ${hex.glow * 0.25})`);
          innerGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
          ctx.fillStyle = innerGlow;
          ctx.fill();
        }
      }
    }
  }

  let animId;
  function loop(now) {
    if (now - lastFrame >= frameInterval) {
      lastFrame = now;
      draw(now);
    }
    animId = requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { resize(); animId = requestAnimationFrame(loop); });
  } else {
    resize();
    animId = requestAnimationFrame(loop);
  }
})();
