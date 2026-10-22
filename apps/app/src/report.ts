import { DOCUMENTS, ENGINE_VERSION, type EngineResult, type Source, type StoneInput } from "@stone/engine";
import { jsPDF } from "jspdf";

/**
 * The built-in PDF fonts only cover Latin-1, so Greek letters and maths symbols are spelled out.
 * Anything else outside Latin-1 becomes "?" rather than silently disappearing.
 */
const REPLACEMENTS: [RegExp, string][] = [
  [/γ/g, "gamma_"],
  [/σ/g, "sigma"],
  [/δ/g, "delta"],
  [/φ/g, "phi"],
  [/ϕ/g, "phi"],
  [/ω/g, "omega"],
  [/λ/g, "lambda"],
  [/ψ/g, "psi"],
  [/α/g, "alpha"],
  [/β/g, "beta"],
  [/Δ/g, "Delta "],
  [/Σ/g, "Sum"],
  [/√/g, "sqrt"],
  [/≤/g, "<="],
  [/≥/g, ">="],
  [/≈/g, "~"],
  [/−/g, "-"],
  [/[–—]/g, "-"],
  [/⁴/g, "^4"],
  [/²/g, "2"],
  [/³/g, "3"],
  [/⁻⁶/g, "-6"],
  [/×/g, "x"],
  [/∞/g, "inf"],
  [/½/g, "1/2"],
  [/[‘’]/g, "'"],
  [/[“”]/g, '"'],
  [/…/g, "..."],
  [/→/g, "->"],
  [/·/g, "."],
];

export function pdfText(s: string): string {
  let out = s;
  for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
  return out.replace(/[^\x00-\xff]/g, "?");
}

const fmtSource = (s: Source) => `${s.doc} ${s.ref}, p.${s.page}`;
const pct = (u: number) => `${(u * 100).toFixed(0)}%`;
const BRAND: [number, number, number] = [90, 70, 50];
const GREY: [number, number, number] = [90, 90, 90];

const PAGE = { w: 210, h: 297, margin: 16 };

interface Column {
  title: string;
  width: number;
  align?: "left" | "right";
}

class Writer {
  y = PAGE.margin;
  figure = 0;
  table = 0;
  constructor(
    readonly doc: jsPDF,
    readonly footer: string,
    readonly header: string,
  ) {}

  ensure(height: number) {
    if (this.y + height > PAGE.h - PAGE.margin - 14) {
      this.doc.addPage();
      this.y = PAGE.margin + 4;
    }
  }

  newPage() {
    this.doc.addPage();
    this.y = PAGE.margin + 4;
  }

  heading(text: string, size = 13) {
    this.ensure(size > 12 ? 20 : 12);
    this.y += size > 12 ? 4 : 2;
    this.doc.setFont("helvetica", "bold").setFontSize(size).setTextColor(...BRAND);
    this.doc.text(pdfText(text), PAGE.margin, this.y);
    this.y += size * 0.5;
    this.doc.setTextColor(20, 20, 20);
  }

  paragraph(text: string, { size = 9.5, bold = false, indent = 0, colour }: { size?: number; bold?: boolean; indent?: number; colour?: [number, number, number] } = {}) {
    this.doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
    if (colour) this.doc.setTextColor(...colour);
    const width = PAGE.w - 2 * PAGE.margin - indent;
    const lines = this.doc.splitTextToSize(pdfText(text), width) as string[];
    const lh = size * 0.42;
    for (const line of lines) {
      this.ensure(lh);
      this.doc.text(line, PAGE.margin + indent, this.y);
      this.y += lh;
    }
    this.y += 0.8;
    if (colour) this.doc.setTextColor(20, 20, 20);
  }

  row(label: string, value: string) {
    this.doc.setFont("helvetica", "bold").setFontSize(9.5);
    const labelW = 44;
    const lines = this.doc.splitTextToSize(pdfText(value), PAGE.w - 2 * PAGE.margin - labelW) as string[];
    const lh = 4;
    this.ensure(lines.length * lh);
    this.doc.text(pdfText(label), PAGE.margin, this.y);
    this.doc.setFont("helvetica", "normal");
    lines.forEach((line, k) => this.doc.text(line, PAGE.margin + labelW, this.y + k * lh));
    this.y += lines.length * lh + 0.8;
  }

