import { src, type Sourced } from "./sources";

/** Standard gravity, m/s² (physical constant). */
export const G_ACC = 9.81;

/** BS8298-3 6.1 NOTE 4: 3000 kg/m³ as a general guide to the maximum likely load. */
export const DENSITY_GUIDE: Sourced<number> = { value: 3000, source: src("BS8298-3", "6.1 NOTE 4", 9) };

/** Default unit weight, kN/m³ (calc-spec §3.3). */
export const UNIT_WEIGHT_DEFAULT: Sourced<number> = { value: (DENSITY_GUIDE.value * G_ACC) / 1000, source: DENSITY_GUIDE.source };

/** Manufacturer design weights of stone slabs, kN/m³ (HAZ p.9 of the PDF). Presets only. */
export const UNIT_WEIGHT_PRESETS: { value: string; label: string; unitWeight: Sourced<number> }[] = [
  { value: "guide", label: "General guide, 3000 kg/m³ (BS 8298-3)", unitWeight: UNIT_WEIGHT_DEFAULT },
  { value: "travertine", label: "Travertine 24 kN/m³ (HAZ)", unitWeight: { value: 24, source: src("HAZ", "Design principles, design weight", "9 (PDF)") } },
  { value: "sandstone", label: "Sandstone 26 kN/m³ (HAZ)", unitWeight: { value: 26, source: src("HAZ", "Design principles, design weight", "9 (PDF)") } },
  { value: "limestone", label: "Marble & limestone 27 kN/m³ (HAZ)", unitWeight: { value: 27, source: src("HAZ", "Design principles, design weight", "9 (PDF)") } },
  { value: "granite", label: "Granite 28 kN/m³ (HAZ)", unitWeight: { value: 28, source: src("HAZ", "Design principles, design weight", "9 (PDF)") } },
];

/** Combination of wind with an imposed lateral load (OQ-01): example report §4.3. */
export const GAMMA_Q: Sourced<number> = { value: 1.5, source: src("GFS", "§4.3 Loads combinations (ULS)", "§4.3") };
export const PSI: Sourced<number> = { value: 0.5, source: src("GFS", "§4.3 Loads combinations (ULS)", "§4.3") };
/** Partial factor on dead load, for information (OQ-11). */
export const GAMMA_G: Sourced<number> = { value: 1.35, source: src("HAZ", "Applied loads, dead loads", "9 (PDF)") };

/** Supports in a horizontal joint carry half the slab each (HAZ p.11 of the PDF). */
export const LOADBEARING_COUNT: Sourced<number> = { value: 2, source: src("HAZ", "Load principles", "11 (PDF)") };
/** HAZ tables give working resistance loads. */
export const SAFE_LOAD_SOURCES = [src("BS8298-3", "6.3", 12), src("HAZ", "Technical details note", "33 (PDF)")];

/** HAZ guidance: pin centre at least 2.5 × slab thickness from the corner. */
export const HAZ_CORNER: Sourced<number> = { value: 2.5, source: src("HAZ", "Structure - edge spacing", "9 (PDF)") };
