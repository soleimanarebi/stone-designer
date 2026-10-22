# Stone Designer — calculation spec, release 1

This is the calculation spec for release 1. The engine (`packages/engine`) implements this and
nothing else; any change starts here. Every value cites its document, clause and printed page
(document ids in §9). Values the documents do not give are `TODO_VALUE` and are listed in
`docs/open-questions.md` (OQ-xx).

Units inside the engine: N, mm, N/mm². Inputs in kN/m² (pressures), kN/m³ (unit weight) and
kN (fixing resistances) are converted at the edge: 1 kN/m² = 10⁻³ N/mm², 1 kN/m³ = 10⁻⁶ N/mm³.

## 1. Scope

One flat, rectangular natural stone cladding panel, vertical, restrained by four fixings.

| System | Standard | Default fixings engaged, n |
| --- | --- | --- |
| `handset` traditional handset external cladding | BS8298-2 | 4 (D.4 NOTE, p.62) |
| `rainscreen` stone cladding on a rainscreen support system | BS8298-4 | 3 (B.4 NOTE and NOTE 2, p.51–52) |

Fixing types (drawing, test reference and advisories only; the checks are the same):

| Type | Where | Breakout test |
| --- | --- | --- |
| `dowel` | in the bed or side joints | BS EN 13364 (BS8298-2 5.5.3 a, p.16; BS8298-4 5.5.3 a) |
| `kerf` | kerf clip or channel in the joints | BS8298-2 Annex C; BS8298-4 Annex D |
| `undercut` (rainscreen only) | undercut anchors in the back face | BS8298-4 Annexes E, F, G |

Panel geometry: length `Lx` (horizontal), height `Hy`, thickness `t`. The four fixings sit at
(ax, ay), (Lx−ax, ay), (ax, Hy−ay), (Lx−ax, Hy−ay) measured from the bottom-left corner:

- dowels or kerfs in the top and bottom joints: ay = 0, ax = the distance in from each end;
- dowels or kerfs in the side joints: ax = 0, ay = the distance in from top and bottom;
- undercut anchors in the back: both non-zero.

Not covered (reported in `notCovered`): point loads from access equipment (BS8298-2 5.4.3, p.15);
barrier loads per BS 6180 (5.4.4, not supplied) other than as a uniform imposed pressure (§4);
snow (5.4.2); soft and hard body impact (5.7, an advisory only); subframe deflection L/500 (5.3,
p.14); anchor bolts into the backing (5.12.11, BS 8539 not supplied); stone-faced precast
(BS8298-3, number of pins by test with a factor of 8, 6.2.2 p.12); curved, L-shaped or carved
stones other than the return length rule (§6.4); in-plane compression (Annex D.1 i, p.61).

Panels hung from their top fixings are outside Annex D (D.1 ii, p.61; B.1 ii, p.50): the input
`support = "top-hung"` stops the run with an error.

## 2. Inputs

| Field | Unit | Notes |
| --- | --- | --- |
| `system` | – | `handset` or `rainscreen` |
| `geometry.length`, `height`, `thickness` | mm | > 0 |
| `geometry.returnLength` | mm | optional, §6.4 |
| `geometry.soffit` | – | optional; soffit rules §7 |
| `fixings.type` | – | `dowel`, `kerf`, `undercut` |
| `fixings.ax`, `fixings.ay` | mm | §1 |
| `fixings.engaged` | – | n, 1 to 4; default per §1 |
| `fixings.bond` | – | `stack` or `staggered` (handset position rule §7) |
| `fixings.dowelDiameter` | mm | optional, §6.5 |
| `fixings.loadbearing` | – | optional: `count` (default 2) and `safeLoad` kN per fixing, §6.3 |
| `support` | – | `base` (default) or `top-hung` |
| `stone.name`, `stone.unitWeight` | –, kN/m³ | unit weight default §3.3 |
| `stone.flexure` | – | `fk` N/mm² and the test description §3.1 |
| `stone.breakout` | – | `Rk` N per fixing (optional: blank skips C2, listed as not covered), `testedThickness` mm, and the test description §3.1 |
| `stone.meanFlexural` | N/mm² | optional, for the impact advisory A4 |
| `loads.source` | – | `project` (BS EN 1991-1-4, by the user) or `tableD1` |
| `loads.windPressure`, `loads.windSuction` | kN/m² | magnitudes, ≥ 0; with `tableD1` both equal the class pressure |
| `loads.windClass` | – | `low`, `medium`, `high` when `source = tableD1` |
| `loads.imposed` | kN/m² | optional uniform lateral imposed load (crowd/barrier), §4 |
| `factors.gammaF`, `gammaQ`, `psi`, `gammaG` | – | §4 |
| `thermal` | – | optional, §6.6 |
| `options.flexureUtilisation` | – | `stress` (default) or `thickness`, §6.1 |