  /** A numbered table with a shaded header row; rows break across pages with the header repeated. */
  grid(caption: string, cols: Column[], rows: string[][], { size = 8.5 }: { size?: number } = {}) {
    const total = cols.reduce((s, c) => s + c.width, 0);
    const scale = (PAGE.w - 2 * PAGE.margin) / total;
    const widths = cols.map((c) => c.width * scale);
    const lh = size * 0.42;
    const pad = 1.4;
    this.table += 1;
    const head = () => {
      this.doc.setFont("helvetica", "bold").setFontSize(size);
      const cells = cols.map((c, i) => this.doc.splitTextToSize(pdfText(c.title), widths[i]! - 2 * pad) as string[]);
      const h = Math.max(...cells.map((c) => c.length)) * lh + 2 * pad;
      this.ensure(h + lh * 2);
      this.doc.setFillColor(...BRAND).rect(PAGE.margin, this.y, PAGE.w - 2 * PAGE.margin, h, "F");
      this.doc.setTextColor(255, 255, 255);
      let x = PAGE.margin;
      cells.forEach((c, i) => {
        this.doc.text(c, cols[i]!.align === "right" ? x + widths[i]! - pad : x + pad, this.y + pad + lh * 0.8, { align: cols[i]!.align ?? "left" });
        x += widths[i]!;
      });
      this.doc.setTextColor(20, 20, 20);
      this.y += h;
    };
    this.doc.setFont("helvetica", "bold").setFontSize(9);
    this.ensure(20);
    this.doc.setTextColor(...BRAND).text(pdfText(`Table ${this.table}. ${caption}`), PAGE.margin, this.y + 3);
    this.doc.setTextColor(20, 20, 20);
    this.y += 5;
    head();
    rows.forEach((r, ri) => {
      this.doc.setFont("helvetica", "normal").setFontSize(size);
      const cells = r.map((c, i) => this.doc.splitTextToSize(pdfText(c), widths[i]! - 2 * pad) as string[]);
      const h = Math.max(...cells.map((c) => c.length)) * lh + 2 * pad;
      if (this.y + h > PAGE.h - PAGE.margin - 14) {
        this.newPage();
        head();
        this.doc.setFont("helvetica", "normal").setFontSize(size);
      }
      if (ri % 2 === 1) this.doc.setFillColor(244, 240, 233).rect(PAGE.margin, this.y, PAGE.w - 2 * PAGE.margin, h, "F");
      let x = PAGE.margin;
      cells.forEach((c, i) => {
        this.doc.text(c, cols[i]!.align === "right" ? x + widths[i]! - pad : x + pad, this.y + pad + lh * 0.8, { align: cols[i]!.align ?? "left" });
        x += widths[i]!;
      });
      this.y += h;
    });
    this.doc.setDrawColor(...BRAND).setLineWidth(0.3).line(PAGE.margin, this.y, PAGE.w - PAGE.margin, this.y);
    this.y += 4;
  }

  image(dataUrl: string, aspect: number, caption: string) {
    const w = PAGE.w - 2 * PAGE.margin;
    const h = Math.min(w / aspect, 100);
    this.ensure(h + 10);
    this.doc.addImage(dataUrl, "PNG", PAGE.margin + (w - h * aspect) / 2, this.y, h * aspect, h);
    this.y += h + 4;
    this.figure += 1;
    this.paragraph(`Figure ${this.figure}. ${caption}`, { size: 8.5, colour: GREY });
  }

  space(mm = 2) {
    this.y += mm;
  }

  /** Running header, disclaimer and page numbers on every page after the cover. */
  finish() {
    const n = this.doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      this.doc.setPage(p);
      this.doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY);
      if (p > 1) {
        this.doc.text(pdfText(this.header), PAGE.margin, PAGE.margin - 4);
        this.doc.setDrawColor(214, 205, 190).setLineWidth(0.2).line(PAGE.margin, PAGE.margin - 2.5, PAGE.w - PAGE.margin, PAGE.margin - 2.5);
      }
      const lines = this.doc.splitTextToSize(pdfText(this.footer), PAGE.w - 2 * PAGE.margin - 18) as string[];
      this.doc.text(lines, PAGE.margin, PAGE.h - PAGE.margin + 2 - (lines.length - 1) * 2.8);
      this.doc.text(`Page ${p} of ${n}`, PAGE.w - PAGE.margin, PAGE.h - PAGE.margin + 2, { align: "right" });
    }
  }
}


