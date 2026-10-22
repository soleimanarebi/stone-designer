import {
  DOWEL_MIN,
  DOWEL_SOURCE,
  ENGAGED_DEFAULT,
  GAMMA_F_LIVE,
  GAMMA_M_SPECIALIST,
  IMPACT,
  LOADBEARING_HEIGHT,
  refFor,
  RESTRAINT_POSITION,
  SOFFIT,
  TABLE4_SOURCE,
  TABLE6,
  THERMAL,
  THIN_STONE,
} from "./data/bs8298";
import { GAMMA_G, GAMMA_Q, HAZ_CORNER, LOADBEARING_COUNT, PSI, SAFE_LOAD_SOURCES, UNIT_WEIGHT_DEFAULT } from "./data/loads";
import { src, type Source } from "./data/sources";
import { resolve, type Resolved } from "./resolve";
import type { Advisory, CheckResult, ComplianceItem, Derived, EngineResult, GammaM, NotCovered, PanelField, StoneInput } from "./types";

const r0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const f = (v: number, d = 2) => v.toFixed(d);
const sig = (v: number) => (Math.abs(v) >= 100 ? r0(v) : Math.abs(v) >= 1 ? f(v, 2) : v.toPrecision(3));

const check = (c: Omit<CheckResult, "utilisation" | "pass"> & { utilisation?: number }): CheckResult => {
  const utilisation = c.utilisation ?? c.demand / c.capacity;
  return { ...c, utilisation, pass: utilisation <= 1 + 1e-12 };
};

export function gammaMText(g: GammaM): string {
  if (!g.components) return `γm = ${f(g.value)} (entered directly)`;
  const k = g.components;
  return `γm = F0·FLEV·F3-4·FH2O·FN·Fα·F∞ = ${[k.F0, k.FLEV, k.F34, k.FH2O, k.FN, k.Falpha, k.Finf].map((v) => f(v)).join(" × ")} = ${f(g.value)}`;
}

/** Table 6 multiplier for a thickness (OQ-03); undefined outside 20–75 mm. */
export function returnMultiple(t: number): number | undefined {
  const first = TABLE6[0]!;
  const last = TABLE6[TABLE6.length - 1]!;
  if (t < first.thickness || t > last.thickness) return undefined;
  for (let i = 0; i < TABLE6.length; i++) {
    const row = TABLE6[i]!;
    if (t === row.thickness) return row.multiple;
    const next = TABLE6[i + 1];
    if (next && t > row.thickness && t < next.thickness) return Math.min(row.multiple, next.multiple);
  }
  return undefined;
}

/** Minimum restraint dowel diameter (OQ-04); undefined above 50 mm. */
export const dowelMinimum = (t: number) => DOWEL_MIN.find((r) => t <= r.upTo)?.diameter;

interface Analysis {
  r: Resolved;
  checks: CheckResult[];
  compliance: ComplianceItem[];
  advisories: Advisory[];
  notCovered: NotCovered[];
  derived: Derived;
  governingCombo: { id: string; qd: number };
}

