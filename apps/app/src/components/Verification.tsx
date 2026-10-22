import { DOCUMENTS, type CheckResult, type EngineResult, type Source } from "@stone/engine";

export const formatSource = (s: Source) => `${s.doc} ${s.ref}, p.${s.page}`;

const pct = (u: number) => `${(u * 100).toFixed(0)}%`;
const f = (v: number, d = 2) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-GB") : v.toFixed(d));

function Sources({ sources }: { sources: Source[] }) {
  const unique = [...new Map(sources.map((s) => [formatSource(s), s])).values()];
  return (
    <ul className="sources">
      {unique.map((s) => (
        <li key={formatSource(s)} title={DOCUMENTS[s.doc].title}>
          {formatSource(s)}
        </li>
      ))}
    </ul>
  );
}

function Check({ c }: { c: CheckResult }) {
  return (
    <li className={c.pass ? "pass" : "fail"}>
      <details>
        <summary>
          <span className="check-id">{c.id}</span>
          <span className="check-title">
            {c.title}
            {c.combo ? <span className="muted"> · {c.combo}</span> : null}
          </span>
          <span className="check-u">{pct(c.utilisation)}</span>
          <span className="bar" aria-hidden="true">
            <span style={{ width: `${Math.min(c.utilisation, 1) * 100}%` }} />
          </span>
          <span className="sr-only">{c.pass ? "pass" : "fail"}</span>
        </summary>
        <p className="dc">
          Demand {f(c.demand)} {c.unit} · limit {f(c.capacity)} {c.unit} · <strong>{c.pass ? "PASS" : "FAIL"}</strong>
        </p>
        <ul className="working">
          {c.working.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <Sources sources={c.sources} />
      </details>
    </li>
  );
}

export function Verification({ result }: { result: EngineResult }) {
  if (!result.ok) {
    return (
      <section className="verification" aria-label="Verification" aria-live="polite">
        <div className="verdict verdict-incomplete" role="status">
          <strong>Inputs incomplete</strong>
          <span>{result.errors.length} to fix</span>
        </div>
        <ul className="errors">
          {result.errors.map((e) => (
            <li key={e.field + e.message}>
              <code>{e.field}</code> {e.message}
              {e.source ? <span className="cite"> {formatSource(e.source)}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const d = result.derived;
  const checksPass = result.checks.every((c) => c.pass);
  const compliancePass = result.compliance.every((c) => c.pass);
  const gm = (g: typeof d.gammaMFlexure) =>
    g.components ? `${[g.components.F0, g.components.FLEV, g.components.F34, g.components.FH2O, g.components.FN, g.components.Falpha, g.components.Finf].map((v) => v.toFixed(2)).join(" × ")} = ${g.value.toFixed(2)}` : `${g.value.toFixed(2)} (entered)`;

  return (
    <section className="verification" aria-label="Verification" aria-live="polite">
      <div className={`verdict verdict-${checksPass ? (compliancePass ? "pass" : "incomplete") : "fail"}`} role="status">
        <strong>{checksPass ? (compliancePass ? "All checks pass" : "Checks pass · compliance to resolve") : "Fails"}</strong>
        <span>
          Governing: {result.governing.title}, {pct(result.governing.utilisation)}
        </span>
        <span>
          Required thickness {d.treq.toFixed(1)} mm for flexure · {d.standard}
        </span>
      </div>

      <ol className="checks">
        {result.checks.map((c) => (
          <Check key={c.id} c={c} />
        ))}
      </ol>

      {result.compliance.length ? (
        <div className="note">
          <h3>Compliance</h3>
          <ul>
            {result.compliance.map((c) => (
              <li key={c.id} className={c.pass ? "ok" : "bad"}>
                <strong>
                  {c.title}: {c.pass ? "OK" : "to resolve"}
                </strong>{" "}
                {c.message} <span className="cite">{c.sources.map(formatSource).join("; ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="note">
        <summary>
          <h3>Loads and combinations</h3>
        </summary>
        <table className="table">
          <thead>
            <tr>
              <th>Combination</th>
              <th>qd (kN/m²)</th>
            </tr>
          </thead>
          <tbody>
            {result.combinations.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.id} {c.label}
                  <div className="muted">{c.expression}</div>
                </td>
                <td>{(c.qd * 1000).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          Wind +{d.windPressure} / −{d.windSuction} kN/m², imposed {d.imposed} kN/m²; γf {d.gammaF}, γQ {d.gammaQ}, ψ {d.psi}. Panel weight {(d.weight / 1000).toFixed(3)} kN at {d.unitWeight.toFixed(2)} kN/m³.
        </p>
      </details>

      <details className="note">
        <summary>
          <h3>Spans and material factors</h3>
        </summary>
        <p className="muted">
          Between fixings: {Math.round(d.sx)} mm horizontally, {Math.round(d.sy)} mm vertically → L = {Math.round(d.L)} mm ({d.spanDirection}), b = {Math.round(d.b)} mm; n = {d.n} fixings engaged.
        </p>
        <p className="muted">γm flexure: {gm(d.gammaMFlexure)} → fd = {d.fd.toFixed(3)} N/mm².</p>
        {d.gammaMBreakout && d.Rd !== null ? <p className="muted">γm breakout: {gm(d.gammaMBreakout)} → Rd = {d.Rd.toFixed(1)} N.</p> : null}
      </details>

      {result.notCovered.length ? (
        <div className="note">
          <h3>Not covered</h3>
          <ul>
            {result.notCovered.map((n) => (
              <li key={n.id}>
                {n.title}: {n.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.advisories.length ? (
        <div className="note">
          <h3>Advisories</h3>
          <ul>
            {result.advisories.map((a) => (
              <li key={a.id}>
                {a.message} <span className="cite">{formatSource(a.source)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