export interface ReportOptions {
  /** PNG data URL of the 3D view. */
  snapshot?: string;
  snapshotAspect?: number;
  disclaimer: string;
  /** Panel name for the title block. */
  title?: string;
  /** Defaults to now. */
  date?: Date;
  /** Compress page streams (default true; tests read the text). */
  compress?: boolean;
}

const ABBREVIATIONS: [string, string][] = [
  ["W+ / W-", "Wind pressure / wind suction"],
  ["I", "Imposed lateral load (crowd or barrier pressure)"],
  ["ULS", "Ultimate limit state"],
  ["LEV", "Lower expected value of strength"],
  ["gamma_f, gamma_Q, psi", "Partial load factors and combination factor"],
  ["gamma_m", "Partial material factor, BS 8298 Table 4"],
  ["fk, fd", "Characteristic and design flexural strength"],
  ["Rk, Rd", "Characteristic and design breakout capacity of a fixing"],
  ["Mf", "Peak flexural design moment"],
  ["Zreq, treq", "Required elastic section modulus and thickness"],
  ["L, b", "Maximum distance between fixings, and panel width perpendicular to it"],
  ["n", "Number of restraint fixings engaged"],
  ["BS", "British Standard"],
  ["EN", "European Standard"],
];

const UNITS: [string, string][] = [
  ["mm", "Length, thickness"],
  ["N/mm2", "Stress, strength, design pressure"],
  ["kN/m2", "Characteristic area loads"],
  ["kN/m3", "Unit weight"],
  ["N, kN", "Fixing loads and capacities"],
  ["N.mm", "Bending moment"],
];

const FIX: Record<string, string> = { dowel: "dowels (pins)", kerf: "kerf clips or channels", undercut: "undercut anchors" };

/** Plain-text summary of the inputs, one row per item (label, value). */
export function inputRows(input: StoneInput): [string, string][] {
  const g = input.geometry;
  const fx = input.fixings;
  const rows: [string, string][] = [];
  rows.push(["System", input.system === "handset" ? "Traditional handset external cladding, BS 8298-2:2020" : "Stone cladding on a rainscreen support system, BS 8298-4:2020"]);
  rows.push(["Stone", input.stone.name || "-"]);
  rows.push(["Panel", `${g.length} x ${g.height} x ${g.thickness} mm (length x height x thickness)${g.soffit ? ", soffit" : ""}`]);
  const where = fx.type === "undercut" || (fx.ax > 0 && fx.ay > 0) ? `in the back face, ${fx.ax} mm in from the ends and ${fx.ay} mm from top and bottom` : fx.ay === 0 ? `in the top and bottom joints, ${fx.ax} mm in from each end` : `in the side joints, ${fx.ay} mm in from top and bottom`;
  rows.push(["Fixings", `four ${FIX[fx.type]} ${where}${fx.dowelDiameter ? `, ${fx.dowelDiameter} mm diameter` : ""}`]);
  if (g.returnLength) rows.push(["Return", `${g.returnLength} mm`]);
  const l = input.loads;
  rows.push(["Wind", l.source === "tableD1" ? `Table D.1 indicative class ${l.windClass}` : `+${l.windPressure ?? 0} / -${l.windSuction ?? 0} kN/m2 characteristic (project-specific)`]);
  if (l.imposed) rows.push(["Imposed", `${l.imposed} kN/m2 uniform lateral load`]);
  return rows;
}

