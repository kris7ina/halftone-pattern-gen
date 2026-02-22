export interface NoiseParams {
  seed: number;
  scale: number;
  octaves: number;
  persistence: number;
  contrast: number;
  brightness: number;
  noiseType: string;
  warpAmount: number;
}

export interface GradientParams {
  direction: number;
  start: number;
  end: number;
  curve: number;
}

export interface BlendParams {
  mix: number;
  mode: string;
}

export interface HalftoneParams {
  frequency: number;
  angle: number;
  thickness: number;
  cellSize: number;
  shape: string;
  fgColor: string;
  bgColor: string;
  invert: boolean;
  transparent: boolean;
}

export interface MaskParams {
  enabled: boolean;
  scale: number;
  threshold: number;
  softness: number;
  verticalBias: number;
  edgeFade: number;
}

export interface AllParams {
  sourceMode: string;
  renderMode: string;
  noise: NoiseParams;
  gradient: GradientParams;
  blend: BlendParams;
  halftone: HalftoneParams;
  mask: MaskParams;
}

export class SimplexNoise {
  private grad3: number[][];
  private perm: Uint8Array;
  private permMod12: Uint8Array;

  constructor(seed: number) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; const g = this.permMod12[ii + this.perm[jj]]; n0 = t0 * t0 * (this.grad3[g][0] * x0 + this.grad3[g][1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; const g = this.permMod12[ii + i1 + this.perm[jj + j1]]; n1 = t1 * t1 * (this.grad3[g][0] * x1 + this.grad3[g][1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; const g = this.permMod12[ii + 1 + this.perm[jj + 1]]; n2 = t2 * t2 * (this.grad3[g][0] * x2 + this.grad3[g][1] * y2); }
    return 70 * (n0 + n1 + n2);
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function hashPixel(x: number, y: number, seed: number): number {
  let h = seed ^ 0xDEADBEEF;
  h ^= x * 374761393;
  h ^= y * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

export function generateNoiseField(width: number, height: number, params: NoiseParams): Float32Array {
  const noise = new SimplexNoise(params.seed);
  const noise2 = new SimplexNoise(params.seed + 7919);
  const data = new Float32Array(width * height);
  const dim = Math.min(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let nx = x / dim * params.scale;
      let ny = y / dim * params.scale;
      if (params.noiseType === 'warp') {
        const wa = params.warpAmount;
        nx += noise2.noise2D(nx * 0.8, ny * 0.8) * wa;
        ny += noise2.noise2D(nx * 0.8 + 100, ny * 0.8 + 100) * wa;
      }
      let val = 0, amp = 1, freq = 1, maxAmp = 0;
      for (let o = 0; o < params.octaves; o++) {
        let n = noise.noise2D(nx * freq, ny * freq);
        if (params.noiseType === 'ridged') { n = 1 - Math.abs(n); n = n * n; n = n * 2 - 1; }
        val += n * amp; maxAmp += amp; amp *= params.persistence; freq *= 2;
      }
      val = (val / maxAmp + 1) * 0.5;
      val = ((val - 0.5) * params.contrast) + 0.5;
      val += params.brightness / 255;
      data[y * width + x] = Math.max(0, Math.min(1, val)) * 255;
    }
  }
  return data;
}

export function generateGradientField(width: number, height: number, params: GradientParams): Float32Array {
  const data = new Float32Array(width * height);
  const dirRad = (params.direction * Math.PI) / 180;
  const dx = Math.cos(dirRad), dy = Math.sin(dirRad);
  const curve = params.curve;
  const gradStart = params.start / 100;
  const gradEnd = params.end / 100;
  const corners: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1]];
  let tMin = Infinity, tMax = -Infinity;
  for (const [cx, cy] of corners) {
    const ct = cx * dx + cy * dy;
    tMin = Math.min(tMin, ct); tMax = Math.max(tMax, ct);
  }
  const tRange = tMax - tMin;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rawT = ((x / width) * dx + (y / height) * dy - tMin) / tRange;
      let t: number;
      if (gradStart < gradEnd) {
        if (rawT <= gradStart) t = 1;
        else if (rawT >= gradEnd) t = 0;
        else t = 1 - (rawT - gradStart) / (gradEnd - gradStart);
      } else if (gradStart > gradEnd) {
        if (rawT >= gradStart) t = 1;
        else if (rawT <= gradEnd) t = 0;
        else t = (rawT - gradEnd) / (gradStart - gradEnd);
      } else { t = 0.5; }
      t = Math.pow(Math.max(0, Math.min(1, t)), curve);
      data[y * width + x] = t * 255;
    }
  }
  return data;
}

