import type { StoneInput } from "@stone/engine";

export interface Template {
  id: string;
  label: string;
  name: string;
  /** Where the example values come from. They are examples, not recommendations. */
  note: string;
  input: StoneInput;
}

const PORTLAND: StoneInput["stone"] = {
  name: "Portland limestone (example data)",
  flexure: { fk: 2.99, method: "en13161", basis: "lev", wetDry: "dry-only", sampling: "historical", orientation: "same", freezeThaw: "lt5" },
  breakout: { Rk: 1460, testedThickness: 50, basis: "lev", wetDry: "dry-only", sampling: "historical", orientation: "same", freezeThaw: "lt5" },
};

export const TEMPLATES: Template[] = [
  {
    id: "handset",
    label: "Handset, dowels",
    name: "Traditional handset cladding, BS 8298-2 Annex E",
    note: "Example values from the BS 8298-2:2020 Annex E worked example: Portland limestone, 900 × 600 × 50 mm, dowels at the 1/5 points, Table D.1 low wind, fk 2.99 N/mm² and Rk 1460 N (LEV). Enter your own stone's test data.",
    input: {
      system: "handset",
      geometry: { length: 900, height: 600, thickness: 50 },
      fixings: { type: "dowel", ax: 180, ay: 0, bond: "stack", dowelDiameter: 6 },
      stone: structuredClone(PORTLAND),
      loads: { source: "tableD1", windClass: "low" },
    },
  },
  {
    id: "rainscreen",
    label: "Rainscreen",
    name: "Stone on a rainscreen support system, BS 8298-4 Annex C",
    note: "Example values from the BS 8298-4:2020 Annex C worked example: as the handset example, with three of the four fixings engaged. Enter your own stone's test data.",
    input: {
      system: "rainscreen",
      geometry: { length: 900, height: 600, thickness: 50 },
      fixings: { type: "dowel", ax: 180, ay: 0 },
      stone: structuredClone(PORTLAND),
      loads: { source: "tableD1", windClass: "low" },
    },
  },
  {
    id: "shopfront",
    label: "Shopfront",
    name: "Ground floor shopfront panel with crowd load",
    note: "Example values from the GFS stone calculation template (panel P1): Grigio Alpi limestone 700 × 800 × 75 mm, fk 6.9 N/mm² with γm 10 as in that report, wind +0.91/−0.53 kN/m² and 1.5 kN/m² crowd load, 8 mm pins. No breakout test load is given there, so enter one to check the fixings.",
    input: {
      system: "handset",
      geometry: { length: 700, height: 800, thickness: 75 },
      fixings: { type: "dowel", ax: 140, ay: 0, bond: "stack", dowelDiameter: 8 },
      stone: {
        name: "Grigio Alpi limestone (example data)",
        unitWeight: 27,
        flexure: { fk: 6.9, method: "en12372", gammaM: 10, basis: "mean", wetDry: "dry-only", sampling: "one-set", orientation: "unknown", freezeThaw: "none" },
        breakout: { basis: "mean", wetDry: "dry-only", sampling: "one-set", orientation: "unknown", freezeThaw: "none" },
      },
      loads: { source: "project", windPressure: 0.91, windSuction: 0.53, imposed: 1.5 },
      options: { flexureUtilisation: "thickness" },
    },
  },
];

export const cloneInput = (i: StoneInput): StoneInput => structuredClone(i);

/** Annex B worked example values (informative), offered when the thermal check is switched on. */
export const ANNEX_B_EXAMPLE: NonNullable<StoneInput["thermal"]> = {
  alphaFrame: 13e-6,
  alphaCladding: 10e-6,
  frameErection: 40,
  frameSummer: 30,
  frameWinter: 10,
  claddingErection: 20,
  claddingSummer: 50,
  claddingWinter: -20,
  jointSpacing: 3.5,
  sealantStrain: 10,
  jointWidth: 15,
};
