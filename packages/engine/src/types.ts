import type { FlexureMethod, System, TestBasis, WindClass } from "./data/bs8298";
import type { Source } from "./data/sources";

export type { FlexureMethod, System, TestBasis, WindClass } from "./data/bs8298";
export type FixingType = "dowel" | "kerf" | "undercut";

/** All lengths mm, pressures kN/m², unit weight kN/m³, loads N unless noted (calc-spec §2). */
export interface StoneInput {
  system: System;
  geometry: {
    /** Horizontal length Lx, mm. */
    length: number;
    /** Height Hy, mm. */
    height: number;
    thickness: number;
    /** Overall length of a return (window reveal, corner), mm. */
    returnLength?: number;
    soffit?: boolean;
  };
  fixings: {
    type: FixingType;
    /** Distance of the fixings in from the left and right ends, mm (0 for side-joint fixings). */
    ax: number;
    /** Distance of the fixings in from the top and bottom, mm (0 for bed-joint fixings). */
    ay: number;
    /** Restraint fixings engaged, n. Default 4 (handset) or 3 (rainscreen). */
    engaged?: number;
    bond?: "stack" | "staggered";
    dowelDiameter?: number;
    loadbearing?: {
      count?: number;
      /** Manufacturer's safe working load per fixing, kN. */
      safeLoad?: number;
      /** Height of the loadbearing fixing above the bottom of the stone, mm. */
      height?: number;
    };
  };
  support?: "base" | "top-hung";
  stone: {
    name: string;
    /** kN/m³. Default 29.43 (3000 kg/m³, BS 8298-3 6.1). */
    unitWeight?: number;
    flexure: TestBasis & {
      /** Characteristic flexural strength, N/mm². */
      fk: number;
      method: FlexureMethod;
      /** Direct γm (stone specialist); replaces Table 4. */
      gammaM?: number;
    };
    breakout: Partial<TestBasis> & {
      /** Characteristic breakout load per fixing, N. Blank skips C2. */
      Rk?: number;
      testedThickness?: number;
      gammaM?: number;
    };
    /** Mean flexural strength, N/mm², for the impact advisory. */
    meanFlexural?: number;
  };
  loads: {
    source: "project" | "tableD1";
    windPressure?: number;
    windSuction?: number;
    windClass?: WindClass;
    /** Uniform lateral imposed load (crowd, barrier), kN/m². */
    imposed?: number;
  };
  factors?: { gammaF?: number; gammaQ?: number; psi?: number; gammaG?: number };
  thermal?: {
    alphaFrame: number;
    alphaCladding: number;
    frameErection: number;
    frameSummer: number;
    frameWinter: number;
    claddingErection: number;
    claddingSummer: number;
    claddingWinter: number;
    /** Distance between movement joints, m. */
    jointSpacing: number;
    /** Sealant movement capability, %. */
    sealantStrain: number;
    /** Joint width provided, mm. */
    jointWidth: number;
  };
  options?: { flexureUtilisation?: "stress" | "thickness" };
}

export type CheckId = "C1" | "C2" | "C3" | "C4" | "C5";

export interface CheckResult {
  id: CheckId;
  title: string;
  /** Governing combination, where loads are involved. */
  combo?: string;
  demand: number;
  capacity: number;
  unit: string;
  utilisation: number;
  pass: boolean;
  working: string[];
  sources: Source[];
}

export interface Combination {
  id: string;
  label: string;
  /** Design lateral pressure, N/mm². */
  qd: number;
  expression: string;
}

export interface ComplianceItem {
  id: string;
  title: string;
  pass: boolean;
  message: string;
  sources: Source[];
}

export interface Advisory {
  id: string;
  message: string;
  source: Source;
}

export interface NotCovered {
  id: string;
  title: string;
  reason: string;
  source?: Source;
}

export interface InputError {
  field: string;
  message: string;
  source?: Source;
}

export interface GammaM {
  value: number;
  /** Table 4 components, or null when γm was entered directly. */
  components: { F0: number; FLEV: number; F34: number; FH2O: number; FN: number; Falpha: number; Finf: number } | null;
}

export interface Derived {
  system: System;
  standard: string;
  /** Spans, mm. */
  sx: number;
  sy: number;
  L: number;
  b: number;
  spanDirection: "horizontal" | "vertical";
  overhang: number;
  area: number;
  n: number;
  gammaF: number;
  gammaQ: number;
  psi: number;
  gammaG: number;
  /** Characteristic pressures, kN/m². */
  windPressure: number;
  windSuction: number;
  imposed: number;
  unitWeight: number;
  /** Panel weight, N. */
  weight: number;
  gammaMFlexure: GammaM;
  gammaMBreakout: GammaM | null;
  fd: number;
  Rd: number | null;
  /** Governing design pressure, N/mm². */
  qd: number;
  Mf: number;
  Zreq: number;
  treq: number;
  W: number;
  Fd: number;
}

export type EngineResult =
  | { ok: false; errors: InputError[] }
  | {
      ok: true;
      pass: boolean;
      governing: CheckResult;
      checks: CheckResult[];
      combinations: Combination[];
      compliance: ComplianceItem[];
      advisories: Advisory[];
      notCovered: NotCovered[];
      derived: Derived;
    };

/** Stress and utilisation over the face for the 3D view (calc-spec §10). */
export interface PanelField {
  xs: number[];
  ys: number[];
  /** Index iy·nx + ix. */
  sigma: Float64Array;
  util: Float64Array;
  combo: string;
  fd: number;
  spanDirection: "horizontal" | "vertical";
  /** Fixing positions, mm from the bottom-left corner. */
  fixings: { x: number; y: number }[];
}
