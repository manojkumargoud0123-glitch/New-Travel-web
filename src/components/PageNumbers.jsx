import { motion } from "framer-motion";

/**
 * Builds a windowed page list with "…" gaps, e.g. [1, "…", 4, 5, 6, "…", 20],
 * so the pager never renders one button per page for large result sets.
 */
function buildPageList(current, total) {
  const delta = 1; // pages shown on each side of current
  const range = [];
  const withDots = [];
  let last;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (last !== undefined) {
      if (i - last === 2) withDots.push(last + 1);
      else if (i - last > 2) withDots.push("…");
    }
    withDots.push(i);
    last = i;
  }

  return withDots;
}

export default function PageNumbers({ currentPage, totalPages, onPageChange }) {
  const pages = buildPageList(currentPage, totalPages);

  return (
    <>
      {pages.map((p, idx) =>
        p === "…" ? (
          <span
            key={`dots-${idx}`}
            className="flex h-9 w-9 items-center justify-center text-[14px] font-bold text-slate-400 dark:text-slate-500"
          >
            …
          </span>
        ) : (
          <motion.button
            key={p}
            whileHover={p !== currentPage ? { scale: 1.1, y: -1 } : {}}
            whileTap={{ scale: 0.92 }}
            onClick={() => onPageChange(p)}
            className={`flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-xl px-3 text-[14px] font-bold transition-colors ${
              p === currentPage
                ? "bg-primary-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-primary-500/10 dark:hover:text-primary-300"
            }`}
          >
            {p}
          </motion.button>
        )
      )}
    </>
  );
}
