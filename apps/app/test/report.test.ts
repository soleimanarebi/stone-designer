import { runChecks } from "@stone/engine";
import { describe, expect, it } from "vitest";
import { DISCLAIMER } from "../src/disclaimer";
import { buildReport, inputRows, pdfText } from "../src/report";
import { TEMPLATES } from "../src/templates";

describe("PDF report", () => {
  it("builds for every template, with the cover, sections and appendices", () => {
    for (const t of TEMPLATES) {
      const r = runChecks(t.input);
      const doc = buildReport(t.input, r, { disclaimer: DISCLAIMER, title: t.name, date: new Date("2026-10-22"), compress: false });
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(5);
      const text = doc.output();
      for (const s of ["Stone structural calculation", "1 Introduction", "2 Design data", "3 Summary and conclusion", "4 Results", "4.5 Result approval", "Appendix A", "Appendix B"]) expect(text).toContain(s);
    }
  });
  it("describes the panel and fixings", () => {
    const rows = inputRows(TEMPLATES[0]!.input);
    expect(rows.find((r) => r[0] === "Panel")?.[1]).toBe("900 x 600 x 50 mm (length x height x thickness)");
    expect(rows.find((r) => r[0] === "Fixings")?.[1]).toContain("top and bottom joints, 180 mm in from each end, 6 mm diameter");
  });
  it("spells out symbols the PDF fonts cannot show", () => {
    expect(pdfText("σ ≤ fd, γm, F∞, √, mm²")).toBe("sigma <= fd, gamma_m, Finf, sqrt, mm2");
  });
  it("refuses invalid inputs", () => {
    const i = structuredClone(TEMPLATES[0]!.input);
    i.geometry.length = -1;
    expect(() => buildReport(i, runChecks(i), { disclaimer: DISCLAIMER })).toThrow();
  });
});
