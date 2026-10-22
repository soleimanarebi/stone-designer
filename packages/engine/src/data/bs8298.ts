import { src, type Source, type Sourced } from "./sources";

/**
 * BS 8298-2:2020 (handset) and BS 8298-4:2020 (rainscreen) share clauses 5.4 to 5.7 and the thickness
 * annex word for word, at different clause letters and printed pages. Each entry gives both.
 */
export type System = "handset" | "rainscreen";

type Ref = Record<System, Source>;
const both = (p2: [string, string | number], p4: [string, string | number]): Ref => ({
  handset: src("BS8298-2", p2[0], p2[1]),
  rainscreen: src("BS8298-4", p4[0], p4[1]),
});

export const REF = {
  windLoads: both(["5.4.1", 14], ["5.4.1", 14]),
  indicativeNote: both(["5.4.1 NOTE 1", 14], ["5.4.1 NOTE 1", 14]),
  pointLoads: both(["5.4.3", 15], ["5.4.3", 15]),
  barrier: both(["5.4.4", 15], ["5.4.4", 15]),
  snow: both(["5.4.2", 15], ["5.4.2", 15]),
  wetDry: both(["5.5.4", "16–17"], ["5.5.4", "16–17"]),
  breakoutTest: both(["5.5.3", 16], ["5.5.3", 16]),
  gammaF: both(["5.6.2", 18], ["5.6.2", 18]),
  slsNote: both(["5.6.2 NOTE 1", 18], ["5.6.2 NOTE 1", 18]),
  gammaM: both(["5.6.3.1, Eq. (3)", 19], ["5.6.3.1, Eq. (3)", 19]),
  table4: both(["Table 4", "20–21"], ["Table 4", "20–21"]),
  specialist: both(["5.6.4", 20], ["5.6.4", 20]),
  impact: both(["5.7", 22], ["5.7", 22]),
  subframe: both(["5.3", 14], ["5.3", 14]),
  soffit: both(["5.12.9", 38], ["5.12.5", 34]),
  returns: both(["5.12.13, Table 6", 42], ["5.12.9, Table 6", 37]),
  scope: both(["D.1", 61], ["B.1", "49–50"]),
  tableD1: both(["Table D.1", 61], ["Table B.1", 50]),
  qd: both(["D.3, Eq. (D.1)", 61], ["B.3, Eq. (B.1)", 50]),
  moment: both(["D.3, Eq. (D.2)", 62], ["B.3, Eq. (B.2)", 50]),
  fd: both(["D.3, Eq. (D.3)", 62], ["B.3, Eq. (B.3)", 51]),
  zreq: both(["D.3, Eq. (D.4)", 62], ["B.3, Eq. (B.4)", 51]),
  treq: both(["D.3, Eq. (D.5)", 62], ["B.3, Eq. (B.5)", 51]),
  totalLoad: both(["D.4, Eq. (D.6)", 62], ["B.4, Eq. (B.6)", 51]),
  perFixing: both(["D.4, Eq. (D.7)", 63], ["B.4, Eq. (B.7)", 52]),
  rd: both(["D.4, Eq. (D.8)", 63], ["B.4, Eq. (B.8)", 52]),
  breakoutCheck: both(["D.4, Eq. (D.9)", 63], ["B.4, Eq. (B.9)", 52]),
  testedThickness: both(["D.4, Eq. (D.8) NOTE 2", 63], ["B.4, Eq. (B.8) NOTE 3", 52]),
  engaged: both(["D.4 NOTE", 62], ["B.4 NOTE, Eq. (B.7) NOTE 2", "51–52"]),
  workedExample: both(["Annex E", "64–68"], ["Annex C", "53–57"]),
};

export const refFor = (key: keyof typeof REF, system: System): Source => REF[key][system];

/** Default fixings engaged, n (calc-spec §1). */
export const ENGAGED_DEFAULT: Record<System, Sourced<number>> = {
  handset: { value: 4, source: src("BS8298-2", "D.4 NOTE", 62) },
  rainscreen: { value: 3, source: src("BS8298-4", "B.4 NOTE, Eq. (B.7) NOTE 2", "51–52") },
};

