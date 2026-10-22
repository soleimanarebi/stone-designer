import { panelField, runChecks } from "@stone/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { verdictOf } from "../src/App";
import { Inputs } from "../src/components/Inputs";
import { Verification } from "../src/components/Verification";
import { fixingParts, viewValues } from "../src/components/Viewer";
import { TEMPLATES } from "../src/templates";
import { WIND_EXAMPLE, windLoadFor } from "../src/wind";
import { modeColour, nearest, utilisationColour } from "../src/viz";

afterEach(cleanup);
const byId = (id: string) => TEMPLATES.find((t) => t.id === id)!;
const noWind = { setup: null, outcome: null, toggle: () => {}, set: () => {} };

describe("templates", () => {
  it("all run without input errors and say where their values come from", () => {
    for (const t of TEMPLATES) {
      const r = runChecks(t.input);
      expect(r.ok, t.id).toBe(true);
      expect(t.note).toMatch(/[Ee]xample/);
    }
  });
  it("the handset template is the Annex E example and passes", () => {
    const r = runChecks(byId("handset").input);
    if (!r.ok) throw new Error();
    expect(r.checks.every((c) => c.pass)).toBe(true);
    expect(r.derived.treq).toBeCloseTo(23.85, 2);
    expect(verdictOf(r).tone).toBe("pass");
  });
  it("the shopfront template has no breakout check until Rk is entered", () => {
    const r = runChecks(byId("shopfront").input);
    if (!r.ok) throw new Error();
    expect(r.checks.map((c) => c.id)).not.toContain("C2");
    expect(r.notCovered.map((n) => n.id)).toContain("C2");
  });
});

describe("Verification", () => {
  it("lists checks with working and sources", () => {
    render(<Verification result={runChecks(byId("handset").input)} />);
    expect(screen.getByText("Flexural stress")).toBeTruthy();
    expect(screen.getByText("Fixing breakout")).toBeTruthy();
    expect(screen.getAllByText(/BS8298-2 D.3, Eq. \(D.2\)/).length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toContain("All checks pass");
  });
  it("lists input errors", () => {
    const input = structuredClone(byId("handset").input);
    input.geometry.length = -5;
    render(<Verification result={runChecks(input)} />);
    expect(screen.getByRole("status").textContent).toContain("Inputs incomplete");
    expect(screen.getByText("geometry.length")).toBeTruthy();
  });
});

describe("wind calculator", () => {
  const load = (over: Partial<typeof WIND_EXAMPLE>) => {
    const o = windLoadFor({ ...structuredClone(WIND_EXAMPLE), ...over });
    if (!o.ok) throw new Error(o.errors.join("; "));
    return o.load;
  };
  it("defaults to the ventilated (solid wall) case and gives corner or general suction", () => {
    expect(WIND_EXAMPLE.envelope).toBe("ventilated");
    const corner = load({ face: "E", position: "corner" });
    const general = load({ face: "E", position: "general" });
    expect(corner.governingPressure.zone).toBe("D");
    expect(corner.governingSuction.zone).toBe("A");
    expect(corner.suctionNet).toBeGreaterThan(general.suctionNet);
    expect(load({ face: "E", position: "corner", envelope: "sealed" }).suctionNet).toBeGreaterThan(corner.suctionNet);
  });
  it("applies the CWCT 0.8 kN/m² minimum", () => {
    const l = load({ face: "N", position: "general" });
    expect(l.pressureNet).toBeLessThan(0.8);
    expect(l.pressure).toBe(0.8);
  });
  it("shows the calculator in the loads group and switches back", () => {
    const setup = structuredClone(WIND_EXAMPLE);
    const outcome = windLoadFor(setup);
    const toggles: boolean[] = [];
    const sources: string[] = [];
    const input = structuredClone(byId("handset").input);
    render(
      <Inputs
        input={input}
        templateId="handset"
        onTemplate={() => {}}
        update={(fn) => {
          const d = structuredClone(input);
          fn(d);
          sources.push(d.loads.source);
        }}
        wind={{ setup, outcome, toggle: (on) => toggles.push(on), set: () => {} }}
      />,
    );
    expect(screen.getByText(/Pressure \d+\.\d\d kN\/m²/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Wind load"), { target: { value: "tableD1" } });
    expect(toggles).toEqual([false]);
    expect(sources).toEqual(["tableD1"]);
  });
});

describe("Inputs", () => {
  it("shows picture cards for templates, systems and fixings and reports edits", () => {
    const edits: string[] = [];
    const input = structuredClone(byId("handset").input);
    render(
      <Inputs
        input={input}
        templateId="handset"
        onTemplate={() => {}}
        wind={noWind}
        update={(fn) => {
          const d = structuredClone(input);
          fn(d);
          edits.push(`${d.system}/${d.fixings.type}/${d.fixings.ax}/${d.fixings.ay}`);
        }}
      />,
    );
    const arr = screen.getByRole("group", { name: "Fixing arrangement" }).querySelectorAll("button");
    expect(arr).toHaveLength(3);
    expect([...arr].every((c) => c.querySelector("svg"))).toBe(true);
    fireEvent.click(arr[2]!);
    expect(edits).toEqual(["rainscreen/undercut/180/120"]);
    expect(screen.getByRole("group", { name: "Cladding system" }).querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Templates" }).querySelectorAll("button")).toHaveLength(TEMPLATES.length);
  });
});

describe("viewer data", () => {
  it("utilisation view peaks at C1 and stress view runs to its maximum", () => {
    const input = byId("handset").input;
    const f = panelField(input)!;
    const r = runChecks(input);
    if (!r.ok) throw new Error();
    expect(viewValues(f, "utilisation").max).toBe(1);
    expect(Math.max(...viewValues(f, "utilisation").value)).toBeCloseTo(r.checks[0]!.utilisation, 9);
    expect(viewValues(f, "stress").max).toBeCloseTo(r.checks[0]!.demand, 9);
  });
  it("draws four fixings with brackets, and rails for rainscreen", () => {
    expect(fixingParts(byId("handset").input, 50).filter((p) => p.kind === "pin")).toHaveLength(4);
    const rs = fixingParts(byId("rainscreen").input, 50);
    expect(rs.filter((p) => p.kind === "rail")).toHaveLength(2);
  });
  it("colours and nearest point", () => {
    expect(utilisationColour(1.2)).toEqual([0.72, 0.12, 0.12]);
    expect(modeColour("stress", 5, 10)).toEqual(utilisationColour(0.5 * 0.999));
    expect(nearest([0, 10, 20], [0, 5], 12, 4)).toBe(4);
  });
});
