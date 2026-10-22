/** Reference documents (calc-spec §9). */
export const DOCUMENTS = {
  "BS8298-2": {
    title: "BS 8298-2:2020 Design and installation of natural stone cladding and lining — Part 2: Traditional handset external cladding — Code of practice",
  },
  "BS8298-3": { title: "BS 8298-3:2020 Design and installation of natural stone cladding and lining — Part 3: Stone-faced precast concrete cladding systems — Code of practice" },
  "BS8298-4": { title: "BS 8298-4:2020 Design and installation of natural stone cladding and lining — Part 4: Stone cladding on rainscreen support systems — Code of practice" },
  "BS8298-1": { title: "BS 8298-1:2010 Code of practice for the design and installation of natural stone cladding and lining — Part 1: General" },
  HAZ: { title: "HAZ Metal, Stone fixing systems technical catalogue HAZ-SF-EN-04.20 (manufacturer guidance)" },
  GFS: { title: "Example report: Glass & Façade Solutions, Stone structural calculation (template)" },
} as const;

export type DocId = keyof typeof DOCUMENTS;

export interface Source {
  doc: DocId;
  /** Clause, table, equation or figure. */
  ref: string;
  /** Printed page number (BSI documents), or the PDF page / section where noted. */
  page: string;
}

export interface Sourced<T> {
  value: T;
  source: Source;
}

export const src = (doc: DocId, ref: string, page: string | number): Source => ({ doc, ref, page: String(page) });

/** Marks a value the documents do not give (see docs/open-questions.md). */
export const TODO_VALUE = Symbol("TODO_VALUE");