export function analyse(input: StoneInput): { ok: true; a: Analysis } | { ok: false; errors: import("./types").InputError[] } {
  const res = resolve(input);
  if (!res.ok) return res;
  const r = res.r;
  const sys = input.system;
  const ref = (k: Parameters<typeof refFor>[0]) => refFor(k, sys);
  const standard = sys === "handset" ? "BS 8298-2:2020" : "BS 8298-4:2020";
  const annex = sys === "handset" ? "D" : "B";
  const checks: CheckResult[] = [];
  const compliance: ComplianceItem[] = [];
  const advisories: Advisory[] = [];
  const notCovered: NotCovered[] = [];

  const gov = r.combinations.reduce((g, c) => (c.qd > g.qd ? c : g), r.combinations[0]!);
  const qd = gov.qd;
  const { L, b, t } = r;
  const area = r.Lx * r.Hy;

  // C1 Flexure (calc-spec §6.1).
  const fk = input.stone.flexure.fk;
  const fd = fk / r.gmFlex.value;
  const Mf = (qd * b * L * L) / 8;
  const Zreq = Mf / fd;
  const treq = Math.sqrt((6 * Zreq) / b);
  const sigma = (6 * Mf) / (b * t * t);
  const thicknessMode = input.options?.flexureUtilisation === "thickness";
  const flexWorking = [
    `qd = ${gov.expression} kN/m² = ${sig(qd)} N/mm² (${gov.id}, ${gov.label})`,
    `L = ${r0(L)} mm (${r.spanDirection} span between fixings), b = ${r0(b)} mm`,
    `Mf = qd·b·L²/8 = ${sig(qd)} × ${r0(b)} × ${r0(L)}² / 8 = ${r0(Mf)} N·mm`,
    `${gammaMText(r.gmFlex)}`,
    `fd = fk/γm = ${f(fk)} / ${f(r.gmFlex.value)} = ${f(fd, 3)} N/mm²`,
    `Zreq = Mf/fd = ${r0(Zreq)} mm³`,
    `treq = √(6·Zreq/b) = √(6 × ${r0(Zreq)} / ${r0(b)}) = ${f(treq)} mm ${treq <= t + 1e-12 ? "≤" : ">"} t = ${f(t, 0)} mm`,
    `σ = 6·Mf/(b·t²) = ${f(sigma, 3)} N/mm² ${sigma <= fd ? "≤" : ">"} fd = ${f(fd, 3)} N/mm²`,
  ];
  const flexSources = [ref("qd"), r.gammaFSource, ref("moment"), ref("gammaM"), TABLE4_SOURCE, ref("fd"), ref("zreq"), ref("treq")];
  checks.push(
    thicknessMode
      ? check({ id: "C1", title: "Panel thickness for flexure", combo: gov.id, demand: treq, capacity: t, unit: "mm", working: [...flexWorking, "Utilisation = treq/t (report convention)"], sources: [...flexSources, src("GFS", "§4.5 Result approval", "§4.5")] })
      : check({ id: "C1", title: "Flexural stress", combo: gov.id, demand: sigma, capacity: fd, unit: "N/mm²", working: [...flexWorking, `Utilisation = σ/fd = (treq/t)²`], sources: flexSources }),
  );

  // C2 Fixing breakout (calc-spec §6.2).
  const Rk = input.stone.breakout.Rk;
  const W = qd * area;
  const Fd = W / r.n;
  const Rd = Rk / r.gmBreak.value;
  checks.push(
    check({
      id: "C2",
      title: "Fixing breakout",
      combo: gov.id,
      demand: Fd,
      capacity: Rd,
      unit: "N",
      working: [
        `W = qd·A = ${sig(qd)} × ${r0(r.Lx)} × ${r0(r.Hy)} = ${f(W, 1)} N`,
        `Fd = W/n = ${f(W, 1)} / ${r.n} = ${f(Fd, 1)} N`,
        gammaMText(r.gmBreak),
        `Rd = Rk/γm = ${r0(Rk)} / ${f(r.gmBreak.value)} = ${f(Rd, 1)} N ${Rd >= Fd ? "≥" : "<"} Fd`,
      ],
      sources: [ref("totalLoad"), ref("perFixing"), ref("engaged"), TABLE4_SOURCE, ref("rd"), ref("breakoutCheck")],
    }),
  );

  // Dead load (calc-spec §4) and C3 loadbearing fixings (§6.3).
  const gammaN = r.unitWeight * 1e-6; // kN/m³ → N/mm³
  const weight = gammaN * t * area;
  const lb = input.fixings.loadbearing;
  const lbCount = lb?.count ?? LOADBEARING_COUNT.value;
  if (lb?.safeLoad !== undefined) {
    const per = weight / lbCount;
    const safe = lb.safeLoad * 1000;
    checks.push(
      check({
        id: "C3",
        title: "Loadbearing fixing, dead load",
        demand: per,
        capacity: safe,
        unit: "N",
        working: [
          `G = γ·t·Lx·Hy = ${f(r.unitWeight)} kN/m³ × ${r0(t)} × ${r0(r.Lx)} × ${r0(r.Hy)} mm = ${f(weight, 1)} N`,
          `Per loadbearing fixing: G/${lbCount} = ${f(per, 1)} N ≤ safe working load ${r0(safe)} N`,
          `For information, design value γG·G/${lbCount} = ${f(r.gammaG, 2)} × ${f(weight, 1)} / ${lbCount} = ${f((r.gammaG * weight) / lbCount, 1)} N`,
        ],
        sources: [input.stone.unitWeight === undefined ? UNIT_WEIGHT_DEFAULT.source : src("BS8298-1", "5.1.1", 11), LOADBEARING_COUNT.source, ...SAFE_LOAD_SOURCES, GAMMA_G.source],
      }),
    );
  } else {
    notCovered.push({ id: "C3", title: "Loadbearing fixings", reason: "enter the manufacturer's safe working load to check the dead load per fixing", source: SAFE_LOAD_SOURCES[0] });
  }

  // C4 Length of return (§6.4).
  const ret = input.geometry.returnLength;
  if (ret !== undefined) {
    const k = returnMultiple(t);
    if (k === undefined) notCovered.push({ id: "C4", title: "Length of return", reason: `Table 6 covers 20 to 75 mm thick stone; ${t} mm is outside it (OQ-03)`, source: ref("returns") });
    else
      checks.push(
        check({
          id: "C4",
          title: "Length of return",
          demand: ret,
          capacity: k * t,
          unit: "mm",
          working: [`Table 6: t = ${t} mm → overall length of return ≤ ${k} × t = ${r0(k * t)} mm`, `Return ${r0(ret)} mm`],
          sources: [ref("returns")],
        }),
      );
  }

  // C5 Restraint dowel diameter (§6.5).
  const dia = input.fixings.dowelDiameter;
  if (sys === "handset" && input.fixings.type === "dowel" && dia !== undefined) {
    const min = dowelMinimum(t);
    if (min === undefined) notCovered.push({ id: "C5", title: "Restraint dowel diameter", reason: `BS 8298-2 5.12.7 gives minimum dowel sizes up to nominally 50 mm thick units only (OQ-04)`, source: DOWEL_SOURCE });
    else
      checks.push(
        check({
          id: "C5",
          title: "Restraint dowel diameter",
          demand: min,
          capacity: dia,
          unit: "mm",
          working: [`t = ${t} mm → cramps with dowels not less than ${min} mm diameter`, `Dowel ${dia} mm`],
          sources: [DOWEL_SOURCE],
        }),
      );
  }

  // C6 Thermal movement at a joint (§6.6).
  const th = input.thermal;
  if (th) {
    const Ms = 1000 * ((th.frameSummer - th.frameErection) * th.alphaFrame - (th.claddingSummer - th.claddingErection) * th.alphaCladding);
    const Mw = 1000 * ((th.frameWinter - th.frameErection) * th.alphaFrame - (th.claddingWinter - th.claddingErection) * th.alphaCladding);
    const m = Math.max(Math.abs(Ms), Math.abs(Mw));
    const delta = m * th.jointSpacing;
    const req = delta / (th.sealantStrain / 100);
    checks.push(
      check({
        id: "C6",
        title: "Joint width for thermal movement",
        demand: req,
        capacity: th.jointWidth,
        unit: "mm",
        working: [
          `Summer M = 1000[(${th.frameSummer} − ${th.frameErection})·${th.alphaFrame.toExponential(2)} − (${th.claddingSummer} − ${th.claddingErection})·${th.alphaCladding.toExponential(2)}] = ${f(Ms, 3)} mm/m`,
          `Winter M = 1000[(${th.frameWinter} − ${th.frameErection})·${th.alphaFrame.toExponential(2)} − (${th.claddingWinter} − ${th.claddingErection})·${th.alphaCladding.toExponential(2)}] = ${f(Mw, 3)} mm/m`,
          `Movement = ${f(m, 3)} × ${th.jointSpacing} m = ${f(delta, 3)} mm`,
          `Required joint = ${f(delta, 3)} / ${th.sealantStrain}% = ${f(req, 2)} mm ≤ ${th.jointWidth} mm provided`,
        ],
        sources: [THERMAL.summer, THERMAL.winter, THERMAL.joint],
      }),
    );
  }

  // Compliance (calc-spec §7).
  const fx = input.fixings;
  if (sys === "handset" && fx.type !== "undercut") {
    const bond = fx.bond ?? "stack";
    const along = fx.ay === 0 ? { d: fx.ax, len: r.Lx } : { d: fx.ay, len: r.Hy };
    const target = RESTRAINT_POSITION[bond].value * along.len;
    const ok = Math.abs(along.d - target) <= 0.1 * along.len || along.d >= RESTRAINT_POSITION.corner.value;
    compliance.push({
      id: "K1",
      title: "Restraint fixing position",
      pass: ok,
      message: `${r0(along.d)} mm from the corner; ${bond === "stack" ? "1/5" : "1/4"} point = ${r0(target)} mm, or at least ${RESTRAINT_POSITION.corner.value} mm from the corner.`,
      sources: [RESTRAINT_POSITION.corner.source],
    });
  }
  if (input.geometry.soffit) {
    const long = Math.max(r.Lx, r.Hy);
    const short = Math.min(r.Lx, r.Hy);
    const ok = long <= SOFFIT.long.value && short <= SOFFIT.short.value && r.n <= SOFFIT.fixings.value;
    compliance.push({
      id: "K2",
      title: "Soffit stone",
      pass: ok,
      message: `Generally not larger than ${SOFFIT.long.value} × ${SOFFIT.short.value} mm (this ${r0(long)} × ${r0(short)}), and three fixings shown adequate (n = ${r.n}).`,
      sources: [ref("soffit")],
    });
  }
  const tested = input.stone.breakout.testedThickness;
  compliance.push({
    id: "K3",
    title: "Breakout test thickness",
    pass: tested !== undefined && Math.abs(tested - t) < 1e-9,
    message:
      tested === undefined
        ? "Enter the thickness the breakout load was tested at: the capacity is specific to it."
        : tested === t
          ? `Tested at the project thickness, ${t} mm.`
          : `Tested at ${tested} mm, panel ${t} mm: the capacity is specific to the tested thickness.`,
    sources: [ref("testedThickness"), ref("breakoutTest")],
  });
  const gmMax = Math.max(r.gmFlex.value, r.gmBreak.value);
  if (gmMax > GAMMA_M_SPECIALIST.value)
    compliance.push({
      id: "K4",
      title: "Partial material factor above 15",
      pass: false,
      message: `γm = ${f(gmMax)}: the stone should be assessed by a stone specialist familiar with the stone type.`,
      sources: [ref("specialist")],
    });

  // Advisories (calc-spec §8).
  const loads = input.loads;
  if (loads.source === "project" && r.gammaF < GAMMA_F_LIVE.value)
    advisories.push({ id: "A1", message: `γf = ${r.gammaF} is below ${GAMMA_F_LIVE.value}, the ULS value for wind and snow.`, source: ref("gammaF") });
  if (loads.source === "tableD1")
    advisories.push({ id: "A2", message: "Table D.1 indicative wind loads are for preliminary sizing when a project-specific wind calculation cannot be completed.", source: ref("indicativeNote") });
  if (sys === "rainscreen" && r.n > ENGAGED_DEFAULT.rainscreen.value)
    advisories.push({ id: "A3", message: `n = ${r.n} fixings engaged: BS 8298-4 typically assumes only three of four engage, because of tolerances and frame stiffness.`, source: ref("engaged") });
  const span = Math.max(r.sx, r.sy);
  const impact: string[] = [];
  if (t < IMPACT.thickness.value) impact.push(`thickness ${t} mm < 50 mm${input.stone.meanFlexural !== undefined && input.stone.meanFlexural < IMPACT.meanFlexural.value ? " with mean flexural strength < 5 N/mm²" : ""}`);
  if (span > IMPACT.span.value) impact.push(`span between fixings ${r0(span)} mm > 600 mm`);
  if (Math.max(r.Lx, r.Hy) > IMPACT.length.value) impact.push(`panel length ${r0(Math.max(r.Lx, r.Hy))} mm > 900 mm`);
  if (impact.length) advisories.push({ id: "A4", message: `Establish the need for project-specific impact testing: ${impact.join("; ")}.`, source: ref("impact") });
  if (t <= THIN_STONE.value && (input.stone.flexure.wetDry === "dry-only" || input.stone.breakout.wetDry === "dry-only"))
    advisories.push({ id: "A5", message: "Thin stone (50 mm or less) is likely to be saturated in use: test in both wet and dry conditions.", source: ref("wetDry") });
  if (lb?.height !== undefined && lb.height > LOADBEARING_HEIGHT.value)
    advisories.push({ id: "A6", message: `Loadbearing fixing ${lb.height} mm above the bottom of the stone; it should be no more than 150 mm.`, source: LOADBEARING_HEIGHT.source });
  if (r.gmFlex.components === null || r.gmBreak.components === null)
    advisories.push({ id: "A7", message: "γm entered directly: an alternative to Table 4 should only be used where proven by a stone specialist with sufficient and suitable tests and calculations.", source: ref("gammaM") });
  advisories.push({
    id: "A8",
    message:
      fx.type === "dowel"
        ? "Dowel breakout loads should come from tests to BS EN 13364 at the project thickness, orientation and finish (at least ten specimens)."
        : fx.type === "kerf"
          ? `Kerf clip or channel breakout loads should come from tests to ${sys === "handset" ? "BS 8298-2 Annex C" : "BS 8298-4 Annex D"}.`
          : "Undercut anchor capacities should come from tests to BS 8298-4 Annexes E (tension), F (shear) and G (combined).",
    source: ref("breakoutTest"),
  });
  if (fx.type !== "undercut") {
    const d = fx.ay === 0 ? fx.ax : fx.ay;
    if (d < HAZ_CORNER.value * t)
      advisories.push({ id: "A9", message: `Fixing manufacturer guidance (HAZ): pin centre at least 2.5 × t = ${r0(2.5 * t)} mm from the corner (here ${r0(d)} mm). Manufacturer guidance, not BS 8298.`, source: HAZ_CORNER.source });
  }

  notCovered.push(
    { id: "N1", title: "Point load from access equipment", reason: "500 N over 100 × 100 mm (γf 1.0); Annex D treats distributed loads only (OQ-10)", source: ref("pointLoads") },
    { id: "N2", title: "Barrier loads", reason: "BS 6180 is not supplied; enter a uniform imposed pressure if appropriate", source: ref("barrier") },
    { id: "N3", title: "Subframe deflection", reason: "L/500 under serviceability loading, for the subframe designer", source: ref("subframe") },
    { id: "N4", title: "Deflection of the stone", reason: "SLS design is not applicable to stone cladding (5.6.2 NOTE 1); no modulus is supplied (OQ-02)", source: ref("slsNote") },
  );

  const derived: Derived = {
    system: sys,
    standard: `${standard} Annex ${annex}`,
    sx: r.sx,
    sy: r.sy,
    L,
    b,
    spanDirection: r.spanDirection,
    overhang: r.overhang,
    area,
    n: r.n,
    gammaF: r.gammaF,
    gammaQ: r.gammaQ,
    psi: r.psi,
    gammaG: r.gammaG,
    windPressure: r.wp,
    windSuction: r.ws,
    imposed: r.qi,
    unitWeight: r.unitWeight,
    weight,
    gammaMFlexure: r.gmFlex,
    gammaMBreakout: r.gmBreak,
    fd,
    Rd,
    qd,
    Mf,
    Zreq,
    treq,
    W,
    Fd,
  };
  return { ok: true, a: { r, checks, compliance, advisories, notCovered, derived, governingCombo: gov } };
}

