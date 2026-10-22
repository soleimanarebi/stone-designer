# Validation

Each case in `cases/` is a stone panel with expected results computed by hand, outside the engine,
by `scripts/expected.py` from the printed equations (BS 8298-2/-4:2020 Annex D/B, Annex B and the
example report). `pnpm --filter @stone/validation validate` prints the table; `pnpm test` runs them.
Values are compared to 1 in 10^5.

| Case | Source | What it checks | Gap against the printed values |
| --- | --- | --- | --- |
| 01 | BS 8298-2:2020 Annex E | γm from Table E.1, flexure D.1–D.5, breakout D.6–D.9 with n = 4 | fd printed rounded to 0.71, so Zreq and treq differ in the third figure; E.3 prints Fd = 203 N but checks 270 N (OQ-07) |
| 02 | BS 8298-4:2020 Annex C | as 01 with three of four fixings engaged | flexure rounding as 01; breakout agrees exactly |
| 03 | Example report, P2 | wind with imposed load combinations, γm entered, treq/t utilisation | printed treq = 38 mm does not follow from the printed Zreq (45.2 mm) (OQ-08) |
| 04 | Example report, P1 | as 03 | the printed qd belongs to the wind-leading combination, not the governing one (OQ-08) |
| 05 | BS 8298-2:2020 Annex B | C5 thermal movement and joint width | Annex B rounds 1.505 mm to 1.5 mm, so its 15 mm joint is 0.3% short; winter sign printed −0.01 for +0.01 |

Each case file carries the printed values and the explanation of any gap under `reference`.
