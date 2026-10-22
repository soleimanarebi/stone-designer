import {
  ENGAGED_DEFAULT,
  F0,
  F34,
  F34_BREAKOUT,
  FALPHA,
  FH2O,
  FINF,
  FLEV,
  FN,
  GAMMA_F_INDICATIVE,
  GAMMA_F_LIVE,
  refFor,
  TABLE_D1,
  type Choice,
  type TestBasis,
} from "./data/bs8298";
import { GAMMA_G, GAMMA_Q, LOADBEARING_COUNT, PSI, UNIT_WEIGHT_DEFAULT } from "./data/loads";
import type { Source } from "./data/sources";
import type { Combination, GammaM, InputError, StoneInput } from "./types";

/** kN/m² → N/mm². */
export const KPA = 1e-3;

const pick = <T extends string>(table: Choice<T>[], v: T) => table.find((c) => c.value === v)?.factor;

/** γm = F0·FLEV·F3-4·FH2O·FN·Fα·F∞ (5.6.3.1 Eq. 3, Table 4). `method` undefined = breakout (F3-4 N/A). */
export function gammaM(t: TestBasis, method?: "en12372" | "en13161", override?: number): GammaM | null {
  if (override !== undefined) return { value: override, components: null };
  const c = {
    F0: method ? F0.flexure.value : F0.breakout.value,
    FLEV: pick(FLEV, t.basis),
    F34: method ? pick(F34, method) : F34_BREAKOUT.value,
    FH2O: pick(FH2O, t.wetDry),
    FN: pick(FN, t.sampling),
    Falpha: pick(FALPHA, t.orientation),
    Finf: pick(FINF, t.freezeThaw),
  };
  if (Object.values(c).some((v) => v === undefined)) return null;
  const k = c as Required<{ [K in keyof typeof c]: number }>;
  return { value: k.F0 * k.FLEV * k.F34 * k.FH2O * k.FN * k.Falpha * k.Finf, components: k };
}

const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const nonNegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

export interface Resolved {
  input: StoneInput;
  Lx: number;
  Hy: number;
  t: number;
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  L: number;
  b: number;
  spanDirection: "horizontal" | "vertical";
  overhang: number;
  n: number;
  gammaF: number;
  gammaFSource: Source;
  gammaQ: number;
  psi: number;
  gammaG: number;
  wp: number;
  ws: number;
  qi: number;
  unitWeight: number;
  gmFlex: GammaM;
  gmBreak: GammaM;
  combinations: Combination[];
}

