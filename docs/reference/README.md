# Reference documents

The engine's data and equations are traced to these documents (see `packages/engine/src/data/sources.ts`
and `docs/calc-spec.md` §9). They are licensed copies and are not committed: keep them in this folder locally.
Page numbers in the engine are the printed page numbers of the BSI documents, and PDF page numbers for
the others.

| Id | Document | File |
| --- | --- | --- |
| BS8298-2 | BS 8298-2:2020 Design and installation of natural stone cladding and lining, Part 2: Traditional handset external cladding | `BS 8298-2-2020 …Part 2 Traditional handset ext.cladding code of practice.pdf` |
| BS8298-3 | BS 8298-3:2020 Part 3: Stone-faced precast concrete cladding systems | `BS 8298-3-2020 …Part 3 Stone aced precase concrete -code of practice.pdf` |
| BS8298-4 | BS 8298-4:2020 Part 4: Stone cladding on rainscreen support systems | `BS 8298-4-2020 …Part 4 Stone cladding on rainscreen-Code of practice.pdf` |
| BS8298-1 | BS 8298-1:2010 Part 1: General (no 2020 edition of Part 1 was supplied) | `2010/BS-8298-1-2010 ….pdf` |
| HAZ | HAZ Metal, Stone fixing systems technical catalogue HAZ-SF-EN-04.20 | `Break Out Pin/HAZ Metal Stone Fixing Systems Technical Catalogue HAZ-SF-EN-04.20.pdf` |
| REPORT | Example stone structural calculation report (project details withheld) | kept locally, not committed |

Also supplied and not used by release 1:

- The 2010 editions of BS 8298 parts 1 to 4 (`2010/`), superseded by the 2020 parts 2 to 4. Their
  "factors of safety" were replaced by the partial material factors of Table 4 (BS 8298-2:2020 5.6,
  commentary).
- BS 1217:2008 (cast stone), BS EN 771-5 (manufactured stone masonry units) and BS 5385-4 (ceramic
  tiling): other materials, outside the release-1 scope.
- Ancon wall ties and restraint fixings catalogue, Baek et al. 2023 *Shaking table test for dimension
  stone cladding with dowel pin connection* (J. Building Engineering 70, 106390), the MSc façade lecture
  notes on natural stone (MFK-15-M-4-1) and "Technical data: cladding stones, paving". These are
  background on fixings and seismic behaviour; none gives a design rule used by the engine.
