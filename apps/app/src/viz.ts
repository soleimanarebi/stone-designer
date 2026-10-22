/** Utilisation colour: teal (low) → green → amber (0.85) → red (≥ 1). Returns [r, g, b] in 0..1. */
export function utilisationColour(u: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [0.12, 0.47, 0.62]],
    [0.5, [0.36, 0.7, 0.55]],
    [0.85, [0.95, 0.69, 0.2]],
    [1, [0.85, 0.24, 0.18]],
  ];
  if (!Number.isFinite(u)) return [0.6, 0.6, 0.6];
  if (u >= 1) return [0.72, 0.12, 0.12];
  for (let k = 1; k < stops.length; k++) {
    const [u1, c1] = stops[k]!;
    const [u0, c0] = stops[k - 1]!;
    if (u <= u1) {
      const t = (u - u0) / (u1 - u0);
      return [c0[0] + t * (c1[0] - c0[0]), c0[1] + t * (c1[1] - c0[1]), c0[2] + t * (c1[2] - c0[2])];
    }
  }
  return stops[stops.length - 1]![1];
}

export type ColourMode = "utilisation" | "stress" | "stone";

export const COLOUR_MODES: { value: ColourMode; label: string; unit: string; describe: string }[] = [
  { value: "utilisation", label: "Utilisation", unit: "", describe: "σ/fd from the Annex D one-way model" },
  { value: "stress", label: "Bending stress", unit: "N/mm²", describe: "bending stress σ from the Annex D one-way model" },
  { value: "stone", label: "Stone", unit: "", describe: "the stone itself" },
];

/** Colour for a mode: utilisation uses its pass/fail scale; stress runs 0 to the maximum shown. */
export function modeColour(mode: ColourMode, value: number, max: number): [number, number, number] {
  if (mode === "stone") return [0.86, 0.8, 0.7];
  if (mode === "utilisation") return utilisationColour(value);
  return utilisationColour(max > 0 ? Math.min(value / max, 1) * 0.999 : 0);
}

/** Index of the grid point nearest to (x, y). */
export function nearest(xs: number[], ys: number[], x: number, y: number): number {
  const pick = (v: number[], t: number) => v.reduce((best, p, i) => (Math.abs(p - t) < Math.abs(v[best]! - t) ? i : best), 0);
  return pick(ys, y) * xs.length + pick(xs, x);
}
