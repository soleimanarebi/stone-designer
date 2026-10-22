import { bs8298, loads as loadData, type StoneInput, type TestBasis } from "@stone/engine";
import type { ReactNode } from "react";
import { ANNEX_B_EXAMPLE, TEMPLATES } from "../templates";
import { Cite, Group, NumberField, SelectField } from "./fields";
import { ARRANGEMENTS, arrangementOf, FixingThumb, SystemThumb, TemplateThumb, type Arrangement } from "./Thumbs";
import { WindCalculator } from "./WindCalculator";
import type { WindLoad, WindSetup } from "../wind";

type Update = (fn: (draft: StoneInput) => void) => void;

function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  return (
    <div className="field">
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
      </label>
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

/** Optional number: blank means "not given" or "use the default". */
function OptionalNumber({ label, value, onChange, unit, hint, placeholder }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; unit?: string; hint?: ReactNode; placeholder?: string }) {
  return <NumberField label={label} value={value} unit={unit} hint={hint} placeholder={placeholder} onChange={(v) => onChange(Number.isNaN(v) ? undefined : v)} />;
}

const opts = <T extends string>(c: bs8298.Choice<T>[]) => c.map((x) => ({ value: x.value, label: `${x.label} (${x.factor.toFixed(2)})` }));

/** Table 4 selections for one set of test data. */
function TestBasisFields({ value, set, flexure }: { value: Partial<TestBasis>; set: (fn: (t: Partial<TestBasis>) => void) => void; flexure: boolean }) {
  return (
    <>
      <SelectField label="Strength value (FLEV)" value={value.basis ?? "mean"} options={opts(bs8298.FLEV)} onChange={(v) => set((t) => void (t.basis = v))} />
      <SelectField label="Wet and dry testing (FH2O)" value={value.wetDry ?? "dry-only"} options={opts(bs8298.FH2O)} onChange={(v) => set((t) => void (t.wetDry = v))} />
      <SelectField label="Test sets and history (FN)" value={value.sampling ?? "one-set"} options={opts(bs8298.FN)} onChange={(v) => set((t) => void (t.sampling = v))} />
      <SelectField label="Orientation (Fα)" value={value.orientation ?? "unknown"} options={opts(bs8298.FALPHA)} onChange={(v) => set((t) => void (t.orientation = v))} />
      <SelectField
        label="Freeze-thaw (F∞)"
        value={value.freezeThaw ?? "none"}
        options={opts(bs8298.FINF)}
        onChange={(v) => set((t) => void (t.freezeThaw = v))}
        hint={<Cite>BS 8298 Table 4{flexure ? "" : "; F3-4 is N/A for breakout"}</Cite>}
      />
    </>
  );
}

const FIX_TYPES: { value: StoneInput["fixings"]["type"]; label: string }[] = [
  { value: "dowel", label: "Dowel (pin)" },
  { value: "kerf", label: "Kerf clip or channel" },
  { value: "undercut", label: "Undercut anchor (rainscreen)" },
];

export interface WindProps {
  setup: WindSetup | null;
  outcome: { ok: true; load: WindLoad } | { ok: false; errors: string[] } | null;
  /** Turns the calculator on (with the example or last values) or off. */
  toggle: (on: boolean) => void;
  set: (fn: (draft: WindSetup) => void) => void;
}