## 3. Material

### 3.1 Partial material factor (BS8298-2 5.6.3, Eq. 3, p.19; Table 4, p.20–21; identical in BS8298-4)

γm = F0 · FLEV · F3-4 · FH2O · FN · Fα · F∞

| Factor | Choice | Value |
| --- | --- | --- |
| F0 | base, flexure; base, fixing breakout | 3.00; 3.00 |
| FLEV | mean strength; LEV | 1.40; 1.00 |
| F3-4 | BS EN 12372 three-point; BS EN 13161 four-point; not applicable (breakout) | 1.40; 1.00; 1.00 |
| FH2O | dry samples alone; lower of ≥10 dry and ≥10 wet | 1.40; 1.00 |
| FN | one set or out of date; three discrete sets of ≥10; three sets chosen by a stone specialist; historical data > 10 years | 1.50; 1.35; 1.00; 1.00 |
| Fα | orientation-dependent, unknown orientation; orientation-dependent, same orientation; not orientation-dependent | 1.40; 1.00; 1.00 |
| F∞ | no freeze-thaw test; loss < 40%; < 25%; < 10%; < 5% (or not susceptible) | 2.00; 1.65; 1.35; 1.10; 1.00 |

F3-4 is "N/A" for fixing breakout (Table E.1 last row, p.66), taken as 1.00. The flexure and breakout
factors are computed separately from their own test descriptions (D.8 NOTE 3, p.63).

`stone.flexure.gammaM` / `stone.breakout.gammaM` may override the product; advisory A7 (5.6.3.1, p.19:
only where proven by a stone specialist). If γm > 15, compliance item K4 (5.6.4, p.20).

### 3.2 Design strengths

fd = fk / γm (D.3, p.62) and Rd = Rk / γm (D.8, p.63).

### 3.3 Unit weight

Default 3000 kg/m³ × g = 29.43 kN/m³, BS8298-3 6.1 NOTE 4 (p.9) "as a general guide … the maximum likely
load", with g = 9.81 m/s². BS8298-1 5.1.1 (p.11) and BS8298-3 6.1 ask for the actual density of the stone.
Presets from HAZ p.9 (PDF), labelled as manufacturer design weights: travertine 24, sandstone 26,
marble and limestone 27, granite 28 kN/m³.

## 4. Loads and combinations

Characteristic lateral loads: wind pressure wp and wind suction ws (kN/m²), and an optional uniform
imposed lateral load qi.

- `loads.source = "project"`: wp, ws from the user (5.4.1, p.14). γf default 1.5 (5.6.2, p.18).
  Advisory A1 when γf < 1.5.
- `loads.source = "tableD1"`: q = 1500 / 2250 / 3000 N/m² for low / medium / high (Table D.1, p.61;
  Table B.1 in BS8298-4, p.50), applied as both pressure and suction; γf default 1.0 (D.2 NOTE, p.61).
  Advisory A2: preliminary sizing only.

Design lateral pressures (one combination per wind direction when qi = 0):

- `W+`: qd = γf · wp; `W−`: qd = γf · ws.

With qi > 0, four combinations follow the example report (GFS §4.3, combinations 2.3.1–2.3.8, which
also add 1.35 × dead; dead load gives no lateral bending in a vertical panel):

- `W+ lead`: γf·wp + ψ·γQ·qi; `W− lead`: γf·ws + ψ·γQ·qi;
- `I lead (W+)`: ψ·γf·wp + γQ·qi; `I lead (W−)`: ψ·γf·ws + γQ·qi.

