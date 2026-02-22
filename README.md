# Halftone Pattern Generator

A browser-based tool for creating generative halftone and dither patterns from procedural noise fields. Designed for designers and artists who need tileable textures, print-ready assets, or abstract graphic elements.

## What it does

Turn simplex noise and gradient fields into crisp vector-ready patterns using classic halftone screening techniques. Every parameter is exposed as a real-time slider, so you can explore the design space visually before exporting.

### Pattern types

- **Halftone** — maps a source field to repeating shapes on a rotated grid. Supports line, circle, square, diamond, cross, and ellipse shapes in both stepped (cell-sampled) and smooth (per-pixel) render modes.
- **Dither** — stochastic 1-bit screening where each pixel is independently on/off based on source brightness vs. a deterministic hash threshold. Produces the scattered pixel aesthetic of classic dithered gradients.

### Source fields

- **Noise** — simplex noise with configurable scale, contrast, brightness, and three variants (Perlin, ridged, domain warp).
- **Gradient** — directional linear gradient with adjustable start/end points and curve falloff.
- **Both** — blends noise and gradient via multiply, mix, or additive modes.

### Shape mask

An optional low-frequency noise mask creates organic blob-shaped regions where the pattern appears, leaving the rest as clean negative space. Controls for blob scale, threshold, edge softness, vertical bias, and edge fade.

### Export

- PNG at 1x, 2x, or 4x resolution
- SVG with native vector elements (circles, rects, polygons, paths) — not rasterized traces

## Tech stack

Next.js, React, TypeScript, HTML Canvas. All pattern computation runs client-side with zero server dependencies. Deployed on Netlify.

## Run locally

```
npm install
npm run dev
```

Opens at [localhost:3000](http://localhost:3000).