/** Partial load factor for live loads (wind and snow) at ULS. */
export const GAMMA_F_LIVE: Sourced<number> = { value: 1.5, source: src("BS8298-2", "5.6.2", 18) };
/** Partial load factor where Table D.1 indicative loads are used. */
export const GAMMA_F_INDICATIVE: Sourced<number> = { value: 1.0, source: src("BS8298-2", "D.2 NOTE", 61) };

export type WindClass = "low" | "medium" | "high";
/** Table D.1 (BS8298-4 Table B.1): indicative wind pressure, N/m². */
export const TABLE_D1: Record<WindClass, Sourced<number> & { label: string; describe: string }> = {
  low: {
    value: 1500,
    label: "Low",
    describe: "Sheltered, e.g. lower floors in a central urban area",
    source: src("BS8298-2", "Table D.1", 61),
  },
  medium: {
    value: 2250,
    label: "Medium",
    describe: "Exposed, e.g. higher floors of a tall building",
    source: src("BS8298-2", "Table D.1", 61),
  },
  high: { value: 3000, label: "High", describe: "Exposed, e.g. a coastal location", source: src("BS8298-2", "Table D.1", 61) },
};

// ---------------------------------------------------------------- Table 4 partial material factor

const T4 = src("BS8298-2", "Table 4", "20–21");

export type StrengthBasis = "mean" | "lev";
export type FlexureMethod = "en12372" | "en13161";
export type WetDry = "dry-only" | "wet-and-dry";
export type Sampling = "one-set" | "three-sets" | "specialist" | "historical";
export type Orientation = "unknown" | "same" | "isotropic";
export type FreezeThaw = "none" | "lt40" | "lt25" | "lt10" | "lt5";

/** Test description that selects the Table 4 components. */
export interface TestBasis {
  basis: StrengthBasis;
  wetDry: WetDry;
  sampling: Sampling;
  orientation: Orientation;
  freezeThaw: FreezeThaw;
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  factor: number;
}

export const F0 = {
  flexure: { value: 3.0, source: T4 },
  breakout: { value: 3.0, source: T4 },
} satisfies Record<string, Sourced<number>>;

export const FLEV: Choice<StrengthBasis>[] = [
  { value: "lev", label: "Lower expected value (LEV)", factor: 1.0 },
  { value: "mean", label: "Mean strength", factor: 1.4 },
];
export const F34: Choice<FlexureMethod>[] = [
  { value: "en13161", label: "Constant moment, BS EN 13161 (four-point)", factor: 1.0 },
  { value: "en12372", label: "Concentrated load, BS EN 12372 (three-point)", factor: 1.4 },
];
export const FH2O: Choice<WetDry>[] = [
  { value: "dry-only", label: "Dry samples alone", factor: 1.4 },
  { value: "wet-and-dry", label: "Lower of ≥10 dry and ≥10 wet samples", factor: 1.0 },
];
export const FN: Choice<Sampling>[] = [
  { value: "one-set", label: "One set, or historical data out of date", factor: 1.5 },
  { value: "three-sets", label: "Three discrete sets of ≥10, ≥6 months apart", factor: 1.35 },
  { value: "specialist", label: "Three sets chosen by a stone specialist", factor: 1.0 },
  { value: "historical", label: "Historical data > 10 years (EN 12372/13161/1469)", factor: 1.0 },
];
export const FALPHA: Choice<Orientation>[] = [
  { value: "unknown", label: "Varies with orientation, cut in unknown orientation", factor: 1.4 },
  { value: "same", label: "Varies with orientation, cut as intended for use", factor: 1.0 },
  { value: "isotropic", label: "Does not vary with orientation", factor: 1.0 },
];
export const FINF: Choice<FreezeThaw>[] = [
  { value: "none", label: "No freeze-thaw testing", factor: 2.0 },
  { value: "lt40", label: "14 cycles: loss < 40%", factor: 1.65 },
  { value: "lt25", label: "14 cycles: loss < 25%", factor: 1.35 },
  { value: "lt10", label: "14 cycles: loss < 10%", factor: 1.1 },
  { value: "lt5", label: "14 cycles: loss < 5%, or not susceptible", factor: 1.0 },
];
/** F3-4 is "N/A" for fixing breakout (Table E.1 last row): taken as 1.00. */
export const F34_BREAKOUT: Sourced<number> = { value: 1.0, source: src("BS8298-2", "Table E.1", 66) };