γQ default 1.5 and ψ default 0.5 (GFS §4.3). The imposed load is added to both wind directions, as in
the example report. BS EN 1990 is not supplied (OQ-01).

The governing combination for §6.1 and §6.2 is the one with the largest qd.

Dead load for the loadbearing fixings: G = γ · t · Lx · Hy (N), with γ in N/mm³. Its design value
γG·G uses γG = 1.35 (HAZ p.9; GFS §4.3), shown for information (§6.3).

## 5. Spans

With the fixings of §1:

- horizontal distance between fixings sx = Lx − 2·ax; vertical sy = Hy − 2·ay.
- L = max(sx, sy) "the maximum distance between fixings" (D.2, p.62).
- b = the panel dimension perpendicular to L: b = Hy if L = sx (horizontal span), else b = Lx (E.1:
  L = 600 mm height, b = 900 mm length, p.64). Ties go to the vertical span.
- overhang c = the edge distance along the span direction (ax for a horizontal span, ay for a vertical).

## 6. Checks

Each check returns demand, capacity, utilisation = demand / capacity (except §6.1 `thickness` mode),
pass = utilisation ≤ 1, its working with the numbers filled in, and its sources.

### 6.1 C1 Flexure (BS8298-2 D.3, p.61–62; BS8298-4 B.3, p.50–51)

qd (N/mm²) from §4; Mf = qd·b·L²/8 (D.2); fd = fk/γm (D.3); Zreq = Mf/fd (D.4); treq = √(6·Zreq/b) (D.5).

