import { panelField, type PanelField, type StoneInput } from "@stone/engine";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { COLOUR_MODES, modeColour, nearest, utilisationColour, type ColourMode } from "../viz";
import { arrangementOf } from "./Thumbs";

/** Scene units: 1 unit = 1 m. */
const MM = 1e-3;
const STONE = "#d9cdb8";
const STONE_EDGE = "#c3b496";
const STEEL = "#4b5258";

/** Values shown for a colour mode, and the maximum of the scale. */
export function viewValues(f: PanelField, mode: ColourMode): { value: Float64Array; max: number } {
  const value = mode === "stress" ? f.sigma : f.util;
  const max = mode === "utilisation" ? 1 : value.reduce((m, v) => Math.max(m, v), 0);
  return { value, max };
}

/** A face over the field grid at depth z (mm), coloured per vertex. */
function face(f: PanelField, z: number, colours: Float32Array | null, length: number, height: number) {
  const nx = f.xs.length;
  const ny = f.ys.length;
  const pos = new Float32Array(nx * ny * 3);
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) pos.set([(f.xs[ix]! - length / 2) * MM, (f.ys[iy]! - height / 2) * MM, z * MM], (iy * nx + ix) * 3);
  const index: number[] = [];
  for (let iy = 0; iy < ny - 1; iy++)
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iy * nx + ix;
      index.push(a, a + 1, a + nx + 1, a, a + nx + 1, a + nx);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (colours) g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Fixing parts in mm, centred on the panel: dowels, kerf plates or undercut anchors, with their brackets. */
export function fixingParts(input: StoneInput, depth: number) {
  const { length, height } = input.geometry;
  const arr = arrangementOf(input.fixings);
  const type = input.fixings.type;
  const { ax, ay } = input.fixings;
  const parts: { key: string; kind: "pin" | "plate" | "bracket" | "rail"; pos: [number, number, number]; size: [number, number, number]; axis?: "x" | "y" | "z" }[] = [];
  const pts = [
    [ax, ay],
    [length - ax, ay],
    [ax, height - ay],
    [length - ax, height - ay],
  ] as const;
  const mid = -depth / 2;
  const pin = Math.max(input.fixings.dowelDiameter ?? 8, 4);
  pts.forEach(([x, y], i) => {
    const cx = x - length / 2;
    const cy = y - height / 2;
    if (arr === "back") {
      parts.push({ key: `a${i}`, kind: "pin", pos: [cx, cy, -depth - 15], size: [12, 50, 12], axis: "z" });
      parts.push({ key: `k${i}`, kind: "bracket", pos: [cx, cy, -depth - 45], size: [60, 30, 10] });
      return;
    }
    const vertical = arr === "bed";
    const outward = vertical ? Math.sign(cy) : Math.sign(cx);
    const edge: [number, number] = vertical ? [cx, cy] : [cx, cy];
    if (type === "kerf") parts.push({ key: `p${i}`, kind: "plate", pos: [edge[0] + (vertical ? 0 : -outward * 5), edge[1] + (vertical ? -outward * 5 : 0), mid], size: vertical ? [70, 30, 3] : [30, 70, 3] });
    else parts.push({ key: `p${i}`, kind: "pin", pos: [edge[0], edge[1], mid], size: [pin, 60, pin], axis: vertical ? "y" : "x" });
    parts.push({ key: `b${i}`, kind: "bracket", pos: [edge[0] + (vertical ? 0 : outward * 6), edge[1] + (vertical ? outward * 6 : 0), mid - depth / 2 - 30], size: vertical ? [40, 6, depth + 60] : [6, 40, depth + 60] });
  });
  if (input.system === "rainscreen") {
    const ys = [...new Set(pts.map(([, y]) => y))];
    ys.forEach((y, i) => parts.push({ key: `r${i}`, kind: "rail", pos: [0, y - height / 2, -depth - (arr === "back" ? 75 : 75)], size: [length + 200, 40, 20] }));
  }
  return parts;
}

