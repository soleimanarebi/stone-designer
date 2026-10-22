import type { StoneInput } from "@stone/engine";

const W = 96;
const H = 64;
const PAD = 10;

export type Arrangement = "bed" | "side" | "back";

export const ARRANGEMENTS: { value: Arrangement; label: string; hint: string }[] = [
  { value: "bed", label: "Top and bottom joints", hint: "dowels or kerfs" },
  { value: "side", label: "Side joints", hint: "dowels or kerfs" },
  { value: "back", label: "Back anchors", hint: "undercut, rainscreen" },
];

export const arrangementOf = (f: StoneInput["fixings"]): Arrangement => (f.type === "undercut" ? "back" : f.ay === 0 ? "bed" : f.ax === 0 ? "side" : "back");

/** Elevation of a panel with its four fixings (dots) and the span between them (dashed). */
export function FixingThumb({ arrangement, length = 1.5, height = 1, ax, ay }: { arrangement: Arrangement; length?: number; height?: number; ax?: number; ay?: number }) {
  const k = Math.min((W - 2 * PAD) / length, (H - 2 * PAD) / height);
  const pw = length * k;
  const ph = height * k;
  const x0 = (W - pw) / 2;
  const y0 = (H - ph) / 2;
  const fx = ax !== undefined ? ax * k : arrangement === "side" ? 0 : pw / 5;
  const fy = ay !== undefined ? ay * k : arrangement === "bed" ? 0 : ph / 5;
  const pts = [
    [x0 + fx, y0 + fy],
    [x0 + pw - fx, y0 + fy],
    [x0 + fx, y0 + ph - fy],
    [x0 + pw - fx, y0 + ph - fy],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" className="thumb">
      <rect x={x0} y={y0} width={pw} height={ph} rx={1} className="thumb-stone" />
      <line x1={x0 + pw * 0.15} y1={y0 + ph * 0.35} x2={x0 + pw * 0.55} y2={y0 + ph * 0.3} className="thumb-vein" />
      <line x1={x0 + pw * 0.4} y1={y0 + ph * 0.75} x2={x0 + pw * 0.85} y2={y0 + ph * 0.62} className="thumb-vein" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={arrangement === "back" ? 2.6 : 2.2} className={arrangement === "back" ? "thumb-anchor" : "thumb-pin"} />
      ))}
    </svg>
  );
}

/** Section through the wall: handset stone on a loadbearing angle, or a rainscreen panel on rails. */
export function SystemThumb({ system }: { system: StoneInput["system"] }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" className="thumb">
      <rect x={14} y={6} width={14} height={52} className="thumb-backing" />
      {system === "handset" ? (
        <>
          <rect x={52} y={8} width={12} height={22} className="thumb-stone" />
          <rect x={52} y={33} width={12} height={22} className="thumb-stone" />
          <path d="M28 31 H58 V33" className="thumb-fixing" />
          <path d="M28 12 H58" className="thumb-fixing thin" />
        </>
      ) : (
        <>
          <rect x={40} y={6} width={5} height={52} className="thumb-rail" />
          <rect x={58} y={8} width={10} height={22} className="thumb-stone" />
          <rect x={58} y={34} width={10} height={22} className="thumb-stone" />
          <path d="M28 20 H40 M45 32 H63" className="thumb-fixing" />
          <path d="M28 46 H40" className="thumb-fixing" />
        </>
      )}
    </svg>
  );
}

export function TemplateThumb({ input }: { input: StoneInput }) {
  const g = input.geometry;
  return <FixingThumb arrangement={arrangementOf(input.fixings)} length={g.length} height={g.height} ax={input.fixings.ax} ay={input.fixings.ay} />;
}