- `stress` (default): demand σ = 6·Mf/(b·t²), capacity fd, utilisation σ/fd = (treq/t)².
- `thickness`: demand treq, capacity t, utilisation treq/t (the example report's "Uti. = required
  thickness / panel thickness", GFS §4.5).

Both pass exactly when t ≥ treq.

### 6.2 C2 Fixing breakout (BS8298-2 D.4, p.62–63; BS8298-4 B.4, p.51–52)

W = qd·A with A = Lx·Hy (D.6); Fd = W/n (D.7); Rd = Rk/γm (D.8); check Rd ≥ Fd (D.9).
Without `Rk` the check is listed in `notCovered` with Fd shown. Compliance item K3 (only with `Rk`) when `testedThickness` ≠ t (D.8 NOTE 2, p.63: the capacity is specific to the tested
thickness).

### 6.3 C3 Loadbearing fixing (only when `fixings.loadbearing.safeLoad` is given)

Demand G / count, capacity `safeLoad` (manufacturer's safe working load). BS8298-3 6.3 (p.12): design of
proprietary fixings "based on the manufacturer's recommendations for safe loads"; HAZ p.33 (PDF): "Loads
stated are working resistance loads". Working shows γG·G/count for information. HAZ p.11 (PDF) divides the
weight by 2 for supports in a horizontal joint, which is the default count.

### 6.4 C4 Length of return (BS8298-2 5.12.13, Table 6, p.42; BS8298-4 5.12.9, Table 6, p.37)

Only when `geometry.returnLength` is given. Table 6: t = 20, 30 → 5·t; 40, 50 → 4·t; 75 → 3·t. Between
rows, the smaller multiplier of the two neighbouring rows (conservative, OQ-03). Outside 20 to 75 mm the
check is not run and the item goes to `notCovered`. Demand = return length, capacity = k·t.

### 6.5 C5 Restraint dowel diameter (handset only, BS8298-2 5.12.7, p.37–38)

Only when `fixings.type = "dowel"` and `dowelDiameter` is given. Minimum diameter: t ≤ 30 → 3 mm; 40 → 5 mm;
50 → 6 mm. 30 < t ≤ 40 uses 5 mm and 40 < t ≤ 50 uses 6 mm (the next row up, OQ-04). Above 50 mm the
standard gives no minimum: `notCovered`. Demand = minimum, capacity = diameter.

### 6.6 C6 Thermal movement at a joint (BS8298-2 Annex B, Eq. B.1, B.2, p.57–58; informative)

Only when `thermal` is given: frame and cladding expansion coefficients αf, αc (per °C), temperatures of the
frame and cladding at erection (tfe, tce), in summer (tfs, tcs) and in winter (tfw, tcw), joint spacing s (m),
sealant movement capability ε (%), and the joint width provided wj (mm).

M_summer = 1000·[(tfs − tfe)·αf − (tcs − tce)·αc] mm/m (B.1); M_winter = 1000·[(tfw − tfe)·αf − (tcw − tce)·αc]
(B.2). Movement δ = max(|M_summer|, |M_winter|)·s (mm). Required width = δ / (ε/100). Demand = required width,
capacity = wj. No α values are given for particular stones (OQ-05); the Annex B values are offered in the
app as an example only.

## 7. Compliance items (pass or "to resolve")

- K1 restraint position, handset (BS8298-2 5.12.7, p.37): at about the 1/5 points (stack) or 1/4 points
  (staggered) of the edge length the fixings sit on; otherwise at least 75 mm from the corner. The edge
  distance along the fixing edge is checked: OK if it is within 10% of the length of the target point
  (OQ-06: "approximately" is not defined) or ≥ 75 mm.
- K2 soffit (BS8298-2 5.12.9, p.38; BS8298-4 5.12.5, p.34): when `soffit`, the panel is ≤ 900 × 600 mm and
  three fixings must be shown adequate, so n ≤ 3.
- K3 breakout test thickness (§6.2).
- K4 γm > 15 → assessment by a stone specialist (5.6.4, p.20).

## 8. Advisories

- A1 γf < 1.5 with project-specific loads (5.6.2, p.18).
- A2 Table D.1 loads are for preliminary sizing only (5.4.1 NOTE 1, p.14).
- A3 rainscreen with n = 4 engaged: B.4 assumes only three of four fixings engage (BS8298-4 p.51).
- A4 impact testing to be considered (5.7, p.22, items a–c): t < 50 mm (in particular with mean flexural
  strength < 5 N/mm²), span between fixings > 600 mm, panel length > 900 mm.
- A5 thin stone (≤ 50 mm) with dry-only test data: wet and dry testing (5.5.4, p.16–17).
- A6 loadbearing fixings should be no more than 150 mm up from the bottom of the stone (5.12.6, p.35).
- A7 γm entered directly instead of Table 4 (5.6.3.1, p.19).
- A8 `kerf` or `undercut` breakout tests are to Annex C (BS8298-2) or Annexes D–G (BS8298-4); `dowel` to
  BS EN 13364 (5.5.3, p.16).
- A9 fixing manufacturer guidance (HAZ p.9, PDF): pin at least 2.5·t from the corner. Shown when ax or ay is
  less than 2.5·t for edge pins. Manufacturer guidance, not BS 8298.

## 9. Documents

| Id | Document |
| --- | --- |
| BS8298-2 | BS 8298-2:2020 Design and installation of natural stone cladding and lining — Part 2: Traditional handset external cladding — Code of practice |
| BS8298-3 | BS 8298-3:2020 Part 3: Stone-faced precast concrete cladding systems — Code of practice |
| BS8298-4 | BS 8298-4:2020 Part 4: Stone cladding on rainscreen support systems — Code of practice |
| BS8298-1 | BS 8298-1:2010 Code of practice for the design and installation of natural stone cladding and lining — Part 1: General |
| HAZ | HAZ Metal, Stone fixing systems technical catalogue HAZ-SF-EN-04.20 |
| GFS | Glass & Façade Solutions, Stone structural calculation (example report template) |

## 10. Display field (`panelField`)

Annex D models the panel as a strip of width b spanning L between fixings. The field uses that model over a
grid on the face: at a distance s along the span from the first fixing line, M(s) = qd·b·s·(L − s)/2 between
the fixings and −qd·b·c'²/2 on the overhang (c' the distance beyond the fixing), σ(s) = 6·|M(s)|/(b·t²),
utilisation σ/fd. The maximum equals C1 in `stress` mode. It is uniform across the width and is shown as
"Annex D one-way model": it is not a plate analysis. No deflection is shown: Young's modulus is not given
(OQ-02) and BS8298-2 5.6.2 NOTE 1 (p.18) states SLS design is not applicable to stone cladding.