export function generateSourceField(width: number, height: number, params: AllParams): Float32Array {
  if (params.sourceMode === 'noise') return generateNoiseField(width, height, params.noise);
  if (params.sourceMode === 'gradient') return generateGradientField(width, height, params.gradient);
  const noiseData = generateNoiseField(width, height, params.noise);
  const gradData = generateGradientField(width, height, params.gradient);
  const mix = params.blend.mix, mode = params.blend.mode;
  const output = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const n = noiseData[i] / 255, g = gradData[i] / 255;
    let val: number;
    if (mode === 'multiply') val = n * g;
    else if (mode === 'add') val = Math.min(1, n * (1 - mix) + g * mix + n * g * mix);
    else val = n * (1 - mix) + g * mix;
    output[i] = Math.max(0, Math.min(1, val)) * 255;
  }
  return output;
}

export function generateMaskField(width: number, height: number, params: AllParams): Float32Array {
  const noise = new SimplexNoise(params.noise.seed + 31337);
  const data = new Float32Array(width * height);
  const maskScale = params.mask.scale;
  const threshold = params.mask.threshold;
  const softness = params.mask.softness;
  const vertBias = params.mask.verticalBias;
  const edgeFade = params.mask.edgeFade;
  const dim = Math.min(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / dim * maskScale;
      const ny = y / dim * maskScale;

      let val = noise.noise2D(nx, ny) * 0.7;
      val += noise.noise2D(nx * 2.3, ny * 2.3) * 0.3;
      val = (val + 1) * 0.5;

      const vertFalloff = 1.0 - (1.0 - y / height) * vertBias;
      val *= vertFalloff;

      if (edgeFade > 0) {
        const edgeX = Math.min(x, width - x) / (width * 0.5);
        const edgeY = Math.min(y, height - y) / (height * 0.5);
        val *= Math.min(1, Math.min(edgeX, edgeY) / edgeFade);
      }

      const low = threshold - softness;
      const high = threshold + softness;
      let t: number;
      if (val <= low) t = 0;
      else if (val >= high) t = 1;
      else { t = (val - low) / (high - low); t = t * t * (3 - 2 * t); }

      data[y * width + x] = t;
    }
  }
  return data;
}