export function Inputs({ input, update, onTemplate, templateId, wind }: { input: StoneInput; update: Update; onTemplate: (id: string) => void; templateId: string; wind: WindProps }) {
  const g = input.geometry;
  const fx = input.fixings;
  const st = input.stone;
  const l = input.loads;
  const fac = input.factors ?? {};
  const template = TEMPLATES.find((t) => t.id === templateId);
  const arrangement = arrangementOf(fx);
  const engagedDefault = bs8298.ENGAGED_DEFAULT[input.system].value;
  const setFac = (fn: (o: NonNullable<StoneInput["factors"]>) => void) => update((d) => fn((d.factors ??= {})));
  const setLb = (fn: (o: NonNullable<StoneInput["fixings"]["loadbearing"]>) => void) =>
    update((d) => {
      const lb = (d.fixings.loadbearing ??= {});
      fn(lb);
      if (lb.safeLoad === undefined && lb.count === undefined && lb.height === undefined) delete d.fixings.loadbearing;
    });
  const preset = loadData.UNIT_WEIGHT_PRESETS.find((p) => Math.abs(p.unitWeight.value - (st.unitWeight ?? loadData.UNIT_WEIGHT_DEFAULT.value)) < 1e-9)?.value ?? "custom";

  const setArrangement = (a: Arrangement) =>
    update((d) => {
      const f = d.fixings;
      if (a === "bed") Object.assign(f, { ax: Math.round(d.geometry.length / 5), ay: 0, type: f.type === "undercut" ? "dowel" : f.type });
      if (a === "side") Object.assign(f, { ax: 0, ay: Math.round(d.geometry.height / 5), type: f.type === "undercut" ? "dowel" : f.type });
      if (a === "back") {
        Object.assign(f, { ax: Math.round(d.geometry.length / 5), ay: Math.round(d.geometry.height / 5), type: "undercut" });
        d.system = "rainscreen";
      }
    });

  return (
    <div className="inputs">
      <div className="templates" role="group" aria-label="Templates">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="template-card" aria-pressed={templateId === t.id} onClick={() => onTemplate(t.id)} title={t.name}>
            <TemplateThumb input={t.input} />
            <span className="template-label">{t.label}</span>
            <span className="template-size">
              {t.input.geometry.length} × {t.input.geometry.height} × {t.input.geometry.thickness}
            </span>
          </button>
        ))}
      </div>
      <p className="hint template-note">{template ? template.note : "Edited: values are your own."}</p>

      <Group title="System">
        <div className="templates arrangements" role="group" aria-label="Cladding system">
          {(["handset", "rainscreen"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className="template-card"
              aria-pressed={input.system === s}
              onClick={() =>
                update((d) => {
                  d.system = s;
                  if (s === "handset" && d.fixings.type === "undercut") Object.assign(d.fixings, { type: "dowel", ay: 0 });
                })
              }
            >
              <SystemThumb system={s} />
              <span className="template-label">{s === "handset" ? "Traditional handset" : "Rainscreen"}</span>
              <span className="template-size">{s === "handset" ? "BS 8298-2:2020" : "BS 8298-4:2020"}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Panel">
        <div className="row three">
          <NumberField label="Length" unit="mm" value={g.length} required onChange={(v) => update((d) => void (d.geometry.length = v))} />
          <NumberField label="Height" unit="mm" value={g.height} required onChange={(v) => update((d) => void (d.geometry.height = v))} />
          <NumberField label="Thickness" unit="mm" value={g.thickness} required onChange={(v) => update((d) => void (d.geometry.thickness = v))} />
        </div>
        <OptionalNumber
          label="Length of return"
          unit="mm"
          value={g.returnLength}
          placeholder="none"
          onChange={(v) => update((d) => void (v === undefined ? delete d.geometry.returnLength : (d.geometry.returnLength = v)))}
          hint={<Cite>Table 6, reveals and corners</Cite>}
        />
        <Check label="Soffit stone" checked={!!g.soffit} onChange={(v) => update((d) => void (v ? (d.geometry.soffit = true) : delete d.geometry.soffit))} />
      </Group>

      <Group title="Fixings">
        <p className="field-label">Arrangement</p>
        <div className="templates arrangements three" role="group" aria-label="Fixing arrangement">
          {ARRANGEMENTS.map((a) => (
            <button key={a.value} type="button" className="template-card" aria-pressed={arrangement === a.value} onClick={() => setArrangement(a.value)}>
              <FixingThumb arrangement={a.value} />
              <span className="template-label">{a.label}</span>
              <span className="template-size">{a.hint}</span>
            </button>
          ))}
        </div>
        <SelectField
          label="Fixing type"
          value={fx.type}
          options={FIX_TYPES.filter((t) => input.system === "rainscreen" || t.value !== "undercut")}
          onChange={(v) =>
            update((d) => {
              d.fixings.type = v;
              if (v === "undercut" && d.fixings.ay === 0) d.fixings.ay = Math.round(d.geometry.height / 5);
              if (v === "undercut" && d.fixings.ax === 0) d.fixings.ax = Math.round(d.geometry.length / 5);
            })
          }
        />
        <div className="row">
          <NumberField label="In from the ends, ax" unit="mm" value={fx.ax} required onChange={(v) => update((d) => void (d.fixings.ax = v))} />
          <NumberField label="In from top/bottom, ay" unit="mm" value={fx.ay} required onChange={(v) => update((d) => void (d.fixings.ay = v))} />
        </div>
        <OptionalNumber
          label="Fixings engaged, n"
          value={fx.engaged}
          placeholder={`${engagedDefault} (default)`}
          onChange={(v) => update((d) => void (v === undefined ? delete d.fixings.engaged : (d.fixings.engaged = v)))}
          hint={<Cite>{input.system === "handset" ? "BS 8298-2 D.4 NOTE: four" : "BS 8298-4 B.4: three of four engage"}</Cite>}
        />
        {input.system === "handset" && fx.type !== "undercut" ? (
          <div className="row">
            <SelectField
              label="Bond"
              value={fx.bond ?? "stack"}
              options={[
                { value: "stack", label: "Stack bonded (1/5 points)" },
                { value: "staggered", label: "½ staggered (1/4 points)" },
              ]}
              onChange={(v) => update((d) => void (d.fixings.bond = v))}
            />
            {fx.type === "dowel" ? (
              <OptionalNumber label="Dowel diameter" unit="mm" value={fx.dowelDiameter} placeholder="not checked" onChange={(v) => update((d) => void (v === undefined ? delete d.fixings.dowelDiameter : (d.fixings.dowelDiameter = v)))} />
            ) : null}
          </div>
        ) : null}
        <p className="field-label">Loadbearing fixings</p>
        <div className="row three">
          <OptionalNumber label="Safe load" unit="kN" value={fx.loadbearing?.safeLoad} placeholder="–" onChange={(v) => setLb((o) => void (v === undefined ? delete o.safeLoad : (o.safeLoad = v)))} />
          <OptionalNumber label="Count" value={fx.loadbearing?.count} placeholder="2" onChange={(v) => setLb((o) => void (v === undefined ? delete o.count : (o.count = v)))} />
          <OptionalNumber label="Height" unit="mm" value={fx.loadbearing?.height} placeholder="–" onChange={(v) => setLb((o) => void (v === undefined ? delete o.height : (o.height = v)))} />
        </div>
        <p className="hint">Safe working load per fixing from the manufacturer; height above the bottom of the stone. <Cite>BS 8298-3 6.3; BS 8298-2 5.12.6</Cite></p>
      </Group>

      <Group title="Stone and test data">
        <div className="field">
          <label htmlFor="stone-name">Stone</label>
          <input id="stone-name" value={st.name} onChange={(e) => update((d) => void (d.stone.name = e.target.value))} />
        </div>
        <div className="row">
          <SelectField
            label="Unit weight"
            value={preset}
            options={[...loadData.UNIT_WEIGHT_PRESETS.map((p) => ({ value: p.value, label: p.label })), { value: "custom", label: "Measured (enter)" }]}
            onChange={(v) =>
              update((d) => {
                const p = loadData.UNIT_WEIGHT_PRESETS.find((x) => x.value === v);
                if (p?.value === "guide") delete d.stone.unitWeight;
                else if (p) d.stone.unitWeight = p.unitWeight.value;
              })
            }
          />
          <NumberField label="Unit weight" unit="kN/m³" value={Number((st.unitWeight ?? loadData.UNIT_WEIGHT_DEFAULT.value).toFixed(3))} onChange={(v) => update((d) => void (d.stone.unitWeight = v))} />
        </div>
        <p className="hint">Use the measured density of the stone where known. <Cite>BS 8298-1 5.1.1; BS 8298-3 6.1</Cite></p>

        <h3 className="subhead">Flexural strength</h3>
        <div className="row">
          <NumberField label="fk" unit="N/mm²" value={st.flexure.fk} required onChange={(v) => update((d) => void (d.stone.flexure.fk = v))} />
          <SelectField label="Test (F3-4)" value={st.flexure.method} options={opts(bs8298.F34)} onChange={(v) => update((d) => void (d.stone.flexure.method = v))} />
        </div>
        <TestBasisFields flexure value={st.flexure} set={(fn) => update((d) => fn(d.stone.flexure))} />
        <OptionalNumber label="γm entered directly" value={st.flexure.gammaM} placeholder="Table 4" onChange={(v) => update((d) => void (v === undefined ? delete d.stone.flexure.gammaM : (d.stone.flexure.gammaM = v)))} hint="Only where proven by a stone specialist (5.6.3.1)." />
        <OptionalNumber label="Mean flexural strength" unit="N/mm²" value={st.meanFlexural} placeholder="for the impact advisory" onChange={(v) => update((d) => void (v === undefined ? delete d.stone.meanFlexural : (d.stone.meanFlexural = v)))} />

        <h3 className="subhead">Fixing breakout</h3>
        <div className="row">
          <OptionalNumber label="Rk per fixing" unit="N" value={st.breakout.Rk} placeholder="not checked" onChange={(v) => update((d) => void (v === undefined ? delete d.stone.breakout.Rk : (d.stone.breakout.Rk = v)))} />
          <OptionalNumber label="Tested thickness" unit="mm" value={st.breakout.testedThickness} onChange={(v) => update((d) => void (v === undefined ? delete d.stone.breakout.testedThickness : (d.stone.breakout.testedThickness = v)))} />
        </div>
        <TestBasisFields flexure={false} value={st.breakout} set={(fn) => update((d) => fn(d.stone.breakout))} />
        <OptionalNumber label="γm entered directly" value={st.breakout.gammaM} placeholder="Table 4" onChange={(v) => update((d) => void (v === undefined ? delete d.stone.breakout.gammaM : (d.stone.breakout.gammaM = v)))} />
      </Group>

      <Group title="Loads">
        <SelectField
          label="Wind load"
          value={wind.setup ? "calculate" : l.source}
          options={[
            { value: "project", label: "Project-specific, from the wind report" },
            { value: "calculate", label: "Calculate (BS EN 1991-1-4, UK NA)" },
            { value: "tableD1", label: "Indicative, Table D.1 (preliminary)" },
          ]}
          onChange={(v) => {
            if (v === "calculate") return wind.toggle(true);
            if (wind.setup) wind.toggle(false);
            update((d) => {
              d.loads.source = v;
              if (v === "tableD1") d.loads.windClass ??= "low";
              delete d.factors?.gammaF;
            });
          }}
        />
        {wind.setup && wind.outcome ? (
          <WindCalculator setup={wind.setup} set={wind.set} outcome={wind.outcome} />
        ) : l.source === "tableD1" ? (
          <SelectField
            label="Wind class"
            value={l.windClass ?? "low"}
            options={(Object.keys(bs8298.TABLE_D1) as bs8298.WindClass[]).map((k) => ({ value: k, label: `${bs8298.TABLE_D1[k].label}, ${bs8298.TABLE_D1[k].value} N/m²: ${bs8298.TABLE_D1[k].describe}` }))}
            onChange={(v) => update((d) => void (d.loads.windClass = v))}
            hint={<Cite>Table D.1 / B.1, γf 1.0 may be assumed</Cite>}
          />
        ) : (
          <div className="row">
            <NumberField label="Wind pressure" unit="kN/m²" value={l.windPressure} onChange={(v) => update((d) => void (d.loads.windPressure = v))} />
            <NumberField label="Wind suction" unit="kN/m²" value={l.windSuction} onChange={(v) => update((d) => void (d.loads.windSuction = v))} />
          </div>
        )}
        <OptionalNumber label="Imposed lateral load" unit="kN/m²" value={l.imposed} placeholder="none" onChange={(v) => update((d) => void (v === undefined ? delete d.loads.imposed : (d.loads.imposed = v)))} hint="Uniform crowd or barrier pressure on the face." />
        <div className="row three">
          <OptionalNumber label="γf wind" value={fac.gammaF} placeholder={l.source === "tableD1" ? "1.0" : "1.5"} onChange={(v) => setFac((o) => void (v === undefined ? delete o.gammaF : (o.gammaF = v)))} />
          <OptionalNumber label="γQ imposed" value={fac.gammaQ} placeholder="1.5" onChange={(v) => setFac((o) => void (v === undefined ? delete o.gammaQ : (o.gammaQ = v)))} />
          <OptionalNumber label="ψ accomp." value={fac.psi} placeholder="0.5" onChange={(v) => setFac((o) => void (v === undefined ? delete o.psi : (o.psi = v)))} />
        </div>
        <p className="hint">
          γf 1.5 for wind <Cite>5.6.2</Cite>; γQ and ψ follow the example report <Cite>REPORT §4.3, OQ-01</Cite>.
        </p>
      </Group>

      <Group title="Thermal movement" defaultOpen={false}>
        <Check
          label="Check joint width (Annex B)"
          checked={!!input.thermal}
          onChange={(v) => update((d) => void (v ? (d.thermal = structuredClone(ANNEX_B_EXAMPLE)) : delete d.thermal))}
          hint="Starts from the Annex B worked example values, which are an example only: enter your frame, stone and sealant data."
        />
        {input.thermal ? (
          <>
            <div className="row">
              <NumberField label="αf frame" unit="×10⁻⁶/°C" value={Number((input.thermal.alphaFrame * 1e6).toPrecision(6))} onChange={(v) => update((d) => void (d.thermal!.alphaFrame = v * 1e-6))} />
              <NumberField label="αc cladding" unit="×10⁻⁶/°C" value={Number((input.thermal.alphaCladding * 1e6).toPrecision(6))} onChange={(v) => update((d) => void (d.thermal!.alphaCladding = v * 1e-6))} />
            </div>
            <div className="row three">
              <NumberField label="Frame, erection" unit="°C" value={input.thermal.frameErection} onChange={(v) => update((d) => void (d.thermal!.frameErection = v))} />
              <NumberField label="Frame, summer" unit="°C" value={input.thermal.frameSummer} onChange={(v) => update((d) => void (d.thermal!.frameSummer = v))} />
              <NumberField label="Frame, winter" unit="°C" value={input.thermal.frameWinter} onChange={(v) => update((d) => void (d.thermal!.frameWinter = v))} />
            </div>
            <div className="row three">
              <NumberField label="Stone, erection" unit="°C" value={input.thermal.claddingErection} onChange={(v) => update((d) => void (d.thermal!.claddingErection = v))} />
              <NumberField label="Stone, summer" unit="°C" value={input.thermal.claddingSummer} onChange={(v) => update((d) => void (d.thermal!.claddingSummer = v))} />
              <NumberField label="Stone, winter" unit="°C" value={input.thermal.claddingWinter} onChange={(v) => update((d) => void (d.thermal!.claddingWinter = v))} />
            </div>
            <div className="row three">
              <NumberField label="Joint spacing" unit="m" value={input.thermal.jointSpacing} onChange={(v) => update((d) => void (d.thermal!.jointSpacing = v))} />
              <NumberField label="Sealant" unit="%" value={input.thermal.sealantStrain} onChange={(v) => update((d) => void (d.thermal!.sealantStrain = v))} />
              <NumberField label="Joint width" unit="mm" value={input.thermal.jointWidth} onChange={(v) => update((d) => void (d.thermal!.jointWidth = v))} />
            </div>
          </>
        ) : null}
      </Group>

      <Group title="Options" defaultOpen={false}>
        <SelectField
          label="Flexure utilisation"
          value={input.options?.flexureUtilisation ?? "stress"}
          options={[
            { value: "stress", label: "Stress ratio σ/fd" },
            { value: "thickness", label: "Thickness ratio treq/t (report style)" },
          ]}
          onChange={(v) => update((d) => void ((d.options ??= {}).flexureUtilisation = v))}
          hint="Both pass exactly when t ≥ treq."
        />
      </Group>
    </div>
  );
}
