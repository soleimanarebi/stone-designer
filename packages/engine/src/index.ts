import { field, run } from "./checks";
import type { EngineResult, PanelField, StoneInput } from "./types";

export const ENGINE_VERSION = "0.1.0";

export * from "./types";
export * as bs8298 from "./data/bs8298";
export * as loads from "./data/loads";
export { DOCUMENTS, TODO_VALUE, type DocId, type Source, type Sourced } from "./data/sources";
export { gammaM } from "./resolve";
export { dowelMinimum, gammaMText, returnMultiple } from "./checks";

/** Runs every check for one stone panel (calc-spec §6–8). */
export function runChecks(input: StoneInput): EngineResult {
  return run(input);
}

/** Stress and utilisation over the face for the 3D view (calc-spec §10). */
export function panelField(input: StoneInput, nx?: number, ny?: number): PanelField | null {
  return field(input, nx, ny);
}