function Panel({ input, field, mode, thicknessScale, onProbe }: { input: StoneInput; field: PanelField; mode: ColourMode; thicknessScale: number; onProbe: (p: { x: number; y: number } | null) => void }) {
  const { length, height, thickness } = input.geometry;
  const depth = thickness * thicknessScale;
  const { value, max } = viewValues(field, mode);
  const geo = useMemo(() => {
    const colours = new Float32Array(value.length * 3);
    for (let k = 0; k < value.length; k++) colours.set(modeColour(mode, value[k]!, max), k * 3);
    return { front: face(field, 0, colours, length, height), back: face(field, -depth, null, length, height) };
  }, [field, mode, value, max, length, height, depth]);
  const parts = useMemo(() => fixingParts(input, depth), [input, depth]);
  return (
    <group>
      <mesh
        geometry={geo.front}
        onPointerMove={(e) => {
          e.stopPropagation();
          onProbe({ x: e.point.x / MM + length / 2, y: e.point.y / MM + height / 2 });
        }}
        onPointerOut={() => onProbe(null)}
      >
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.85} />
      </mesh>
      <mesh geometry={geo.back}>
        <meshStandardMaterial color={STONE} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      {/* Edges: the drawn thickness. */}
      {[
        { p: [0, height / 2, -depth / 2], s: [length, 0.01, depth] },
        { p: [0, -height / 2, -depth / 2], s: [length, 0.01, depth] },
        { p: [-length / 2, 0, -depth / 2], s: [0.01, height, depth] },
        { p: [length / 2, 0, -depth / 2], s: [0.01, height, depth] },
      ].map((e, i) => (
        <mesh key={i} position={e.p.map((v) => v * MM) as [number, number, number]}>
          <boxGeometry args={e.s.map((v) => Math.max(v, 0.01) * MM) as [number, number, number]} />
          <meshStandardMaterial color={STONE_EDGE} roughness={0.9} />
        </mesh>
      ))}
      {parts.map((p) =>
        p.kind === "pin" ? (
          <mesh key={p.key} position={p.pos.map((v) => v * MM) as [number, number, number]} rotation={p.axis === "x" ? [0, 0, Math.PI / 2] : p.axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
            <cylinderGeometry args={[(p.size[0] / 2) * MM, (p.size[0] / 2) * MM, p.size[1] * MM, 16]} />
            <meshStandardMaterial color="#9aa3a8" metalness={0.6} roughness={0.35} />
          </mesh>
        ) : (
          <mesh key={p.key} position={p.pos.map((v) => v * MM) as [number, number, number]}>
            <boxGeometry args={p.size.map((v) => v * MM) as [number, number, number]} />
            <meshStandardMaterial color={p.kind === "plate" ? "#9aa3a8" : STEEL} metalness={p.kind === "rail" ? 0.3 : 0.5} roughness={0.5} />
          </mesh>
        ),
      )}
    </group>
  );
}