export function applySteppedHalftone(sourceData: Float32Array, width: number, height: number, params: HalftoneParams, maskData: Float32Array | null): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const angleRad = (params.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
  const acrossPeriod = Math.max(2, Math.round(width / params.frequency));
  const alongCellSize = Math.max(2, Math.round(acrossPeriod * params.cellSize));
  const fg = hexToRgb(params.invert ? params.bgColor : params.fgColor);
  const bg = hexToRgb(params.invert ? params.fgColor : params.bgColor);
  const transparent = params.transparent;
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    output[idx] = bg[0]; output[idx + 1] = bg[1]; output[idx + 2] = bg[2];
    output[idx + 3] = transparent ? 0 : 255;
  }
  const diagonal = Math.sqrt(width * width + height * height);
  const numAcross = Math.ceil(diagonal / acrossPeriod) + 2;
  const numAlong = Math.ceil(diagonal / alongCellSize) + 2;
  const cellStride = numAlong * 2 + 1;
  const cellThickness = new Float32Array((numAcross * 2 + 1) * cellStride);
  for (let ai = -numAcross; ai <= numAcross; ai++) {
    for (let li = -numAlong; li <= numAlong; li++) {
      const cx = Math.round(cosA * (ai + 0.5) * acrossPeriod - sinA * (li + 0.5) * alongCellSize);
      const cy = Math.round(sinA * (ai + 0.5) * acrossPeriod + cosA * (li + 0.5) * alongCellSize);
      let brightness = 0;
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) brightness = sourceData[cy * width + cx] / 255;
      let darkness = params.invert ? brightness : (1 - brightness);
      if (maskData) {
        const mx = Math.max(0, Math.min(width - 1, cx));
        const my = Math.max(0, Math.min(height - 1, cy));
        darkness *= maskData[my * width + mx];
      }
      cellThickness[(ai + numAcross) * cellStride + (li + numAlong)] = darkness * params.thickness * acrossPeriod;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const across = cosA * x + sinA * y;
      const along = -sinA * x + cosA * y;
      const ai = Math.floor(across / acrossPeriod);
      const li = Math.floor(along / alongCellSize);
      const posInPeriod = across - ai * acrossPeriod;
      const ciA = ai + numAcross, ciL = li + numAlong;
      if (ciA < 0 || ciA >= numAcross * 2 + 1 || ciL < 0 || ciL >= cellStride) continue;
      const barThick = cellThickness[ciA * cellStride + ciL];
      if (Math.abs(posInPeriod - acrossPeriod / 2) <= barThick / 2) {
        const idx = (y * width + x) * 4;
        output[idx] = fg[0]; output[idx + 1] = fg[1]; output[idx + 2] = fg[2]; output[idx + 3] = 255;
      }
    }
  }
  return output;
}

export function applySmoothHalftone(sourceData: Float32Array, width: number, height: number, params: HalftoneParams, maskData: Float32Array | null): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const angleRad = (params.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
  const period = Math.max(2, width / params.frequency);
  const fg = hexToRgb(params.invert ? params.bgColor : params.fgColor);
  const bg = hexToRgb(params.invert ? params.fgColor : params.bgColor);
  const transparent = params.transparent;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const across = cosA * x + sinA * y;
      const posInPeriod = ((across % period) + period) % period;
      const brightness = sourceData[y * width + x] / 255;
      let darkness = params.invert ? brightness : (1 - brightness);
      if (maskData) darkness *= maskData[y * width + x];
      const lineWidth = darkness * params.thickness;
      const distFromCenter = Math.abs(posInPeriod / period - 0.5) * 2;
      const idx = (y * width + x) * 4;
      if (distFromCenter < lineWidth) {
        output[idx] = fg[0]; output[idx + 1] = fg[1]; output[idx + 2] = fg[2]; output[idx + 3] = 255;
      } else {
        output[idx] = bg[0]; output[idx + 1] = bg[1]; output[idx + 2] = bg[2];
        output[idx + 3] = transparent ? 0 : 255;
      }
    }
  }
  return output;
}

