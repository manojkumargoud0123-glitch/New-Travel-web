/* Pure layout maths for the card grid (no React, so it can be tested alone). */

export const MIN_COL = 290; // narrowest a column may get
export const MAX_COLS = 4;

/* Each column is split into 6 units so a card's designed ("Auto") width can
   sit between whole columns — e.g. Fleet Overview 7 units, Geofences 5. */
export const UNITS_PER_COL = 6;

// S / M / L / Full = 1 / 2 / 3 columns / the whole row
export const WIDTH_UNITS = { s: 6, m: 12, l: 18, full: MAX_COLS * UNITS_PER_COL };

export const colsForWidth = (width, gap) =>
  width > 0 ? Math.max(1, Math.min(MAX_COLS, Math.floor((width + gap) / (MIN_COL + gap)))) : 1;

/* A card's width in units for the current column count. On the full
   4-column grid it keeps its exact width; with fewer columns it snaps to
   whole columns so smaller screens don't end up with odd slivers. */
export function spanUnits(want, cols) {
  const total = cols * UNITS_PER_COL;
  const w = cols >= MAX_COLS
    ? want
    : Math.max(1, Math.round(want / UNITS_PER_COL)) * UNITS_PER_COL;
  return Math.max(1, Math.min(w, total));
}

/* Pack cards into rows in their saved order. A card that doesn't fit starts a
   new row; the last card of each row widens to close any gap, so rows always
   line up.
   items: [{ id, units }] → [{ items: [{ ...item, start, span }] }]
   (start/span are in units) */
export function packRows(items, cols) {
  const total = cols * UNITS_PER_COL;
  const rows = [];
  let cur = null;
  for (const it of items) {
    const span = spanUnits(it.units || UNITS_PER_COL, cols);
    if (!cur || cur.used + span > total) {
      cur = { items: [], used: 0 };
      rows.push(cur);
    }
    cur.items.push({ ...it, start: cur.used + 1, span });
    cur.used += span;
  }
  for (const r of rows) r.items[r.items.length - 1].span += total - r.used;
  return rows.map(({ items }) => ({ items }));
}