export function Viewer({ input, valid }: { input: StoneInput; valid: boolean }) {
  const [mode, setMode] = useState<ColourMode>("utilisation");
  const [scaleChoice, setScaleChoice] = useState<"auto" | number>("auto");
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);
  const field = useMemo(() => (valid ? panelField(input) : null), [input, valid]);
  const { length, height, thickness } = input.geometry;
  // Auto: thickness reads as at least ~6% of the shorter side, never thinner than true scale.
  const autoScale = [1, 2, 3].find((k) => k * thickness >= 0.06 * Math.min(length, height)) ?? 3;
  const thicknessScale = scaleChoice === "auto" ? autoScale : scaleChoice;
  const size = Math.max(length, height) * MM;
  const info = COLOUR_MODES.find((m) => m.value === mode)!;
  const vals = field ? viewValues(field, mode) : null;
  const k = probe && field ? nearest(field.xs, field.ys, probe.x, probe.y) : -1;

  return (
    <section className="viewer" aria-label="3D stone panel view">
      <div className="viewer-bar">
        <label className="toggle">
          Colour by
          <select value={mode} onChange={(e) => setMode(e.target.value as ColourMode)} disabled={!valid}>
            {COLOUR_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle">
          Thickness drawn
          <select value={String(scaleChoice)} onChange={(e) => setScaleChoice(e.target.value === "auto" ? "auto" : Number(e.target.value))} disabled={!valid}>
            <option value="auto">auto (×{autoScale})</option>
            <option value={1}>true scale</option>
            <option value={2}>×2</option>
            <option value={3}>×3</option>
          </select>
        </label>
        {mode !== "stone" ? <Legend mode={mode} max={vals?.max ?? 1} unit={info.unit} /> : null}
      </div>
      <div className="canvas-wrap">
        {valid && field ? (
          <Canvas key={Math.round(size * 100)} camera={{ position: [size * 1.1, size * 0.45, size * 1.35], fov: 38 }} gl={{ preserveDrawingBuffer: true, antialias: true }} dpr={[1, 2]} flat>
            <color attach="background" args={["#f1eee8"]} />
            <ambientLight intensity={0.85} />
            <directionalLight position={[2, 3, 5]} intensity={1.0} />
            <directionalLight position={[-3, -1, -4]} intensity={0.35} />
            <Panel input={input} field={field} mode={mode} thicknessScale={thicknessScale} onProbe={setProbe} />
            <OrbitControls makeDefault enableDamping />
          </Canvas>
        ) : (
          <p className="canvas-empty">Complete the inputs to see the panel.</p>
        )}
        {field && k >= 0 ? (
          <div className="probe" role="status">
            x {Math.round(field.xs[k % field.xs.length]!)} mm, y {Math.round(field.ys[Math.floor(k / field.xs.length)]!)} mm · σ {field.sigma[k]!.toFixed(3)} N/mm² · utilisation {Math.round(field.util[k]! * 100)}%
          </div>
        ) : valid ? (
          <div className="probe probe-hint">Point at the stone to read values</div>
        ) : null}
      </div>
      {valid && field ? (
        <p className="dims">
          {length} × {height} × {thickness} mm · {field.spanDirection} span · {thicknessScale !== 1 ? <>thickness drawn ×{thicknessScale}</> : <>true scale</>}
        </p>
      ) : null}
      <p className="caption">
        Colour shows {info.describe}
        {mode === "stress" && vals ? <>, from 0 to the maximum shown of {vals.max.toFixed(3)} N/mm²</> : null}, for the governing combination {field?.combo ?? ""}. The model is a strip spanning between the fixing lines, uniform across its width: it is not a plate analysis. The outer face is towards you; grey parts are the fixings and their brackets{input.system === "rainscreen" ? ", dark bars the support rails" : ""}.
      </p>
    </section>
  );
}

function Legend({ mode, max, unit }: { mode: ColourMode; max: number; unit: string }) {
  const stops = [0, 0.25, 0.5, 0.75, 0.9, 1];
  const gradient = stops
    .map((u) => {
      const [r, g, b] = utilisationColour(u === 1 ? 0.999 : u);
      return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}) ${u * 100}%`;
    })
    .join(", ");
  if (mode !== "utilisation") {
    return (
      <div className="legend" aria-label={`Colour scale from 0 to ${max.toFixed(3)} ${unit}`}>
        <span>0</span>
        <span className="legend-bar" style={{ background: `linear-gradient(90deg, ${gradient})` }} />
        <span>
          {max.toFixed(3)} {unit}
        </span>
      </div>
    );
  }
  return (
    <div className="legend" aria-label="Utilisation colour scale from 0 to 1 and above">
      <span>0</span>
      <span className="legend-bar" style={{ background: `linear-gradient(90deg, ${gradient})` }} />
      <span>1.0</span>
      <span className="legend-over" title="Utilisation above 1.0" />
      <span>&gt;1</span>
    </div>
  );
}
