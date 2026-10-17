import React, { useRef } from "react";
import { motion } from "framer-motion";
import { useElementWidth, EASE } from "./ui.jsx";
import { colsForWidth, packRows, UNITS_PER_COL } from "./layout.js";

/* Card grid. Columns come from the grid's own width (~290px minimum, up to
   4), each split into 6 units; cards are packed into rows that all share the
   same tracks, so edges line up from row to row. Cards in a row share its
   height. */
export default function CardGrid({ items, gap, anim, className = "" }) {
  const ref = useRef(null);
  const width = useElementWidth(ref);
  const cols = colsForWidth(width, gap);
  const rows = packRows(items, cols);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols * UNITS_PER_COL}, minmax(0, 1fr))`,
        gap,
      }}
    >
      {rows.flatMap((row, ri) =>
        row.items.map((it, ii) => (
          <motion.div
            key={it.id}
            layout={anim ? "position" : false}
            initial={anim ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ default: { duration: 0.35, delay: (ri * 3 + ii) * 0.04, ease: EASE }, layout: { duration: 0.3, ease: EASE } }}
            className="flex min-w-0"
            style={{ gridColumn: `${it.start} / span ${it.span}`, gridRow: ri + 1 }}
          >
            <div className="min-w-0 flex-1">{it.node}</div>
          </motion.div>
        ))
      )}
    </div>
  );
}
