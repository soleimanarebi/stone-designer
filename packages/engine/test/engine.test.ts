import { describe, expect, it } from "vitest";
import { dowelMinimum, gammaM, panelField, returnMultiple, runChecks, type StoneInput } from "../src";

/** BS 8298-2:2020 Annex E: Portland Jordans Whitbed, 900 × 600 × 50, Table D.1 low. */
const annexE = (): StoneInput => ({
  system: "handset",
  geometry: { length: 900, height: 600, thickness: 50 },
  fixings: { type: "dowel", ax: 180, ay: 0, bond: "stack" },
  stone: {
    name: "Portland limestone",
    flexure: { fk: 2.99, method: "en13161", basis: "lev", wetDry: "dry-only", sampling: "historical", orientation: "same", freezeThaw: "lt5" },
    breakout: { Rk: 1460, testedThickness: 50, basis: "lev", wetDry: "dry-only", sampling: "historical", orientation: "same", freezeThaw: "lt5" },
  },
  loads: { source: "tableD1", windClass: "low" },
});

const ok = (input: StoneInput) => {
  const r = runChecks(input);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
};
const byId = (r: ReturnType<typeof ok>, id: string) => r.checks.find((c) => c.id === id)!;

describe("Table 4 partial material factor", () => {
  it("gives 4.20 for the Annex E stone, flexure and breakout", () => {
    const i = annexE();
    expect(gammaM(i.stone.flexure, "en13161")!.value).toBeCloseTo(4.2, 12);
    expect(gammaM(i.stone.breakout)!.value).toBeCloseTo(4.2, 12);
  });
  it("multiplies the worst case of every component", () => {
    const g = gammaM({ basis: "mean", wetDry: "dry-only", sampling: "one-set", orientation: "unknown", freezeThaw: "none" }, "en12372")!;
    expect(g.value).toBeCloseTo(3 * 1.4 * 1.4 * 1.4 * 1.5 * 1.4 * 2.0, 12);
    expect(g.components).toMatchObject({ F0: 3, FLEV: 1.4, F34: 1.4, FN: 1.5, Finf: 2 });
  });
  it("uses an override and flags it", () => {
    const i = annexE();
    i.stone.flexure.gammaM = 10;
    const r = ok(i);
    expect(r.derived.gammaMFlexure).toEqual({ value: 10, components: null });
    expect(r.advisories.map((a) => a.id)).toContain("A7");
  });
  it("raises K4 above 15", () => {
    const i = annexE();
    Object.assign(i.stone.flexure, { basis: "mean", method: "en12372", freezeThaw: "none" });
    const r = ok(i);
    expect(r.compliance.find((c) => c.id === "K4")?.pass).toBe(false);
  });
});

describe("Annex D / Annex B checks", () => {
  it("reproduces BS 8298-2 Annex E", () => {
    const r = ok(annexE());
    expect(r.derived.qd).toBeCloseTo(0.0015, 12);
    expect(r.derived.L).toBe(600);
    expect(r.derived.b).toBe(900);
    expect(r.derived.Mf).toBeCloseTo(60750, 6);
    expect(r.derived.fd).toBeCloseTo(2.99 / 4.2, 12);
    expect(r.derived.treq).toBeCloseTo(Math.sqrt((6 * 60750) / (2.99 / 4.2) / 900), 9);
    expect(r.derived.treq).toBeCloseTo(23.85, 2);
    expect(r.derived.W).toBeCloseTo(810, 9);
    expect(byId(r, "C2").demand).toBeCloseTo(202.5, 9);
    expect(byId(r, "C2").capacity).toBeCloseTo(1460 / 4.2, 9);
    expect(r.pass).toBe(true);
  });
  it("reproduces BS 8298-4 Annex C with three fixings engaged by default", () => {
    const i = annexE();
    i.system = "rainscreen";
    const r = ok(i);
    expect(r.derived.n).toBe(3);
    expect(byId(r, "C2").demand).toBeCloseTo(270, 9);
    expect(r.checks.find((c) => c.id === "C5")).toBeUndefined();
  });
  it("stress mode and thickness mode agree on pass", () => {
    const i = annexE();
    const s = byId(ok(i), "C1");
    i.options = { flexureUtilisation: "thickness" };
    const t = byId(ok(i), "C1");
    expect(s.utilisation).toBeCloseTo(t.utilisation ** 2, 12);
    expect(t.demand).toBeCloseTo(23.85, 2);
    expect(t.unit).toBe("mm");
  });
  it("takes the horizontal span when it is longer", () => {
    const i = annexE();
    i.geometry = { length: 1500, height: 400, thickness: 50 };
    i.fixings.ax = 100;
    const r = ok(i);
    expect(r.derived.spanDirection).toBe("horizontal");
    expect(r.derived.L).toBe(1300);
    expect(r.derived.b).toBe(400);
    expect(r.derived.overhang).toBe(100);
  });
  it("uses γf 1.5 for project loads and combines an imposed load", () => {
    const i = annexE();
    i.loads = { source: "project", windPressure: 0.91, windSuction: 0.53, imposed: 1.5 };
    const r = ok(i);
    expect(r.derived.gammaF).toBe(1.5);
    expect(r.combinations.map((c) => c.id)).toEqual(["W+ lead", "W− lead", "I lead (W+)", "I lead (W−)"]);
    expect(r.combinations[0]!.qd).toBeCloseTo((1.5 * 0.91 + 0.5 * 1.5 * 1.5) / 1000, 12);
    expect(r.derived.qd).toBeCloseTo((0.5 * 1.5 * 0.91 + 1.5 * 1.5) / 1000, 12);
    expect(byId(r, "C1").combo).toBe("I lead (W+)");
  });
  it("flags γf below 1.5 for project loads", () => {
    const i = annexE();
    i.loads = { source: "project", windPressure: 1.5, windSuction: 1.2 };
    i.factors = { gammaF: 1.0 };
    expect(ok(i).advisories.map((a) => a.id)).toContain("A1");
  });
});