export function applyShapeHalftone(sourceData: Float32Array, width: number, height: number, params: HalftoneParams, maskData: Float32Array | null, renderMode: string): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const angleRad = (params.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
  const period = Math.max(2, Math.round(width / params.frequency));
  const fg = hexToRgb(params.invert ? params.bgColor : params.fgColor);
  const bg = hexToRgb(params.invert ? params.fgColor : params.bgColor);
  const transparent = params.transparent;
  const shape = params.shape;
  const thickness = params.thickness;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    output[idx] = bg[0]; output[idx + 1] = bg[1]; output[idx + 2] = bg[2];
    output[idx + 3] = transparent ? 0 : 255;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rx = cosA * x + sinA * y;
      const ry = -sinA * x + cosA * y;

      const cellX = Math.floor(rx / period);
      const cellY = Math.floor(ry / period);

      const px = (rx / period - cellX);
      const py = (ry / period - cellY);

      const cx = px - 0.5;
      const cy = py - 0.5;

      let brightness: number;
      if (renderMode === 'stepped') {
        const centerRx = (cellX + 0.5) * period;
        const centerRy = (cellY + 0.5) * period;
        const sx = Math.round(cosA * centerRx - sinA * centerRy);
        const sy = Math.round(sinA * centerRx + cosA * centerRy);
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          brightness = sourceData[sy * width + sx] / 255;
        } else {
          brightness = 0;
        }
      } else {
        brightness = sourceData[y * width + x] / 255;
      }

      let darkness = params.invert ? brightness : (1 - brightness);
      if (maskData) darkness *= maskData[y * width + x];
      const size = darkness * thickness;

      let inside = false;

      if (shape === 'square') {
        inside = Math.abs(cx) < size * 0.5 && Math.abs(cy) < size * 0.5;
      } else if (shape === 'circle') {
        inside = (cx * cx + cy * cy) < (size * 0.5) * (size * 0.5);
      } else if (shape === 'diamond') {
        inside = (Math.abs(cx) + Math.abs(cy)) < size * 0.5;
      } else if (shape === 'ellipse') {
        inside = (cx * cx / ((size * 0.5) * (size * 0.5)) + cy * cy / ((size * 0.25) * (size * 0.25))) < 1;
      } else if (shape === 'cross') {
        const armWidth = size * 0.2;
        const armLength = size * 0.5;
        inside = (Math.abs(cx) < armWidth && Math.abs(cy) < armLength) ||
                 (Math.abs(cy) < armWidth && Math.abs(cx) < armLength);
      }

      if (inside) {
        const idx = (y * width + x) * 4;
        output[idx] = fg[0]; output[idx + 1] = fg[1]; output[idx + 2] = fg[2]; output[idx + 3] = 255;
      }
    }
  }
  return output;
}

export function applyDitherHalftone(sourceData: Float32Array, width: number, height: number, params: HalftoneParams, maskData: Float32Array | null, seed: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const fg = hexToRgb(params.invert ? params.bgColor : params.fgColor);
  const bg = hexToRgb(params.invert ? params.fgColor : params.bgColor);
  const transparent = params.transparent;
  const thickness = params.thickness;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const brightness = sourceData[y * width + x] / 255;
      let darkness = params.invert ? brightness : (1 - brightness);
      if (maskData) darkness *= maskData[y * width + x];
      const threshold = hashPixel(x, y, seed);
      const idx = (y * width + x) * 4;
      if (darkness * thickness > threshold) {
        output[idx] = fg[0]; output[idx + 1] = fg[1]; output[idx + 2] = fg[2]; output[idx + 3] = 255;
      } else {
        output[idx] = bg[0]; output[idx + 1] = bg[1]; output[idx + 2] = bg[2];
        output[idx + 3] = transparent ? 0 : 255;
      }
    }
  }
  return output;
}

export function renderPattern(width: number, height: number, params: AllParams): Uint8ClampedArray {
  const sourceData = generateSourceField(width, height, params);
  const maskData = params.mask.enabled ? generateMaskField(width, height, params) : null;

  if (params.halftone.shape === 'dither') {
    return applyDitherHalftone(sourceData, width, height, params.halftone, maskData, params.noise.seed);
  } else if (params.halftone.shape !== 'line') {
    return applyShapeHalftone(sourceData, width, height, params.halftone, maskData, params.renderMode);
  } else if (params.renderMode === 'stepped') {
    return applySteppedHalftone(sourceData, width, height, params.halftone, maskData);
  } else {
    return applySmoothHalftone(sourceData, width, height, params.halftone, maskData);
  }
}

