# Open questions

Values or rules the reference documents leave open. Each one is a user parameter or a
`TODO_VALUE` in the engine until a source settles it.

## OQ-01 Combination of wind with imposed lateral loads
BS 8298-2/-4:2020 5.6.2 (p.18) give γf = 1.5 for wind and snow and refer to BS EN 1990 Annex A
(not supplied) for the rest. The combination factors for an imposed (crowd or barrier) load acting
with wind come from the example report (REPORT §4.3): leading action × 1.5, accompanying action ×
0.5 × 1.5. The engine uses γQ = 1.5 and ψ = 0.5 as user parameters with those defaults. Confirm
against BS EN 1990 and its UK National Annex. The example report also adds the imposed load to
both wind directions; the engine follows it.

## OQ-02 Young's modulus of stone
No supplied document gives E for any stone, and BS 8298-2:2020 5.6.2 NOTE 1 (p.18) says SLS design
is not applicable to stone cladding. The example report (REPORT §4.2) still reports deflections against
L/360 from a finite element model. Release 1 has no deflection check and no deflection colour mode.

## OQ-03 Table 6 between tabulated thicknesses
Table 6 (BS 8298-2 p.42, BS 8298-4 p.37) lists 20, 30, 40, 50 and 75 mm only. Between rows the engine
uses the smaller multiplier of the two neighbours (e.g. 60 mm → 3 × t). Outside 20–75 mm the check is
not run.

## OQ-04 Restraint dowel diameter between nominal thicknesses
BS 8298-2 5.12.7 (p.37–38) gives minimum dowel diameters for units "nominally" 30 mm or less (3 mm),
40 mm (5 mm) and 50 mm (6 mm). The engine uses the next row up between them, and gives no minimum
above 50 mm. BS 8298-4 has no equivalent rule for rainscreen dowels.

## OQ-05 Coefficients of thermal expansion
BS 8298-2 Annex B (p.57–58) uses αc = 5 and 10 × 10⁻⁶ /°C and αf = 13 × 10⁻⁶ /°C as an example only;
no document gives values per stone type. They are user inputs; the Annex B values appear only in the
example template.

## OQ-06 "Approximately" at the 1/5 and 1/4 points
BS 8298-2 5.12.7 (p.37) asks for restraint fixings at "approximately" the 1/5 points (stack bonded) or
1/4 points (half staggered). The engine accepts an edge distance within 10% of the edge length of the
target point, or ≥ 75 mm from the corner, which the clause accepts in any case.

## OQ-07 Printed inconsistency in BS 8298-2:2020 Annex E
E.3 (p.68) uses n = 4 fixings engaged and prints Fd = 810/4 = 203 N, then checks "347.6 ≥ 270", which is
810/3 from the BS 8298-4 example. The engine computes 202.5 N for n = 4 (validation case 01).

## OQ-08 Printed inconsistencies in the example report (example report)
- §4.5 P1 prints qd = 0.00249 N/mm² against combination 2.3.5 (1.35 Dead + 0.5×1.5 wind pressure +
  1.5 uniform), which gives 0.75 × 0.91 + 1.5 × 1.5 = 2.9325 kN/m². 0.00249 is 1.5 × 0.91 + 0.75 × 1.5,
  combination 2.3.1.
- §5.2 P2 prints treq = 38 mm, but its own Zreq = 168 640 mm³ with b = 496 mm gives √(6 × 168 640 / 496)
  = 45.2 mm.
- §4.2 states the compression strength with "Material Safety Factor = 3" and then divides by 10.
Validation case 03 follows the equations.

## OQ-09 Contact (bearing) stress at pins
The example report checks the contact stress at the fixing points against compressive strength / 10,
citing BS 8298. BS 8298-2:2020 gives no such rule; D.1 (p.61) says the Annex D method does not apply
to large compressive loads and asks for testing to BS EN 1926. Not checked in release 1.

## OQ-10 Point loads and barrier loads
5.4.3 (p.15) requires 500 N over 100 × 100 mm where access equipment is anticipated, with γf = 1.0
(5.6.2 NOTE 2), but Annex D only treats distributed loads. The example report used finite element
analysis. Barrier loads come from BS 6180 (not supplied). Release 1 lists both as not covered and accepts
only a uniform imposed lateral pressure.

## OQ-11 Partial factor on dead load
γG = 1.35 for the dead load comes from HAZ (p.9) and the example report (§4.3), not from BS 8298, which
refers to BS EN 1990 (not supplied). The loadbearing fixing check compares unfactored dead load with the
manufacturer's safe working load (BS 8298-3 6.3); γG·G is shown for information only.
