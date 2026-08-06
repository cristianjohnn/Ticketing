---
name: Quantum Flux
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#d4c5ab'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#9c8f78'
  outline-variant: '#504532'
  surface-tint: '#fbbc00'
  primary: '#ffe2ab'
  on-primary: '#402d00'
  primary-container: '#ffbf00'
  on-primary-container: '#6d5000'
  inverse-primary: '#795900'
  secondary: '#ffb3b2'
  on-secondary: '#680012'
  secondary-container: '#ff525c'
  on-secondary-container: '#5b000f'
  tertiary: '#e8e5e4'
  on-tertiary: '#313030'
  tertiary-container: '#cbc9c8'
  on-tertiary-container: '#555454'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdfa0'
  primary-fixed-dim: '#fbbc00'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b2'
  on-secondary-fixed: '#410008'
  on-secondary-fixed-variant: '#92001e'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.2em
  mono-data:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0em
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1440px
---

## Brand & Style

The design system is a high-octane, technical aesthetic inspired by high-energy physics, particle accelerators, and the raw energy of quantum mechanics. It targets a sophisticated, tech-forward audience that values precision, speed, and experimental interfaces. The emotional response is one of controlled intensity—a "contained explosion" of data and energy.

The design style is **High-Contrast / Bold** fused with **Modern Brutalism**. It utilizes deep, "void" black backgrounds to make reactive accents feel like light emitted from a vacuum. The UI is defined by razor-sharp geometric lines, "energy-leak" glow effects (long, directional outer glows), and a sense of structural integrity that feels both industrial and futuristic.

Key visual principles:
- **Kinetic Energy:** Elements should feel like they are charging or discharging.
- **Precision:** Use of hair-line strokes and technical markers (crosshairs, coordinates).
- **The Void:** Use pure black (#000000) to maximize the perceived luminance of accent colors.

## Colors

The palette is built on the contrast between absolute darkness and high-intensity thermal radiation.

- **Primary (Amber Flux):** #FFBF00. Used for primary actions, success states, and core data points. It represents stable high energy.
- **Secondary (Crimson Pulse):** #FF003C. Used for warnings, critical errors, and high-intensity interactive states. It represents unstable energy or "red-line" status.
- **Neutral/Background (The Void):** #000000. The canvas. All surfaces are built upon this to ensure infinite depth.
- **Surface (Carbon):** #1A1A1A. Used for subtle containment areas where pure black would provide insufficient context for depth.

**Energy Leak Effects:**
Glows should use the primary or secondary colors with a `hard-light` or `screen` blend mode. Accents often feature a "directional leak"—a shadow or glow that extends strictly along the X or Y axis rather than a uniform blur.

## Typography

Typography in this design system is aggressive and technical. 

- **Headlines:** Use **Space Grotesk**. For large display styles, use tight tracking to create a sense of compressed power. For standard headlines, increase letter-spacing slightly to enhance the "technical schematic" feel.
- **Body:** Use **Geist**. Its clean, geometric sans-serif nature provides high legibility against pitch-black backgrounds.
- **Labels & Data:** Use **Space Mono**. All labels must be uppercase with wide tracking (0.2em) to mimic telemetry readouts and industrial markings.

Avoid any "soft" or humanist typefaces. The type must feel engineered, not written.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** with rigid structural boundaries. The rhythm is based on a 4px baseline, but large-scale components should favor expansive white space (or "black space") to allow the energy-leak effects room to breathe.

- **Grid:** A 12-column grid on desktop, 4-column on mobile.
- **Borders:** Layout sections should be separated by 1px solid strokes in Carbon (#1A1A1A) rather than gaps, creating a "blueprint" or "chamber" effect.
- **Alignment:** Strictly align elements to the grid intersections. Use "crosshair" icons at the corners of major layout containers to emphasize the technical nature of the system.

## Elevation & Depth

This design system rejects traditional shadows in favor of **Tonal Layers** and **Radiant Glows**.

- **Level 0 (The Void):** Background layer, #000000.
- **Level 1 (The Chamber):** Surfaces at #0D0D0D with 1px #1A1A1A borders.
- **Level 2 (Active Element):** Surfaces with an inner glow or "edge-light" using the primary Amber color at 10-20% opacity.
- **Interaction Depth:** Instead of moving "closer" to the user via shadows, active elements should "charge" by increasing their stroke width and adding a directional outer glow (Energy Leak). 

**Energy Leak Specs:** 
Use a box-shadow with 0px offset and a large blur (20px-40px), but limit its spread to specific axes to simulate light escaping from a seam.

## Shapes

The shape language is strictly **Sharp (0px)**. There are no rounded corners in this design system. 

- **Corners:** Every element—buttons, cards, inputs—must have 90-degree angles.
- **Clipped Corners:** For decorative elements or primary buttons, a 45-degree "stepped" corner (chamfer) can be used to reinforce the military-grade/aerospace aesthetic.
- **Strokes:** Use consistent 1px or 2px strokes. Variable stroke weights can be used to indicate hierarchy, with 2px reserved for primary "active" containers.

## Components

### Buttons
- **Primary:** Solid #FFBF00 background with #000000 text. Sharp corners. On hover, add a 10px Amber "energy-leak" glow.
- **Secondary:** 1px stroke of #FFBF00, no fill. Text in #FFBF00. On hover, fill with 10% Amber opacity.
- **Ghost:** Pure text using Space Mono, uppercase, with a small "+" prefix.

### Input Fields
- **Default:** 1px border (#1A1A1A) on bottom only. Label sits above in Space Mono (Label-caps).
- **Focus:** Border color shifts to #FFBF00 with a 2px height. A subtle Amber glow emanates from the baseline.

### Cards & Containers
- Containers are defined by 1px borders (#1A1A1A). 
- To indicate "Active" status, the top-right corner should feature a small triangular "status notch" in Crimson or Amber.

### Chips / Tags
- Small rectangular boxes with 1px strokes. Use Mono-data typography.
- For "critical" tags, use a pulsing Crimson background.

### Progressive Indicators
- Progress bars should be segmented, showing individual "cells" of energy filling up, rather than a smooth continuous bar. This reinforces the quantized nature of the theme.