export function exportSVGString(width: number, height: number, params: AllParams): string {
  const sourceData = generateSourceField(width, height, params);
  const maskData = params.mask.enabled ? generateMaskField(width, height, params) : null;
  const shape = params.halftone.shape;
  const angle = params.halftone.angle;
  const angleRad = (angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
  const period = Math.max(2, Math.round(width / params.halftone.frequency));
  const thickness = params.halftone.thickness;
  const invert = params.halftone.invert;
  const transparent = params.halftone.transparent;
  const fgColor = invert ? params.halftone.bgColor : params.halftone.fgColor;
  const bgColor = invert ? params.halftone.fgColor : params.halftone.bgColor;
  const diagonal = Math.sqrt(width * width + height * height);

  let svgElements = '';

  if (shape === 'dither') {
    const seed = params.noise.seed;
    for (let y = 0; y < height; y++) {
      let runStart = -1;
      for (let x = 0; x <= width; x++) {
        let isOn = false;
        if (x < width) {
          const brightness = sourceData[y * width + x] / 255;
          let darkness = invert ? brightness : (1 - brightness);
          if (maskData) darkness *= maskData[y * width + x];
          isOn = darkness * thickness > hashPixel(x, y, seed);
        }
        if (isOn && runStart === -1) {
          runStart = x;
        } else if (!isOn && runStart !== -1) {
          svgElements += `<rect x="${runStart}" y="${y}" width="${x - runStart}" height="1"/>`;
          runStart = -1;
        }
      }
    }

  } else if (shape === 'line' && params.renderMode === 'stepped') {
    const acrossPeriod = period;
    const alongCellSize = Math.max(2, Math.round(acrossPeriod * params.halftone.cellSize));
    const numAcross = Math.ceil(diagonal / acrossPeriod) + 2;
    const numAlong = Math.ceil(diagonal / alongCellSize) + 2;

    for (let ai = -numAcross; ai <= numAcross; ai++) {
      for (let li = -numAlong; li <= numAlong; li++) {
        const cx = Math.round(cosA * (ai + 0.5) * acrossPeriod - sinA * (li + 0.5) * alongCellSize);
        const cy = Math.round(sinA * (ai + 0.5) * acrossPeriod + cosA * (li + 0.5) * alongCellSize);
        if (cx < -period * 2 || cx >= width + period * 2 || cy < -period * 2 || cy >= height + period * 2) continue;

        const sx = Math.max(0, Math.min(width - 1, cx));
        const sy = Math.max(0, Math.min(height - 1, cy));
        const brightness = sourceData[sy * width + sx] / 255;
        let darkness = invert ? brightness : (1 - brightness);
        if (maskData) darkness *= maskData[sy * width + sx];
        const barThick = darkness * thickness * acrossPeriod;
        if (barThick < 0.5) continue;

        svgElements += `<rect x="${(-barThick / 2).toFixed(1)}" y="${(-alongCellSize / 2).toFixed(1)}" width="${barThick.toFixed(1)}" height="${(alongCellSize + 0.5).toFixed(1)}" transform="translate(${cx},${cy}) rotate(${angle})"/>`;
      }
    }

  } else if (shape === 'line') {
    const numLines = Math.ceil(diagonal / period) + 4;
    const alongX = -sinA, alongY = cosA;
    for (let lineIdx = -numLines; lineIdx <= numLines; lineIdx++) {
      const barCenterAcross = (lineIdx + 0.5) * period;
      const scanSteps = Math.ceil(diagonal);
      const segments: { x: number; y: number; w: number }[][] = [];
      let currentSeg: { x: number; y: number; w: number }[] | null = null;
      for (let s = -scanSteps; s <= scanSteps; s++) {
        const px = (width / 2) + cosA * barCenterAcross + alongX * s - cosA * (diagonal / 2);
        const py = (height / 2) + sinA * barCenterAcross + alongY * s - sinA * (diagonal / 2);
        const ix = Math.floor(px), iy = Math.floor(py);
        if (ix < 0 || ix >= width || iy < 0 || iy >= height) {
          if (currentSeg && currentSeg.length > 1) segments.push(currentSeg);
          currentSeg = null; continue;
        }
        const brightness = sourceData[iy * width + ix] / 255;
        let darkness = invert ? brightness : (1 - brightness);
        if (maskData) darkness *= maskData[iy * width + ix];
        const barWidth = darkness * thickness * period;
        if (barWidth > 0.5) {
          if (!currentSeg) currentSeg = [];
          currentSeg.push({ x: px, y: py, w: barWidth });
        } else {
          if (currentSeg && currentSeg.length > 1) segments.push(currentSeg);
          currentSeg = null;
        }
      }
      if (currentSeg && currentSeg.length > 1) segments.push(currentSeg);
      for (const seg of segments) {
        const step = Math.max(1, Math.floor(seg.length / 400));
        const sampled: { x: number; y: number; w: number }[] = [];
        for (let i = 0; i < seg.length; i += step) sampled.push(seg[i]);
        if (sampled[sampled.length - 1] !== seg[seg.length - 1]) sampled.push(seg[seg.length - 1]);
        if (sampled.length < 2) continue;
        const top: { x: number; y: number }[] = [], bottom: { x: number; y: number }[] = [];
        for (const pt of sampled) {
          const hw = pt.w / 2;
          top.push({ x: pt.x + cosA * hw, y: pt.y + sinA * hw });
          bottom.push({ x: pt.x - cosA * hw, y: pt.y - sinA * hw });
        }
        bottom.reverse();
        let d = `M${top[0].x.toFixed(1)},${top[0].y.toFixed(1)}`;
        for (let i = 1; i < top.length; i++) d += `L${top[i].x.toFixed(1)},${top[i].y.toFixed(1)}`;
        for (let i = 0; i < bottom.length; i++) d += `L${bottom[i].x.toFixed(1)},${bottom[i].y.toFixed(1)}`;
        d += 'Z';
        svgElements += `<path d="${d}"/>`;
      }
    }

  } else {
    const numCells = Math.ceil(diagonal / period) + 2;
    for (let cellX = -numCells; cellX <= numCells; cellX++) {
      for (let cellY = -numCells; cellY <= numCells; cellY++) {
        const centerRx = (cellX + 0.5) * period;
        const centerRy = (cellY + 0.5) * period;
        const sx = Math.round(cosA * centerRx - sinA * centerRy);
        const sy = Math.round(sinA * centerRx + cosA * centerRy);
        if (sx < -period * 2 || sx >= width + period * 2 || sy < -period * 2 || sy >= height + period * 2) continue;

        const csx = Math.max(0, Math.min(width - 1, sx));
        const csy = Math.max(0, Math.min(height - 1, sy));
        const brightness = sourceData[csy * width + csx] / 255;
        let darkness = invert ? brightness : (1 - brightness);
        if (maskData) darkness *= maskData[csy * width + csx];
        const size = darkness * thickness;
        if (size < 0.01) continue;

        const r = (size * period) / 2;

        if (shape === 'circle') {
          svgElements += `<circle cx="${sx}" cy="${sy}" r="${r.toFixed(1)}"/>`;
        } else if (shape === 'square') {
          svgElements += `<rect x="${(-r).toFixed(1)}" y="${(-r).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" transform="translate(${sx},${sy}) rotate(${angle})"/>`;
        } else if (shape === 'diamond') {
          svgElements += `<polygon points="${sx},${(sy - r).toFixed(1)} ${(sx + r).toFixed(1)},${sy} ${sx},${(sy + r).toFixed(1)} ${(sx - r).toFixed(1)},${sy}" transform="rotate(${angle},${sx},${sy})"/>`;
        } else if (shape === 'ellipse') {
          svgElements += `<ellipse cx="${sx}" cy="${sy}" rx="${r.toFixed(1)}" ry="${(r * 0.5).toFixed(1)}" transform="rotate(${angle},${sx},${sy})"/>`;
        } else if (shape === 'cross') {
          const armW = size * 0.2 * period;
          svgElements += `<rect x="${(-armW / 2).toFixed(1)}" y="${(-r).toFixed(1)}" width="${armW.toFixed(1)}" height="${(r * 2).toFixed(1)}" transform="translate(${sx},${sy}) rotate(${angle})"/>`;
          svgElements += `<rect x="${(-r).toFixed(1)}" y="${(-armW / 2).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${armW.toFixed(1)}" transform="translate(${sx},${sy}) rotate(${angle})"/>`;
        }
      }
    }
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  if (!transparent) svg += `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
  svg += `<defs><clipPath id="c"><rect width="${width}" height="${height}"/></clipPath></defs>`;
  svg += `<g clip-path="url(#c)" fill="${fgColor}">`;
  svg += svgElements;
  svg += `</g></svg>`;

  return svg;
}