export function run(input: StoneInput): EngineResult {
  const res = analyse(input);
  if (!res.ok) return res;
  const a = res.a;
  const governing = a.checks.reduce((g, c) => (c.utilisation > g.utilisation ? c : g), a.checks[0]!);
  return {
    ok: true,
    pass: a.checks.every((c) => c.pass) && a.compliance.every((c) => c.pass),
    governing,
    checks: a.checks,
    combinations: a.r.combinations,
    compliance: a.compliance,
    advisories: a.advisories,
    notCovered: a.notCovered,
    derived: a.derived,
  };
}

/** Annex D one-way strip field over the face (calc-spec §10). */
export function field(input: StoneInput, nx = 41, ny = 41): PanelField | null {
  const res = analyse(input);
  if (!res.ok) return null;
  const { r, derived: d, governingCombo } = res.a;
  const xs = Array.from({ length: nx }, (_, i) => (r.Lx * i) / (nx - 1));
  const ys = Array.from({ length: ny }, (_, j) => (r.Hy * j) / (ny - 1));
  const sigma = new Float64Array(nx * ny);
  const util = new Float64Array(nx * ny);
  const horizontal = d.spanDirection === "horizontal";
  const a = d.overhang;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = horizontal ? xs[i]! : ys[j]!;
      const s = p - a; // distance from the first fixing line
      let M: number;
      if (s < 0) M = (d.qd * d.b * s * s) / 2;
      else if (s > d.L) M = (d.qd * d.b * (s - d.L) ** 2) / 2;
      else M = (d.qd * d.b * s * (d.L - s)) / 2;
      const sg = (6 * M) / (d.b * r.t * r.t);
      sigma[j * nx + i] = sg;
      util[j * nx + i] = sg / d.fd;
    }
  }
  const fixings = [
    { x: r.ax, y: r.ay },
    { x: r.Lx - r.ax, y: r.ay },
    { x: r.ax, y: r.Hy - r.ay },
    { x: r.Lx - r.ax, y: r.Hy - r.ay },
  ];
  return { xs, ys, sigma, util, combo: governingCombo.id, fd: d.fd, spanDirection: d.spanDirection, fixings };
}

export { GAMMA_Q, PSI };
export type { Source };