/** Build the report document. Throws if the inputs are invalid, since there is nothing to report. */
export function buildReport(input: StoneInput, result: EngineResult, opts: ReportOptions): jsPDF {
  if (!result.ok) throw new Error("Cannot build a report while inputs are invalid.");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: opts.compress ?? true });
  const title = opts.title ?? "Stone panel";
  doc.setProperties({ title: `Stone structural calculation: ${title}`, creator: `Stone Designer (engine ${ENGINE_VERSION})` });
  const date = (opts.date ?? new Date()).toISOString().slice(0, 10);
  const w = new Writer(doc, opts.disclaimer, `Stone Designer · Stone structural calculation · ${title} · ${date}`);
  const d = result.derived;
  const checksPass = result.checks.every((c) => c.pass);
  const compliancePass = result.compliance.every((c) => c.pass);
  const c1 = result.checks.find((c) => c.id === "C1")!;
  const c2 = result.checks.find((c) => c.id === "C2");
  const gm = (g: typeof d.gammaMFlexure) =>
    g.components ? [g.components.F0, g.components.FLEV, g.components.F34, g.components.FH2O, g.components.FN, g.components.Falpha, g.components.Finf].map((v) => v.toFixed(2)) : ["entered", "-", "-", "-", "-", "-", "-"];

  // Cover and title block.
  doc.setFillColor(...BRAND).rect(0, 0, PAGE.w, 42, "F");
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(255, 255, 255).text("Stone structural calculation", PAGE.margin, 22);
  doc.setFont("helvetica", "normal").setFontSize(11).text(pdfText(title), PAGE.margin, 32);
  w.y = 54;
  doc.setTextColor(20, 20, 20);
  w.grid("Title block", [{ title: "Item", width: 30 }, { title: "Details", width: 70 }], [
    ["Panel", title],
    ["Stone", input.stone.name || "-"],
    ["Date", date],
    ["Prepared with", `Stone Designer, engine ${ENGINE_VERSION}`],
    ["Basis", `${d.standard}, partial material factors to Table 4`],
    ["Status", "Design aid output for checking by a qualified structural engineer"],
  ]);
  w.space(4);
  w.paragraph(
    `${checksPass ? (compliancePass ? "ALL CHECKS PASS" : "STRUCTURAL CHECKS PASS, COMPLIANCE ITEMS TO RESOLVE") : "FAILS"}. Governing: ${result.governing.title}, utilisation ${pct(result.governing.utilisation)}.`,
    { size: 12, bold: true, colour: checksPass ? (compliancePass ? [22, 110, 60] : [150, 100, 10]) : [170, 30, 30] },
  );
  w.space(2);
  w.paragraph(
    "Copyright and use: this report is produced from the inputs entered by the user. It contains no information from the reference standards beyond clause references and the values needed to show the working.",
    { size: 8.5, colour: GREY },
  );
  w.paragraph(opts.disclaimer, { size: 8.5, colour: GREY });
  w.heading("Contents", 11);
  for (const line of ["1 Introduction", "2 Design data", "3 Summary and conclusion", "4 Results", "5 Compliance and notes", "Appendix A: Abbreviations and units", "Appendix B: Working for each check"]) w.paragraph(line, { size: 9.5 });

  // 1 Introduction.
  w.newPage();
  w.heading("1 Introduction");
  w.heading("1.1 Panel description", 11);
  for (const [label, value] of inputRows(input)) w.row(label, value);
  if (opts.snapshot) w.image(opts.snapshot, opts.snapshotAspect ?? 16 / 9, "3D view of the panel from outside, coloured as selected in the checker. Fixings and brackets in grey.");
  w.heading("1.2 Scope", 11);
  w.paragraph(
    "The report checks the suitability of the stone panel (size and thickness) for the lateral design loads and the fixing breakout capacity, following the panel thickness method of " +
      `${d.standard}, and the further checks listed in section 4. It does not cover the subframe or support rails, the anchors into the backing structure, impact resistance, ` +
      "point loads from access equipment, fire, or the durability of the stone.",
  );

  // 2 Design data.
  w.heading("2 Design data");
  w.heading("2.1 Norms and standard codes", 11);
  const used = new Set<string>();
  for (const c of result.checks) for (const s of c.sources) used.add(s.doc);
  for (const a of result.advisories) used.add(a.source.doc);
  for (const c of result.compliance) for (const s of c.sources) used.add(s.doc);
  [...used].sort().forEach((id, i) => w.paragraph(`[${i + 1}] ${DOCUMENTS[id as keyof typeof DOCUMENTS].title} (${id})`));
  w.heading("2.2 Methodology", 11);
  w.paragraph(
    `The panel is treated as a strip of width b = ${Math.round(d.b)} mm spanning L = ${Math.round(d.L)} mm, the maximum distance between fixings (${d.spanDirection} span), with Mf = qd.b.L^2/8. ` +
      "The required thickness follows from the design flexural strength fd = fk/gamma_m; the fixing load is the total design load shared between the fixings engaged, " +
      `n = ${d.n}, against the design breakout capacity Rd = Rk/gamma_m. The partial material factors are built from Table 4 for the flexural and the breakout test data separately. ` +
      "Serviceability (deflection) design is not applicable to stone cladding (5.6.2 NOTE 1).",
  );

  // 3 Summary and conclusion.
  w.heading("3 Summary and conclusion");
  w.paragraph(
    `${input.stone.name || "The stone"}, ${input.geometry.length} x ${input.geometry.height} x ${input.geometry.thickness} mm: ` +
      `required thickness for flexure ${d.treq.toFixed(1)} mm against ${input.geometry.thickness} mm provided` +
      (c2 ? `; design load per fixing ${d.Fd.toFixed(0)} N against a design breakout capacity of ${(d.Rd ?? 0).toFixed(0)} N` : "; the fixing breakout was not checked (no test load entered)") +
      `. ${checksPass ? "All structural checks are within the allowable limits." : "One or more checks exceed the allowable limits."}` +
      (compliancePass ? "" : " Compliance items listed in section 5 are to be resolved."),
  );
  w.grid(
    "Summary of results",
    [{ title: "Check", width: 54 }, { title: "Combination", width: 22 }, { title: "Utilisation", width: 16, align: "right" }, { title: "Result", width: 12 }],
    result.checks.map((c) => [`${c.id} ${c.title}`, c.combo ?? "-", pct(c.utilisation), c.pass ? "Pass" : "FAIL"]),
  );

  // 4 Results.
  w.newPage();
  w.heading("4 Results");
  w.heading("4.1 Geometry", 11);
  w.paragraph(
    `Panel ${input.geometry.length} x ${input.geometry.height} x ${input.geometry.thickness} mm, area ${(d.area / 1e6).toFixed(3)} m2. Distance between fixings ${Math.round(d.sx)} mm horizontally and ${Math.round(d.sy)} mm vertically: L = ${Math.round(d.L)} mm, b = ${Math.round(d.b)} mm.`,
  );
  w.heading("4.2 Material properties", 11);
  w.paragraph(
    `Characteristic flexural strength fk = ${input.stone.flexure.fk} N/mm2${input.stone.breakout.Rk !== undefined ? `; characteristic breakout capacity Rk = ${input.stone.breakout.Rk} N per fixing${input.stone.breakout.testedThickness ? ` (tested at ${input.stone.breakout.testedThickness} mm)` : ""}` : ""}. ` +
      `Unit weight ${d.unitWeight.toFixed(2)} kN/m3, panel weight ${(d.weight / 1000).toFixed(3)} kN.`,
  );
  w.grid(
    "Partial material factor (BS 8298 Table 4)",
    [{ title: "Use", width: 22 }, ...["F0", "FLEV", "F3-4", "FH2O", "FN", "Falpha", "Finf"].map((t) => ({ title: t, width: 10, align: "right" as const })), { title: "gamma_m", width: 12, align: "right" }],
    [
      ["Flexure", ...gm(d.gammaMFlexure), d.gammaMFlexure.value.toFixed(2)],
      ...(d.gammaMBreakout && c2 ? [["Fixing breakout", ...gm(d.gammaMBreakout), d.gammaMBreakout.value.toFixed(2)]] : []),
    ],
  );
  w.paragraph(`Design flexural strength fd = ${input.stone.flexure.fk} / ${d.gammaMFlexure.value.toFixed(2)} = ${d.fd.toFixed(3)} N/mm2${d.Rd !== null && c2 ? `; design breakout capacity Rd = ${d.Rd.toFixed(1)} N` : ""}.`);
  w.heading("4.3 Loads and combinations", 11);
  w.paragraph(
    `Wind pressure +${d.windPressure} kN/m2, wind suction -${d.windSuction} kN/m2${d.imposed ? `, imposed lateral load ${d.imposed} kN/m2` : ""}; gamma_f = ${d.gammaF}${d.imposed ? `, gamma_Q = ${d.gammaQ}, psi = ${d.psi}` : ""}.`,
  );
  w.grid(
    "Load combinations (ULS)",
    [{ title: "Id", width: 18 }, { title: "Combination", width: 48 }, { title: "Expression (kN/m2)", width: 30 }, { title: "qd (N/mm2)", width: 16, align: "right" }],
    result.combinations.map((c) => [c.id, c.label, c.expression, c.qd.toFixed(5)]),
  );
  w.heading("4.4 Safety check (ULS)", 11);
  w.grid(
    "Checks",
    [{ title: "Check", width: 40 }, { title: "Combination", width: 18 }, { title: "Demand", width: 18, align: "right" }, { title: "Limit", width: 18, align: "right" }, { title: "Utilisation", width: 14, align: "right" }, { title: "Pass / Fail", width: 12 }],
    result.checks.map((c) => [`${c.id} ${c.title}`, c.combo ?? "-", `${c.demand.toFixed(c.unit === "N" ? 1 : 3)} ${c.unit}`, `${c.capacity.toFixed(c.unit === "N" ? 1 : 3)} ${c.unit}`, pct(c.utilisation), c.pass ? "Pass" : "FAIL"]),
  );
  const ref = (s: Source | undefined) => (s ? `${s.doc} ${s.ref}` : "");
  const src = (id: string, i: number) => result.checks.find((c) => c.id === id)?.sources[i];
  w.heading("4.5 Result approval (governing combination)", 11);
  const rows: string[][] = [
    ["Partial load factor", "gamma_f", "-", String(d.gammaF), ref(c1.sources[1])],
    ["Partial material factor", "gamma_m", "-", d.gammaMFlexure.value.toFixed(2), ref(c1.sources[3])],
    ["Design flexural strength", "fd = fk/gamma_m", "N/mm2", d.fd.toFixed(3), ref(c1.sources[5])],
    ["Design pressure", `qd (${c1.combo})`, "N/mm2", d.qd.toFixed(5), ref(c1.sources[0])],
    ["Peak flexural design moment", "Mf = qd.b.L^2/8", "N.mm", Math.round(d.Mf).toString(), ref(c1.sources[2])],
    ["Required elastic section modulus", "Zreq = Mf/fd", "mm3", Math.round(d.Zreq).toString(), ref(c1.sources[6])],
    ["Required stone panel thickness", "treq = sqrt(6.Zreq/b)", "mm", d.treq.toFixed(2), ref(c1.sources[7])],
    ["Utilisation", input.options?.flexureUtilisation === "thickness" ? "treq / t" : "sigma / fd", "%", pct(c1.utilisation), ""],
  ];
  if (c2) rows.push(["Total design load", "W = qd.A", "N", d.W.toFixed(1), ref(src("C2", 0))], ["Load per fixing", `Fd = W/n, n = ${d.n}`, "N", d.Fd.toFixed(1), ref(src("C2", 1))], ["Design breakout capacity", "Rd = Rk/gamma_m", "N", (d.Rd ?? 0).toFixed(1), ref(src("C2", 4))], ["Utilisation", "Fd / Rd", "%", pct(c2.utilisation), ref(src("C2", 5))]);
  w.grid("Minimum required thickness and fixing breakout", [{ title: "Quantity", width: 34 }, { title: "Formula", width: 30 }, { title: "Unit", width: 10 }, { title: "Value", width: 14, align: "right" }, { title: "Reference", width: 30 }], rows);

  // 5 Compliance and notes.
  w.heading("5 Compliance and notes");
  for (const c of result.compliance) w.paragraph(`${c.title}: ${c.pass ? "OK" : "TO RESOLVE"}. ${c.message} (${c.sources.map(fmtSource).join("; ")})`);
  for (const n of result.notCovered) w.paragraph(`Not covered: ${n.title}. ${n.reason}`);
  if (result.advisories.length) {
    w.heading("Advisories", 11);
    for (const a of result.advisories) w.paragraph(`${a.message} (${fmtSource(a.source)})`);
  }

  // Appendices.
  w.newPage();
  w.heading("Appendix A: Abbreviations and units");
  w.grid("Abbreviations", [{ title: "Symbol", width: 28 }, { title: "Meaning", width: 72 }], ABBREVIATIONS.map(([a, b]) => [a, b]));
  w.grid("Units", [{ title: "Unit", width: 28 }, { title: "Used for", width: 72 }], UNITS.map(([a, b]) => [a, b]));
  w.newPage();
  w.heading("Appendix B: Working for each check");
  for (const c of result.checks) {
    w.ensure(16);
    w.paragraph(`${c.id} ${c.title}: ${pct(c.utilisation)} ${c.pass ? "PASS" : "FAIL"}`, { bold: true, size: 10 });
    for (const line of c.working) w.paragraph(line, { indent: 3, size: 8.8 });
    w.paragraph(`Sources: ${[...new Set(c.sources.map(fmtSource))].join("; ")}`, { indent: 3, size: 8, colour: GREY });
    w.space(1);
  }

  w.finish();
  return doc;
}

/** Build the report and download it in the browser. */
export function exportReport(input: StoneInput, result: EngineResult, opts: ReportOptions): void {
  const doc = buildReport(input, result, opts);
  const date = (opts.date ?? new Date()).toISOString().slice(0, 10);
  doc.save(`stone-check-${date}.pdf`);
}
