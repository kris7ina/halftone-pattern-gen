"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AllParams, renderPattern, exportSVGString } from "@/lib/engine";

type Shape = "line" | "square" | "circle" | "diamond" | "cross" | "ellipse";

export default function Home() {
  const [seed, setSeed] = useState(500);
  const [patternType, setPatternType] = useState<"halftone" | "dither">("halftone");
  const [renderMode, setRenderMode] = useState<"stepped" | "smooth">("stepped");
  const [shape, setShape] = useState<Shape>("line");
  const [sourceMode, setSourceMode] = useState<"noise" | "gradient" | "both">("noise");
  const [noiseType, setNoiseType] = useState<"perlin" | "ridged" | "warp">("perlin");

  const [scale, setScale] = useState(3);
  const [contrast, setContrast] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [warpAmount, setWarpAmount] = useState(1.5);

  const [gradDir, setGradDir] = useState(0);
  const [gradStart, setGradStart] = useState(0);
  const [gradEnd, setGradEnd] = useState(100);
  const [gradCurve, setGradCurve] = useState(1);

  const [blendMix, setBlendMix] = useState(0.5);
  const [blendMode, setBlendMode] = useState<"multiply" | "mix" | "add">("multiply");

  const [frequency, setFrequency] = useState(40);
  const [angle, setAngle] = useState(90);
  const [thickness, setThickness] = useState(1);
  const [cellSize, setCellSize] = useState(2);

  const [maskEnabled, setMaskEnabled] = useState(false);
  const [maskScale, setMaskScale] = useState(1);
  const [maskThreshold, setMaskThreshold] = useState(0.45);
  const [maskSoftness, setMaskSoftness] = useState(0.1);
  const [maskVertBias, setMaskVertBias] = useState(0.5);
  const [maskEdgeFade, setMaskEdgeFade] = useState(0.3);

  const [fgColor, setFgColor] = useState("#ff0000");
  const [bgColor, setBgColor] = useState("#c8c0b8");
  const [invert, setInvert] = useState(false);
  const [transparent, setTransparent] = useState(false);

  const [canvasW, setCanvasW] = useState(1200);
  const [canvasH, setCanvasH] = useState(800);

  const [processing, setProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDither = patternType === "dither";
  const activeShape = isDither ? "dither" : shape;

  const buildParams = useCallback((): AllParams => ({
    sourceMode,
    renderMode,
    noise: {
      seed, scale, octaves: 3, persistence: 0.5,
      contrast, brightness, noiseType, warpAmount,
    },
    gradient: { direction: gradDir, start: gradStart, end: gradEnd, curve: gradCurve },
    blend: { mix: blendMix, mode: blendMode },
    halftone: {
      frequency, angle, thickness, cellSize,
      shape: activeShape, fgColor, bgColor, invert, transparent,
    },
    mask: {
      enabled: maskEnabled, scale: maskScale, threshold: maskThreshold,
      softness: maskSoftness, verticalBias: maskVertBias, edgeFade: maskEdgeFade,
    },
  }), [
    seed, sourceMode, renderMode, scale, contrast, brightness, noiseType, warpAmount,
    gradDir, gradStart, gradEnd, gradCurve, blendMix, blendMode,
    frequency, angle, thickness, cellSize, activeShape, fgColor, bgColor,
    invert, transparent, maskEnabled, maskScale, maskThreshold, maskSoftness,
    maskVertBias, maskEdgeFade,
  ]);

  const doRender = useCallback(() => {
    const canvas = canvasRef.current;
    const area = canvasAreaRef.current;
    if (!canvas || !area) return;

    const width = canvasW || 1200;
    const height = canvasH || 800;
    const params = buildParams();

    const maxW = area.clientWidth - 60;
    const maxH = area.clientHeight - 60;
    const displayScale = Math.min(1, maxW / width, maxH / height);

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = (width * displayScale) + "px";
    canvas.style.height = (height * displayScale) + "px";

    requestAnimationFrame(() => {
      const imageData = renderPattern(width, height, params);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const imgData = ctx.createImageData(width, height);
      imgData.data.set(imageData);
      ctx.putImageData(imgData, 0, 0);
    });
  }, [canvasW, canvasH, buildParams]);

  useEffect(() => {
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    renderTimerRef.current = setTimeout(doRender, 30);
    return () => { if (renderTimerRef.current) clearTimeout(renderTimerRef.current); };
  }, [doRender]);

  useEffect(() => {
    const handler = () => doRender();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [doRender]);

  const handleExportPNG = (pngScale: number) => {
    setProcessing(true);
    requestAnimationFrame(() => {
      const baseW = canvasW || 1200;
      const baseH = canvasH || 800;
      const width = baseW * pngScale;
      const height = baseH * pngScale;
      const params = buildParams();
      params.halftone.frequency *= pngScale;

      const imageData = renderPattern(width, height, params);
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) { setProcessing(false); return; }
      const imgData = ctx.createImageData(width, height);
      imgData.data.set(imageData);
      ctx.putImageData(imgData, 0, 0);
      const link = document.createElement("a");
      link.download = `halftone-pattern-${seed}${pngScale > 1 ? `-${pngScale}x` : ""}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
      setProcessing(false);
    });
  };

  const handleExportSVG = () => {
    setProcessing(true);
    requestAnimationFrame(() => {
      const width = canvasW || 1200;
      const height = canvasH || 800;
      const params = buildParams();
      const svg = exportSVGString(width, height, params);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `halftone-pattern-${seed}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setProcessing(false);
    });
  };

  const handleRandomize = () => {
    const s = Math.floor(Math.random() * 9999);
    setSeed(s);
  };

  const handleReset = () => {
    setSeed(500); setPatternType("halftone"); setRenderMode("stepped");
    setShape("line"); setSourceMode("noise"); setNoiseType("perlin");
    setScale(3); setContrast(1); setBrightness(0); setWarpAmount(1.5);
    setGradDir(0); setGradStart(0); setGradEnd(100); setGradCurve(1);
    setBlendMix(0.5); setBlendMode("multiply");
    setFrequency(40); setAngle(90); setThickness(1); setCellSize(2);
    setMaskEnabled(false); setMaskScale(1); setMaskThreshold(0.45);
    setMaskSoftness(0.1); setMaskVertBias(0.5); setMaskEdgeFade(0.3);
    setFgColor("#ff0000"); setBgColor("#c8c0b8");
    setInvert(false); setTransparent(false);
    setCanvasW(1200); setCanvasH(800);
  };

  const showNoise = sourceMode === "noise" || sourceMode === "both";
  const showGradient = sourceMode === "gradient" || sourceMode === "both";
  const showBlend = sourceMode === "both";
  const showCellSize = !isDither && renderMode === "stepped" && shape === "line";

  const modeLabel = `${renderMode.toUpperCase()} · ${activeShape.toUpperCase()} · ${sourceMode.toUpperCase()}`;
  const previewLabel = `${canvasW || 1200} × ${canvasH || 800}`;

  return (
    <div className="app">
      <div className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
        <div className="logo">Halftone Pattern Generator</div>
        <div className="logo-sub">Generative noise → halftone</div>

        {/* Seed */}
        <div className="section">
          <div className="section-title">Seed</div>
          <div className="control">
            <div className="control-header">
              <span className="control-label">Value</span>
              <span className="control-value">{seed}</span>
            </div>
            <input type="range" min="0" max="9999" step="1" value={seed}
              onChange={e => setSeed(parseInt(e.target.value))} />
          </div>
          <div className="hint">Unique pattern fingerprint</div>
          <div className="btn-row">
            <button className="btn btn-accent" onClick={handleRandomize}>↻ Random</button>
            <button className="btn" onClick={handleReset}>↺ Reset</button>
          </div>
        </div>

        {/* Pattern Type */}
        <div className="section">
          <div className="section-title">Pattern Type</div>
          <SelectGroup
            options={[
              { value: "halftone", label: "Halftone" },
              { value: "dither", label: "Dither" },
            ]}
            value={patternType}
            onChange={v => setPatternType(v as "halftone" | "dither")}
          />
        </div>

        {!isDither && (
          <div>
            {/* Render Mode */}
            <div className="section">
              <div className="section-title">Render Mode</div>
              <SelectGroup
                options={[
                  { value: "stepped", label: "Stepped" },
                  { value: "smooth", label: "Smooth" },
                ]}
                value={renderMode}
                onChange={v => setRenderMode(v as "stepped" | "smooth")}
              />
            </div>

            {/* Halftone Shape */}
            <div className="section">
              <div className="section-title">Halftone Shape</div>
              <SelectGroup
                options={[
                  { value: "line", label: "Line" },
                  { value: "square", label: "Square" },
                  { value: "circle", label: "Circle" },
                ]}
                value={shape}
                onChange={v => setShape(v as Shape)}
              />
              <SelectGroup
                options={[
                  { value: "diamond", label: "Diamond" },
                  { value: "cross", label: "Cross" },
                  { value: "ellipse", label: "Ellipse" },
                ]}
                value={shape}
                onChange={v => setShape(v as Shape)}
                style={{ marginTop: -8 }}
              />
            </div>
          </div>
        )}

        {/* Source */}
        <div className="section">
          <div className="section-title">Source</div>
          <SelectGroup
            options={[
              { value: "noise", label: "Noise" },
              { value: "gradient", label: "Gradient" },
              { value: "both", label: "Both" },
            ]}
            value={sourceMode}
            onChange={v => setSourceMode(v as "noise" | "gradient" | "both")}
          />
        </div>

        {/* Gradient Controls */}
        <div className={`conditional${showGradient ? " visible" : ""}`}>
          <div className="section">
            <div className="section-title">Gradient</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Direction</span>
                <span className="control-value">{gradDir}°</span>
              </div>
              <input type="range" min="0" max="360" step="1" value={gradDir}
                onChange={e => setGradDir(parseInt(e.target.value))} />
            </div>
            <div className="hint">0° = left→right, 90° = top→bottom</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Start</span>
                <span className="control-value">{gradStart}%</span>
              </div>
              <input type="range" min="0" max="100" step="1" value={gradStart}
                onChange={e => setGradStart(parseInt(e.target.value))} />
            </div>
            <div className="hint">Where bars reach full thickness</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">End</span>
                <span className="control-value">{gradEnd}%</span>
              </div>
              <input type="range" min="0" max="100" step="1" value={gradEnd}
                onChange={e => setGradEnd(parseInt(e.target.value))} />
            </div>
            <div className="hint">Where bars fade to nothing</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Curve</span>
                <span className="control-value">{gradCurve.toFixed(1)}</span>
              </div>
              <input type="range" min="0.2" max="4" step="0.1" value={gradCurve}
                onChange={e => setGradCurve(parseFloat(e.target.value))} />
            </div>
            <div className="hint">1 = linear, higher = sharper falloff</div>
          </div>
        </div>

        {/* Noise Controls */}
        <div className={`conditional${showNoise ? " visible" : ""}`}>
          <div className="section">
            <div className="section-title">Noise Field</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Scale</span>
                <span className="control-value">{scale.toFixed(1)}</span>
              </div>
              <input type="range" min="0.3" max="12" step="0.1" value={scale}
                onChange={e => setScale(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Zoom level of the noise pattern</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Contrast</span>
                <span className="control-value">{contrast.toFixed(1)}</span>
              </div>
              <input type="range" min="0.2" max="5" step="0.1" value={contrast}
                onChange={e => setContrast(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Sharpens light/dark difference</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Brightness</span>
                <span className="control-value">{brightness}</span>
              </div>
              <input type="range" min="-128" max="128" step="1" value={brightness}
                onChange={e => setBrightness(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Shifts overall lightness</div>
          </div>

          <div className="section">
            <div className="section-title">Noise Type</div>
            <SelectGroup
              options={[
                { value: "perlin", label: "Perlin" },
                { value: "ridged", label: "Ridged" },
                { value: "warp", label: "Warp" },
              ]}
              value={noiseType}
              onChange={v => setNoiseType(v as "perlin" | "ridged" | "warp")}
            />

            <div style={{ display: noiseType === "warp" ? "block" : "none" }}>
              <div className="control">
                <div className="control-header">
                  <span className="control-label">Warp Amount</span>
                  <span className="control-value">{warpAmount.toFixed(1)}</span>
                </div>
                <input type="range" min="0.1" max="5" step="0.1" value={warpAmount}
                  onChange={e => setWarpAmount(parseFloat(e.target.value))} />
              </div>
              <div className="hint">How much the noise distorts itself</div>
            </div>
          </div>
        </div>

        {/* Blend Controls */}
        <div className={`conditional${showBlend ? " visible" : ""}`}>
          <div className="section">
            <div className="section-title">Blend</div>
            <div className="control">
              <div className="control-header">
                <span className="control-label">Noise ↔ Gradient</span>
                <span className="control-value">{blendMix.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={blendMix}
                onChange={e => setBlendMix(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Balance between noise and gradient</div>
            <SelectGroup
              options={[
                { value: "multiply", label: "Multiply" },
                { value: "mix", label: "Mix" },
                { value: "add", label: "Add" },
              ]}
              value={blendMode}
              onChange={v => setBlendMode(v as "multiply" | "mix" | "add")}
            />
          </div>
        </div>

        {/* Halftone / Density */}
        <div className="section">
          <div className="section-title">{isDither ? "Density" : "Halftone"}</div>

          <div style={{ display: isDither ? "none" : undefined }}>
            <div className="control">
              <div className="control-header">
                <span className="control-label">Line Frequency</span>
                <span className="control-value">{frequency} lpi</span>
              </div>
              <input type="range" min="5" max="150" step="1" value={frequency}
                onChange={e => setFrequency(parseInt(e.target.value))} />
            </div>
            <div className="hint">Lines per inch across the canvas</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Angle</span>
                <span className="control-value">{angle}°</span>
              </div>
              <input type="range" min="0" max="180" step="1" value={angle}
                onChange={e => setAngle(parseInt(e.target.value))} />
            </div>
            <div className="hint">Rotation of the halftone grid</div>
          </div>

          <div className="control">
            <div className="control-header">
              <span className="control-label">{isDither ? "Density" : "Thickness"}</span>
              <span className="control-value">{thickness.toFixed(2)}</span>
            </div>
            <input type="range" min="0.1" max="2.5" step="0.05" value={thickness}
              onChange={e => setThickness(parseFloat(e.target.value))} />
          </div>
          <div className="hint">
            {isDither ? "Probability of each pixel being filled" : "Width of bars relative to spacing"}
          </div>

          <div style={{ display: showCellSize ? "block" : "none" }}>
            <div className="control">
              <div className="control-header">
                <span className="control-label">Cell Size</span>
                <span className="control-value">{cellSize.toFixed(1)}</span>
              </div>
              <input type="range" min="0.5" max="8" step="0.1" value={cellSize}
                onChange={e => setCellSize(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Length of each bar segment</div>
          </div>
        </div>

        {/* Shape Mask */}
        <div className="section">
          <div className="section-title">Shape Mask</div>
          <div className="toggle-row">
            <span className="toggle-label">Enable</span>
            <div
              className={`toggle${maskEnabled ? " active" : ""}`}
              onClick={() => setMaskEnabled(!maskEnabled)}
            />
          </div>
          <div style={{ display: maskEnabled ? "block" : "none" }}>
            <div className="control">
              <div className="control-header">
                <span className="control-label">Scale</span>
                <span className="control-value">{maskScale.toFixed(1)}</span>
              </div>
              <input type="range" min="0.3" max="4" step="0.1" value={maskScale}
                onChange={e => setMaskScale(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Lower = larger blobs</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Threshold</span>
                <span className="control-value">{maskThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min="0.05" max="0.9" step="0.01" value={maskThreshold}
                onChange={e => setMaskThreshold(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Higher = more empty space</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Softness</span>
                <span className="control-value">{maskSoftness.toFixed(2)}</span>
              </div>
              <input type="range" min="0.01" max="0.3" step="0.01" value={maskSoftness}
                onChange={e => setMaskSoftness(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Sharpness of blob edges</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Vertical Bias</span>
                <span className="control-value">{maskVertBias.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={maskVertBias}
                onChange={e => setMaskVertBias(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Higher = favors bottom of canvas</div>

            <div className="control">
              <div className="control-header">
                <span className="control-label">Edge Fade</span>
                <span className="control-value">{maskEdgeFade.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={maskEdgeFade}
                onChange={e => setMaskEdgeFade(parseFloat(e.target.value))} />
            </div>
            <div className="hint">Fades pattern near canvas edges</div>
          </div>
        </div>

        {/* Appearance */}
        <div className="section">
          <div className="section-title">Appearance</div>

          <div className="color-row">
            <div className="color-swatch">
              <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} />
            </div>
            <span className="color-label">Foreground</span>
          </div>

          <div className="color-row">
            <div className="color-swatch">
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
            </div>
            <span className="color-label">Background</span>
          </div>

          <div className="toggle-row">
            <span className="toggle-label">Invert</span>
            <div
              className={`toggle${invert ? " active" : ""}`}
              onClick={() => setInvert(!invert)}
            />
          </div>

          <div className="toggle-row">
            <span className="toggle-label">Transparent BG</span>
            <div
              className={`toggle${transparent ? " active" : ""}`}
              onClick={() => setTransparent(!transparent)}
            />
          </div>
        </div>

        {/* Canvas Size */}
        <div className="section">
          <div className="section-title">Canvas Size</div>
          <div className="dimensions-row">
            <div className="dim-input">
              <label>W</label>
              <input type="number" value={canvasW} min={100} max={4000}
                onChange={e => setCanvasW(parseInt(e.target.value) || 1200)} />
            </div>
            <div className="dim-input">
              <label>H</label>
              <input type="number" value={canvasH} min={100} max={4000}
                onChange={e => setCanvasH(parseInt(e.target.value) || 800)} />
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="section">
          <div className="section-title">Export</div>
          <div className="btn-row">
            <button className="btn" onClick={() => handleExportPNG(1)}>PNG 1×</button>
            <button className="btn" onClick={() => handleExportPNG(2)}>PNG 2×</button>
            <button className="btn" onClick={() => handleExportPNG(4)}>PNG 4×</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleExportSVG}>Export SVG</button>
          </div>
        </div>

        <div className="seed-footer">seed: <span>{seed}</span></div>
      </div>

      <div className="canvas-area" ref={canvasAreaRef}>
        <div className="info-bar">
          <span>{modeLabel}</span>
          <span>{previewLabel}</span>
        </div>
        <div className="canvas-wrapper">
          <canvas ref={canvasRef} />
        </div>
        <div className={`processing-overlay${processing ? " visible" : ""}`}>generating…</div>
      </div>
    </div>
  );
}

function SelectGroup({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="select-group" style={style}>
      {options.map(opt => (
        <div
          key={opt.value}
          className={`select-option${value === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </div>
      ))}
    </div>
  );
}