describe("other checks", () => {
  it("loadbearing fixing dead load against the safe working load", () => {
    const i = annexE();
    i.fixings.loadbearing = { safeLoad: 0.2 };
    const r = ok(i);
    const c = byId(r, "C3");
    const G = 29.43e-6 * 50 * 900 * 600;
    expect(r.derived.weight).toBeCloseTo(G, 9);
    expect(c.demand).toBeCloseTo(G / 2, 9);
    expect(c.capacity).toBe(200);
  });
  it("Table 6 return lengths", () => {
    expect(returnMultiple(20)).toBe(5);
    expect(returnMultiple(40)).toBe(4);
    expect(returnMultiple(45)).toBe(4);
    expect(returnMultiple(60)).toBe(3);
    expect(returnMultiple(75)).toBe(3);
    expect(returnMultiple(80)).toBeUndefined();
    const i = annexE();
    i.geometry.returnLength = 250;
    const c = byId(ok(i), "C4");
    expect(c.capacity).toBe(200);
    expect(c.pass).toBe(false);
  });
  it("restraint dowel diameter for handset stone", () => {
    expect(dowelMinimum(30)).toBe(3);
    expect(dowelMinimum(35)).toBe(5);
    expect(dowelMinimum(50)).toBe(6);
    expect(dowelMinimum(60)).toBeUndefined();
    const i = annexE();
    i.fixings.dowelDiameter = 5;
    expect(byId(ok(i), "C5").pass).toBe(false);
  });
  it("Annex B thermal movement", () => {
    const i = annexE();
    i.thermal = { alphaFrame: 13e-6, alphaCladding: 10e-6, frameErection: 40, frameSummer: 30, frameWinter: 10, claddingErection: 20, claddingSummer: 50, claddingWinter: -20, jointSpacing: 3.5, sealantStrain: 10, jointWidth: 15 };
    const c = byId(ok(i), "C6");
    expect(c.demand).toBeCloseTo((0.43 * 3.5) / 0.1, 9);
    expect(c.pass).toBe(false); // 15.05 mm needed; Annex B rounds to 1.5 mm → 15 mm
  });
});

describe("compliance and advisories", () => {
  it("restraint position at the 1/5 points passes, a corner fixing fails", () => {
    expect(ok(annexE()).compliance.find((c) => c.id === "K1")?.pass).toBe(true);
    const i = annexE();
    i.fixings.ax = 40;
    expect(ok(i).compliance.find((c) => c.id === "K1")?.pass).toBe(false);
  });
  it("breakout tested at another thickness", () => {
    const i = annexE();
    i.geometry.thickness = 40;
    expect(ok(i).compliance.find((c) => c.id === "K3")?.pass).toBe(false);
  });
  it("soffit size and fixings", () => {
    const i = annexE();
    i.geometry.soffit = true;
    expect(ok(i).compliance.find((c) => c.id === "K2")?.pass).toBe(false); // n = 4
    i.fixings.engaged = 3;
    expect(ok(i).compliance.find((c) => c.id === "K2")?.pass).toBe(true);
  });
  it("impact, wet testing and rainscreen engagement advisories", () => {
    const i = annexE();
    i.system = "rainscreen";
    i.fixings.engaged = 4;
    i.geometry = { length: 1200, height: 600, thickness: 30 };
    const ids = ok(i).advisories.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["A2", "A3", "A4", "A5", "A8"]));
  });
});

describe("optional breakout", () => {
  it("skips C2 without Rk and says so", () => {
    const i = annexE();
    i.stone.breakout = {};
    const r = ok(i);
    expect(r.checks.map((c) => c.id)).toEqual(["C1"]);
    expect(r.notCovered.find((n) => n.id === "C2")?.reason).toContain("202.5 N");
    expect(r.compliance.find((c) => c.id === "K3")).toBeUndefined();
  });
});

describe("input errors", () => {
  it("reports missing strength and bad geometry", () => {
    const i = annexE();
    i.geometry.length = -1;
    i.stone.flexure.fk = NaN;
    const r = runChecks(i);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.field)).toEqual(expect.arrayContaining(["geometry.length", "stone.flexure.fk"]));
  });
  it("refuses top-hung panels and undercut anchors on handset", () => {
    const i = annexE();
    i.support = "top-hung";
    i.fixings.type = "undercut";
    const r = runChecks(i);
    if (r.ok) throw new Error();
    expect(r.errors.map((e) => e.field)).toEqual(expect.arrayContaining(["support", "fixings.type"]));
  });
});

describe("panel field", () => {
  it("peaks at C1 in stress mode and has zero stress on the fixing lines", () => {
    const i = annexE();
    const f = panelField(i)!;
    const c1 = byId(ok(i), "C1");
    expect(Math.max(...f.util)).toBeCloseTo(c1.utilisation, 9);
    expect(f.util[0]).toBeCloseTo(0, 12);
    expect(f.fixings).toHaveLength(4);
  });
  it("is negative-free with overhangs on a horizontal span", () => {
    const i = annexE();
    i.geometry = { length: 1500, height: 400, thickness: 50 };
    i.fixings.ax = 300;
    const f = panelField(i)!;
    expect(Math.min(...f.sigma)).toBeGreaterThanOrEqual(0);
    expect(f.spanDirection).toBe("horizontal");
  });
});
