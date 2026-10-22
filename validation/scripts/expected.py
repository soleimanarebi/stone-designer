"""Hand calculation of the validation cases, outside the engine (calc-spec §4–§6).

Writes cases/*.json. Run: python3 -I validation/scripts/expected.py
Every number is computed here from the printed equations of BS 8298-2/-4:2020 Annex D/B,
Annex B (thermal) and the example report, not by the engine.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "cases")

def flexure(qd, b, L, fk, gm, t):
    Mf = qd * b * L**2 / 8          # D.2
    fd = fk / gm                     # D.3
    Z = Mf / fd                      # D.4
    treq = math.sqrt(6 * Z / b)      # D.5
    sigma = 6 * Mf / (b * t**2)
    return Mf, fd, Z, treq, sigma

def breakout(qd, A, n, Rk, gm):
    W = qd * A                        # D.6
    return W, W / n, Rk / gm          # D.7, D.8

def chk(d, c):
    return {"demand": d, "capacity": c, "utilisation": d / c}

PORTLAND = {
    "name": "Portland limestone (Jordans Whitbed)",
    "flexure": {"fk": 2.99, "method": "en13161", "basis": "lev", "wetDry": "dry-only", "sampling": "historical", "orientation": "same", "freezeThaw": "lt5"},
    "breakout": {"Rk": 1460, "testedThickness": 50, "basis": "lev", "wetDry": "dry-only", "sampling": "historical", "orientation": "same", "freezeThaw": "lt5"},
}

def annex(system):
    gm = 3.00 * 1.00 * 1.00 * 1.40 * 1.00 * 1.00 * 1.00   # Table E.1 / C.1
    qd = 1.0 * 1500 / 1e6                                  # D.1, Table D.1 low, gf = 1.0
    b, L, t, A = 900, 600, 50, 900 * 600                   # E.1: fixings at 1/5 points along the length
    n = 4 if system == "handset" else 3
    Mf, fd, Z, treq, sigma = flexure(qd, b, L, 2.99, gm, t)
    W, Fd, Rd = breakout(qd, A, n, 1460, gm)
    return gm, Mf, fd, Z, treq, sigma, W, Fd, Rd

cases = []

gm, Mf, fd, Z, treq, sigma, W, Fd, Rd = annex("handset")
cases.append(("01-bs8298-2-annex-e.json", {
    "name": "BS 8298-2:2020 Annex E worked example (handset, four fixings)",
    "description": "Portland Jordans Whitbed 900 x 600 x 50 mm, dowels at the 1/5 points of the length, Table D.1 low wind (1500 N/m2, gf = 1.0), LEV to BS EN 13161, dry, historical data, gm = 4.20.",
    "reference": {
        "source": "BS 8298-2:2020 E.2 and E.3, p.66-68",
        "printed": {"qd": 0.0015, "Mf": 60750, "fd": 0.71, "Zreq": 85563, "treq": 23.9, "W": 810, "Fd": 203, "Rd": 347.6, "check": "347.6 >= 270"},
        "gap": "fd is printed rounded to 0.71 (exact 0.7119), so Zreq prints 85 563 (exact 85 334) and treq 23.9 (exact 23.85). E.3 uses n = 4 and prints Fd = 203 N, then checks against 270 N, which is 810/3 from BS 8298-4 (OQ-07). The engine gives 202.5 N.",
    },
    "input": {"system": "handset", "geometry": {"length": 900, "height": 600, "thickness": 50}, "fixings": {"type": "dowel", "ax": 180, "ay": 0, "bond": "stack"}, "stone": PORTLAND, "loads": {"source": "tableD1", "windClass": "low"}},
    "expected": {"pass": True, "governing": "C2", "checks": {"C1": chk(sigma, fd), "C2": chk(Fd, Rd)},
                 "derived": {"qd": 0.0015, "Mf": Mf, "fd": fd, "Zreq": Z, "treq": treq, "W": W, "Fd": Fd, "Rd": Rd, "gammaMFlexure.value": gm, "gammaMBreakout.value": gm}},
    "tolerance": {"relative": 1e-5},
}))

gm, Mf, fd, Z, treq, sigma, W, Fd, Rd = annex("rainscreen")
cases.append(("02-bs8298-4-annex-c.json", {
    "name": "BS 8298-4:2020 Annex C worked example (rainscreen, three of four fixings engaged)",
    "description": "As case 01 on a rainscreen support system: B.4 assumes only three of the four fixings engage (n = 3).",
    "reference": {
        "source": "BS 8298-4:2020 C.2 and C.3, p.55-57",
        "printed": {"treq": 23.9, "W": 810, "Fd": 270, "Rd": 347.6},
        "gap": "As case 01 for the flexure rounding. Fd = 810/3 = 270 N agrees exactly.",
    },
    "input": {"system": "rainscreen", "geometry": {"length": 900, "height": 600, "thickness": 50}, "fixings": {"type": "dowel", "ax": 180, "ay": 0}, "stone": PORTLAND, "loads": {"source": "tableD1", "windClass": "low"}},
    "expected": {"pass": True, "governing": "C2", "checks": {"C1": chk(sigma, fd), "C2": chk(Fd, Rd)},
                 "derived": {"Mf": Mf, "treq": treq, "W": W, "Fd": Fd, "n": 3}},
    "tolerance": {"relative": 1e-5},
}))

# Example report (example report): Limestone, fk 6.9, gm 10 (entered), wind +0.91 / -0.53, imposed 1.5 kN/m2.
def report_panel(Lx, Hy, t):
    wp, ws, qi, gf, gq, psi = 0.91, 0.53, 1.5, 1.5, 1.5, 0.5
    combos = [gf*wp + psi*gq*qi, gf*ws + psi*gq*qi, psi*gf*wp + gq*qi, psi*gf*ws + gq*qi]
    qd = max(combos) / 1000          # 2.9325 kN/m2: 0.75 x 0.91 + 1.5 x 1.5
    L, b = Hy, Lx                    # pins in the top and bottom joints: vertical span
    Mf, fd, Z, treq, sigma = flexure(qd, b, L, 6.9, 10, t)
    return qd, Mf, fd, Z, treq

def report_input(Lx, Hy, t):
    return {"system": "handset", "geometry": {"length": Lx, "height": Hy, "thickness": t},
            "fixings": {"type": "dowel", "ax": round(Lx / 5), "ay": 0, "bond": "stack", "dowelDiameter": 8},
            "stone": {"name": "Limestone", "flexure": {"fk": 6.9, "method": "en12372", "gammaM": 10, "basis": "mean", "wetDry": "dry-only", "sampling": "one-set", "orientation": "unknown", "freezeThaw": "none"}, "breakout": {}},
            "loads": {"source": "project", "windPressure": 0.91, "windSuction": 0.53, "imposed": 1.5},
            "options": {"flexureUtilisation": "thickness"}}

qd, Mf, fd, Z, treq = report_panel(496, 800, 47)
cases.append(("03-example-report-p2.json", {
    "name": "Example report P2: 496 x 800 x 47 mm limestone, wind with imposed load",
    "description": "Example stone calculation report, §4.3 combinations and §5.2 minimum thickness; gm = 10 entered as in the report; utilisation reported as treq/t. No breakout load is given, so C2 is not run.",
    "reference": {
        "source": "Example report §4.3 and §5.2",
        "printed": {"qd": 0.00293, "Mf": 116361, "fd": 0.69, "Zreq": 168640, "treq": 38, "utilisation": "61%"},
        "gap": "qd, Mf and Zreq agree to the printed rounding (qd exact 0.0029325). The printed treq = 38 mm does not follow from its own Zreq: sqrt(6 x 168 640 / 496) = 45.2 mm (OQ-08), so the engine reports 96% rather than 61%.",
    },
    "input": report_input(496, 800, 47),
    "expected": {"pass": True, "governing": "C1", "checks": {"C1": chk(treq, 47)},
                 "derived": {"qd": qd, "Mf": Mf, "fd": fd, "Zreq": Z, "treq": treq}},
    "tolerance": {"relative": 1e-5},
}))

qd, Mf, fd, Z, treq = report_panel(700, 800, 75)
cases.append(("04-example-report-p1.json", {
    "name": "Example report P1: 700 x 800 x 75 mm limestone, wind with imposed load",
    "description": "As case 03 for the flat 75 mm panel P1. The engine takes the governing combination (imposed leading).",
    "reference": {
        "source": "Example report §4.5",
        "printed": {"qd": 0.00249, "Mf": 139440, "Zreq": 202087, "treq": 41.62, "utilisation": "55%"},
        "gap": "The printed qd = 0.00249 is 1.5 x 0.91 + 0.75 x 1.5 (wind leading, 2.3.1), although it is labelled 2.3.5; 2.3.5 gives 0.0029325 (OQ-08). With 0.00249 the printed Mf, Zreq and treq follow exactly; the engine uses the larger value: treq = 45.2 mm, 60%. treq does not depend on b, so P1 and P2 need the same thickness for the same span.",
    },
    "input": report_input(700, 800, 75),
    "expected": {"pass": True, "governing": "C1", "checks": {"C1": chk(treq, 75)},
                 "derived": {"qd": qd, "Mf": Mf, "Zreq": Z, "treq": treq}},
    "tolerance": {"relative": 1e-5},
}))

# Annex B thermal movement example, alpha_c = 10e-6: summer governs.
af, ac = 13e-6, 10e-6
Ms = 1000 * ((30 - 40) * af - (50 - 20) * ac)
Mw = 1000 * ((10 - 40) * af - (-20 - 20) * ac)
mov = max(abs(Ms), abs(Mw)) * 3.5
req = mov / 0.10
cases.append(("05-bs8298-2-annex-b-thermal.json", {
    "name": "BS 8298-2:2020 Annex B thermal movement example (alpha_c = 10e-6 /C)",
    "description": "Concrete frame with light granite cladding: frame 40 C at erection, 30 C summer, 10 C winter; cladding 20 C at erection, 50 C summer, -20 C winter; joints at 3.5 m; sealant movement capability 10%; 15 mm joint as in the example. Panel and loads as case 01.",
    "reference": {
        "source": "BS 8298-2:2020 Annex B, p.57-58",
        "printed": {"M_summer": -0.43, "M_winter": -0.01, "movement": 1.5, "joint": 15},
        "gap": "Annex B rounds 0.43 x 3.5 = 1.505 mm to 1.5 mm and so arrives at a 15 mm joint; exactly, 15.05 mm is needed and a 15 mm joint is 0.3% short. The winter value is printed -0.01; (10-40) x 13e-6 - (-20-20) x 10e-6 = +0.01 mm/m (sign only, it does not govern).",
    },
    "input": {**cases[0][1]["input"], "thermal": {"alphaFrame": af, "alphaCladding": ac, "frameErection": 40, "frameSummer": 30, "frameWinter": 10, "claddingErection": 20, "claddingSummer": 50, "claddingWinter": -20, "jointSpacing": 3.5, "sealantStrain": 10, "jointWidth": 15}},
    "expected": {"pass": False, "governing": "C5", "checks": {"C5": chk(req, 15)}},
    "tolerance": {"relative": 1e-5},
}))

for name, data in cases:
    with open(os.path.join(OUT, name), "w") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(name, {k: v for k, v in data["expected"]["checks"].items()})
