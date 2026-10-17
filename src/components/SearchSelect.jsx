import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, X, Plus } from "lucide-react";

/* Searchable dropdown over a list of strings — shared by the Masters pages.
   `allowAddNew` lets the user pick a typed value that isn't in `options`. */
export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  icon: Icon,
  onOpenChange,
  disabled = false,
  isClearable = true,
  allowAddNew = false, // when true, lets the user add a typed value not in options
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const q = query.trim();
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(q.toLowerCase()),
  );
  const exactMatch = options.some((o) => o.toLowerCase() === q.toLowerCase());
  const showAddNew = allowAddNew && q.length > 0 && !exactMatch;

  useEffect(() => {
    const onDoc = (e) =>
      wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current
      .querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (val) => {
    onChange(val);
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const onKeyDown = (e) => {
    const max = filtered.length - 1 + (showAddNew ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showAddNew && active === filtered.length) {
        choose(q);
      } else if (filtered[active]) {
        choose(filtered[active]);
      } else if (showAddNew) {
        choose(q);
      }
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 text-left text-[14px] font-medium outline-none transition-all dark:bg-white/[0.03] ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer"
        } ${
          open
            ? "border-primary-400 ring-2 ring-primary-500/15"
            : "border-slate-200 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/20"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="shrink-0 text-slate-400" />}
          <span
            className={
              value ? "text-slate-700 dark:text-slate-100" : "text-slate-400"
            }
          >
            {value || placeholder}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {isClearable && value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
              title="Clear"
            >
              <X size={14} />
            </span>
          )}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown size={17} className="text-slate-400" />
          </motion.span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40 dark:border-white/10 dark:bg-ink-900 dark:shadow-black/50"
          >
            <div className="border-b border-slate-100 p-2 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-white/[0.05]">
                <Search size={15} className="shrink-0 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Search..."
                  className="w-full bg-transparent text-[14px] font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-slate-100"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="cursor-pointer rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-white/10"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div ref={listRef} className="max-h-52 overflow-y-auto p-1.5">
              {filtered.length === 0 && !showAddNew ? (
                <p className="px-3 py-6 text-center text-[13px] font-medium text-slate-400">
                  No results found
                </p>
              ) : (
                <>
                  {filtered.map((o, i) => {
                    const selected = o === value;
                    return (
                      <button
                        key={o}
                        type="button"
                        data-idx={i}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(o)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                          i === active
                            ? "bg-primary-500/10 text-primary-600 dark:text-primary-300"
                            : "text-slate-600 dark:text-slate-300"
                        } ${selected ? "font-semibold" : ""}`}
                      >
                        <span className="truncate">{o}</span>
                        {selected && (
                          <Check size={16} className="shrink-0 text-primary-500" />
                        )}
                      </button>
                    );
                  })}
                  {showAddNew && (
                    <button
                      type="button"
                      data-idx={filtered.length}
                      onMouseEnter={() => setActive(filtered.length)}
                      onClick={() => choose(q)}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border-t border-dashed border-slate-100 px-3 py-2.5 text-left text-[14px] font-semibold transition-colors dark:border-white/[0.06] ${
                        active === filtered.length
                          ? "bg-primary-500/10 text-primary-600 dark:text-primary-300"
                          : "text-primary-600 dark:text-primary-400"
                      }`}
                    >
                      <Plus size={16} className="shrink-0" />
                      <span className="truncate">
                        Add &ldquo;{q}&rdquo;
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