export function resolve(input: StoneInput): { ok: true; r: Resolved } | { ok: false; errors: InputError[] } {
  const errors: InputError[] = [];
  const sys = input.system;
  const g = input.geometry;
  const fx = input.fixings;
  if (sys !== "handset" && sys !== "rainscreen") errors.push({ field: "system", message: "must be handset or rainscreen" });
  const system = sys === "rainscreen" ? "rainscreen" : "handset";
  for (const k of ["length", "height", "thickness"] as const) if (!positive(g?.[k])) errors.push({ field: `geometry.${k}`, message: "must be a positive number (mm)" });
  if (!nonNegative(fx?.ax)) errors.push({ field: "fixings.ax", message: "must be 0 or more (mm)" });
  if (!nonNegative(fx?.ay)) errors.push({ field: "fixings.ay", message: "must be 0 or more (mm)" });
  if (positive(g?.length) && nonNegative(fx?.ax) && 2 * fx.ax >= g.length) errors.push({ field: "fixings.ax", message: "fixings must lie inside the panel length" });
  if (positive(g?.height) && nonNegative(fx?.ay) && 2 * fx.ay >= g.height) errors.push({ field: "fixings.ay", message: "fixings must lie inside the panel height" });
  if (fx?.type === "undercut" && system === "handset") errors.push({ field: "fixings.type", message: "undercut anchors are covered by BS 8298-4 (rainscreen) only" });
  const n = fx?.engaged ?? ENGAGED_DEFAULT[system].value;
  if (!Number.isInteger(n) || n < 1 || n > 4) errors.push({ field: "fixings.engaged", message: "must be a whole number from 1 to 4", source: refFor("engaged", system) });
  if (input.support === "top-hung") errors.push({ field: "support", message: "panels hung from their top fixings are outside the Annex D method", source: refFor("scope", system) });

  const st = input.stone;
  if (!positive(st?.flexure?.fk)) errors.push({ field: "stone.flexure.fk", message: "enter the characteristic flexural strength from testing (N/mm²)", source: refFor("fd", system) });
  if (!positive(st?.breakout?.Rk)) errors.push({ field: "stone.breakout.Rk", message: "enter the characteristic breakout load from testing (N)", source: refFor("rd", system) });
  if (st?.unitWeight !== undefined && !positive(st.unitWeight)) errors.push({ field: "stone.unitWeight", message: "must be a positive number (kN/m³)" });
  const gmFlex = st?.flexure ? gammaM(st.flexure, st.flexure.method ?? "en12372", st.flexure.gammaM) : null;
  const gmBreak = st?.breakout ? gammaM(st.breakout, undefined, st.breakout.gammaM) : null;
  if (!gmFlex || !(gmFlex.value >= 1)) errors.push({ field: "stone.flexure", message: "complete the test description (Table 4), or enter γm of at least 1", source: refFor("table4", system) });
  if (!gmBreak || !(gmBreak.value >= 1)) errors.push({ field: "stone.breakout", message: "complete the test description (Table 4), or enter γm of at least 1", source: refFor("table4", system) });

  const l = input.loads;
  let wp = NaN;
  let ws = NaN;
  if (l?.source === "tableD1") {
    const row = l.windClass ? TABLE_D1[l.windClass] : undefined;
    if (!row) errors.push({ field: "loads.windClass", message: "choose low, medium or high", source: refFor("tableD1", system) });
    else wp = ws = row.value / 1000;
  } else if (l?.source === "project") {
    wp = l.windPressure ?? 0;
    ws = l.windSuction ?? 0;
    if (!nonNegative(wp)) errors.push({ field: "loads.windPressure", message: "must be 0 or more (kN/m²)" });
    if (!nonNegative(ws)) errors.push({ field: "loads.windSuction", message: "must be 0 or more (kN/m², as a magnitude)" });
  } else errors.push({ field: "loads.source", message: "must be project or tableD1" });
  const qi = l?.imposed ?? 0;
  if (!nonNegative(qi)) errors.push({ field: "loads.imposed", message: "must be 0 or more (kN/m²)" });
  if (nonNegative(wp) && nonNegative(ws) && nonNegative(qi) && wp + ws + qi === 0) errors.push({ field: "loads", message: "enter a wind or imposed load" });

  const f = input.factors ?? {};
  const gammaFDefault = l?.source === "tableD1" ? GAMMA_F_INDICATIVE : GAMMA_F_LIVE;
  const gammaF = f.gammaF ?? gammaFDefault.value;
  const gammaQ = f.gammaQ ?? GAMMA_Q.value;
  const psi = f.psi ?? PSI.value;
  const gammaG = f.gammaG ?? GAMMA_G.value;
  for (const [k, v] of Object.entries({ gammaF, gammaQ, gammaG })) if (!positive(v)) errors.push({ field: `factors.${k}`, message: "must be a positive number" });
  if (!nonNegative(psi) || psi > 1) errors.push({ field: "factors.psi", message: "must be from 0 to 1" });

  const lb = fx?.loadbearing;
  if (lb?.count !== undefined && !(Number.isInteger(lb.count) && lb.count >= 1)) errors.push({ field: "fixings.loadbearing.count", message: "must be a whole number of 1 or more" });
  if (lb?.safeLoad !== undefined && !positive(lb.safeLoad)) errors.push({ field: "fixings.loadbearing.safeLoad", message: "must be a positive number (kN)" });
  if (g?.returnLength !== undefined && !positive(g.returnLength)) errors.push({ field: "geometry.returnLength", message: "must be a positive number (mm)" });
  if (fx?.dowelDiameter !== undefined && !positive(fx.dowelDiameter)) errors.push({ field: "fixings.dowelDiameter", message: "must be a positive number (mm)" });
  const th = input.thermal;
  if (th) {
    for (const [k, v] of Object.entries(th)) if (typeof v !== "number" || !Number.isFinite(v)) errors.push({ field: `thermal.${k}`, message: "must be a number" });
    if (!positive(th.jointSpacing)) errors.push({ field: "thermal.jointSpacing", message: "must be a positive number (m)" });
    if (!positive(th.sealantStrain)) errors.push({ field: "thermal.sealantStrain", message: "must be a positive number (%)" });
    if (!positive(th.jointWidth)) errors.push({ field: "thermal.jointWidth", message: "must be a positive number (mm)" });
  }
  if (errors.length) return { ok: false, errors };

  // Spans (calc-spec §5).
  const Lx = g.length;
  const Hy = g.height;
  const sx = Lx - 2 * fx.ax;
  const sy = Hy - 2 * fx.ay;
  const horizontal = sx > sy;
  const L = horizontal ? sx : sy;
  const b = horizontal ? Hy : Lx;
  const overhang = horizontal ? fx.ax : fx.ay;

  // Combinations (calc-spec §4), qd in N/mm².
  const combinations: Combination[] = [];
  const c = (id: string, label: string, kPa: number, expression: string) => combinations.push({ id, label, qd: kPa * KPA, expression });
  if (qi > 0) {
    c("W+ lead", "wind pressure leading, imposed accompanying", gammaF * wp + psi * gammaQ * qi, `${gammaF}×${wp} + ${psi}×${gammaQ}×${qi}`);
    c("W− lead", "wind suction leading, imposed accompanying", gammaF * ws + psi * gammaQ * qi, `${gammaF}×${ws} + ${psi}×${gammaQ}×${qi}`);
    c("I lead (W+)", "imposed leading, wind pressure accompanying", psi * gammaF * wp + gammaQ * qi, `${psi}×${gammaF}×${wp} + ${gammaQ}×${qi}`);
    c("I lead (W−)", "imposed leading, wind suction accompanying", psi * gammaF * ws + gammaQ * qi, `${psi}×${gammaF}×${ws} + ${gammaQ}×${qi}`);
  } else {
    if (wp > 0) c("W+", "wind pressure", gammaF * wp, `${gammaF}×${wp}`);
    if (ws > 0) c("W−", "wind suction", gammaF * ws, `${gammaF}×${ws}`);
  }

  return {
    ok: true,
    r: {
      input,
      Lx,
      Hy,
      t: g.thickness,
      ax: fx.ax,
      ay: fx.ay,
      sx,
      sy,
      L,
      b,
      spanDirection: horizontal ? "horizontal" : "vertical",
      overhang,
      n,
      gammaF,
      gammaFSource: f.gammaF !== undefined ? refFor("gammaF", system) : gammaFDefault.source,
      gammaQ,
      psi,
      gammaG,
      wp,
      ws,
      qi,
      unitWeight: st.unitWeight ?? UNIT_WEIGHT_DEFAULT.value,
      gmFlex: gmFlex!,
      gmBreak: gmBreak!,
      combinations,
    },
  };
}

export { LOADBEARING_COUNT };