export const TABLE4_SOURCE = T4;

/** γm above this needs a stone specialist (5.6.4). */
export const GAMMA_M_SPECIALIST: Sourced<number> = { value: 15, source: src("BS8298-2", "5.6.4", 20) };
/** Strength loss above which a stone specialist should assess the stone (5.6.3.2, 5.6.4). */
export const STRENGTH_LOSS_LIMIT: Sourced<number> = { value: 40, source: src("BS8298-2", "5.6.3.2", 19) };

// ---------------------------------------------------------------- detailing rules

/** Impact testing triggers, 5.7 items a) to c). */
export const IMPACT = {
  thickness: { value: 50, source: src("BS8298-2", "5.7 a)", 22) },
  meanFlexural: { value: 5, source: src("BS8298-2", "5.7 a)", 22) },
  span: { value: 600, source: src("BS8298-2", "5.7 b)", 22) },
  length: { value: 900, source: src("BS8298-2", "5.7 c)", 22) },
} satisfies Record<string, Sourced<number>>;

/** Thin stone that is likely to be saturated in use: test wet and dry (5.5.4). */
export const THIN_STONE: Sourced<number> = { value: 50, source: src("BS8298-2", "5.5.4", "16–17") };

/** Restraint fixing position, handset (5.12.7). */
export const RESTRAINT_POSITION = {
  stack: { value: 1 / 5, source: src("BS8298-2", "5.12.7", 37) },
  staggered: { value: 1 / 4, source: src("BS8298-2", "5.12.7", 37) },
  corner: { value: 75, source: src("BS8298-2", "5.12.7", 37) },
} satisfies Record<string, Sourced<number>>;

/** Loadbearing fixings not more than this above the bottom of the stone (5.12.6). */
export const LOADBEARING_HEIGHT: Sourced<number> = { value: 150, source: src("BS8298-2", "5.12.6", 35) };

/** Soffit stones generally not larger than 900 × 600 mm; three fixings shown adequate. */
export const SOFFIT = {
  long: { value: 900, source: src("BS8298-2", "5.12.9", 38) },
  short: { value: 600, source: src("BS8298-2", "5.12.9", 38) },
  fixings: { value: 3, source: src("BS8298-2", "5.12.9", 38) },
} satisfies Record<string, Sourced<number>>;

/** Table 6: overall length of return as a multiple of the stone thickness. */
export const TABLE6: { thickness: number; multiple: number }[] = [
  { thickness: 20, multiple: 5 },
  { thickness: 30, multiple: 5 },
  { thickness: 40, multiple: 4 },
  { thickness: 50, multiple: 4 },
  { thickness: 75, multiple: 3 },
];

/** 5.12.7: minimum restraint dowel diameter by nominal unit thickness (handset). */
export const DOWEL_MIN: { upTo: number; diameter: number }[] = [
  { upTo: 30, diameter: 3 },
  { upTo: 40, diameter: 5 },
  { upTo: 50, diameter: 6 },
];
export const DOWEL_SOURCE = src("BS8298-2", "5.12.7", "37–38");

/** Annex B thermal movement (informative). */
export const THERMAL = {
  summer: src("BS8298-2", "Annex B, Eq. (B.1)", 57),
  winter: src("BS8298-2", "Annex B, Eq. (B.2)", 58),
  joint: src("BS8298-2", "Annex B", 58),
};
