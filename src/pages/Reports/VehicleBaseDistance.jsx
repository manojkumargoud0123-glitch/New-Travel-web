import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
  MapPin,
  Route,
  Search,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
  Inbox,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileDown,
  Printer,
} from "lucide-react";
import PageNumbers from "../../components/PageNumbers";
import { exportCSV, exportExcel, exportPDF, exportPrint } from "../../utils/exportUtils";

/* =========================================================================
   ENDPOINT
   GET /vehicle-phc-distance?as_of=<local ISO datetime, seconds included>
   ========================================================================= */

/* =========================================================================
   THEME
   ========================================================================= */
const card =
  "relative rounded-2xl border border-slate-200 dark:border-white/[0.08] " +
  "bg-white/80 dark:bg-slate-900/60 backdrop-blur-md " +
  "shadow-sm shadow-slate-200/60 dark:shadow-black/30";

const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-white/[0.08] " +
  "bg-white dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-medium " +
  "text-slate-700 dark:text-slate-100 outline-none transition-colors duration-200 " +
  "placeholder:text-slate-400 placeholder:font-normal " +
  "focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 " +
  "hover:border-slate-300 dark:hover:border-white/20 [color-scheme:light] dark:[color-scheme:dark]";

const ghostBtn =
  "flex items-center justify-center rounded-xl border border-slate-200 " +
  "bg-white text-slate-500 transition-colors " +
  "enabled:cursor-pointer enabled:hover:border-primary-300 enabled:hover:bg-primary-50 enabled:hover:text-primary-600 " +
  "disabled:cursor-not-allowed disabled:opacity-40 " +
  "dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 " +
  "dark:enabled:hover:bg-primary-500/10 dark:enabled:hover:text-primary-300 dark:enabled:hover:border-primary-400/40";

/* --------------------------------- config --------------------------------- */
const PAGE_SIZE = 10;
const EXPORT_NAME = "vehicle-wise-report";
const EXPORT_TITLE = "Vehicle Wise Report";

const exportBtns = [
  { label: "CSV", icon: FileText },
  { label: "Excel", icon: FileSpreadsheet },
  { label: "PDF", icon: FileDown },
  { label: "Print", icon: Printer },
];

const columns = [
  { key: "s_no", label: "S.No", sortable: false },
  { key: "vehicle", label: "Vehicle Number" },
  { key: "base", label: "Base " },
 { key: "vehicle_geo_point", label: "Vehicle (Geo-Point)", sortable: false },
{ key: "base_geo_point", label: "Base (Geo-Point)", sortable: false },
  { key: "distance_km", label: "Distance KM's"},
];

const gridTemplate =
  "60px minmax(130px,1.1fr) minmax(150px,1.5fr) minmax(150px,1.3fr) minmax(150px,1.3fr) minmax(110px,0.9fr)";
const minWidth = 940;

/* datetime-local value ("YYYY-MM-DDTHH:mm") for the current minute, local time */
const nowLocalValue = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/* datetime-local value -> "as_of" query value with seconds ("...THH:mm:00") */
const toAsOf = (v) => (v?.length === 16 ? `${v}:00` : v);

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};



/* --------------------------------- Page ----------------------------------- */
export default function VehicleBaseDistance() {
  const rootRef = useRef(null);

  const [asOfInput, setAsOfInput] = useState(nowLocalValue); // bound to the field
  const [appliedAsOf, setAppliedAsOf] = useState(null); // last submitted value

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "vehicle", dir: "asc" });
  const [page, setPage] = useState(1);

  /* ---- data ----
     This report came from the old backend. The Travel API has GET
     /VehicleWiseTripReport/ — until it's wired in, no request is made and
     the table stays empty. */
  const loadRows = useCallback(async (value) => {
    setRows([]);
    setAppliedAsOf(value || nowLocalValue());
    setPage(1);
    setFetchError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRows(nowLocalValue());
  }, [loadRows]);

  const onSubmit = (e) => {
    e.preventDefault();
    loadRows(asOfInput);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".rt-head", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".rt-card", { y: 24, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  /* ---- client-side filter + sort + paginate ---- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = rows.filter(
      (r) =>
        !q ||
        String(r.vehicle ?? "").toLowerCase().includes(q) ||
        String(r.base ?? "").toLowerCase().includes(q),
    );
    if (sort.key === "distance_km") {
      data = [...data].sort((a, b) => {
        const av = a.distance_km ?? Infinity;
        const bv = b.distance_km ?? Infinity;
        return sort.dir === "asc" ? av - bv : bv - av;
      });
    } else if (sort.key) {
      data = [...data].sort((a, b) => {
        const cmp = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return data;
  }, [rows, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filtered.length);
  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  return (
    <div ref={rootRef} className="relative mx-auto max-w-[1500px] 2xl:max-w-none px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-primary-500/10 blur-[120px]" />

      {/* header */}
      <div className="rt-head relative mb-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400">Reports</p>
        <h1 className="mt-1 flex items-center gap-2.5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            <MapPin size={22} />
          </span>
          Vehicle Wise Report
        </h1>
      </div>

      {/* table card */}
      <div className={`rt-card ${card} overflow-visible`}>
        {/* datetime filter + submit */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-white/[0.06] sm:px-6">
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex w-full flex-col gap-1.5 sm:w-64">
              <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400"> Date and Time</label>
              <div className="relative">
                
                <input
                  type="datetime-local"
                  value={asOfInput}
                  max={nowLocalValue()}
                  onChange={(e) => setAsOfInput(e.target.value)}
                  className={`${inputCls} `}
                  aria-label=" date and time"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !asOfInput}
              className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Submit
            </button>
          </form>
        </div>

        {/* toolbar: exports + search */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-white/[0.06] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {exportBtns.map(({ label, icon: Icon }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                disabled={!filtered.length}
                onClick={() => {
                  if (label === "CSV") exportCSV(filtered, columns, EXPORT_NAME);
                  if (label === "Excel") exportExcel(filtered, columns, EXPORT_NAME);
                  if (label === "PDF") exportPDF(filtered, columns, EXPORT_TITLE, EXPORT_NAME);
                  if (label === "Print") exportPrint(filtered, columns, EXPORT_TITLE);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-300"
              >
                <Icon size={15} /> {label}
              </motion.button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Vehicle or Base"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

       

        {/* table */}
        <div className="overflow-x-auto px-2 pb-2 sm:px-4">
          <div style={{ minWidth: `${minWidth}px` }}>
            <div
              className="mt-3 grid items-center gap-3 rounded-xl bg-slate-800 px-5 py-3.5 text-white dark:bg-white/[0.06]"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map((c) => (
                <button
                  key={c.key}
                  onClick={() => c.sortable !== false && toggleSort(c.key)}
                  className={`flex items-center gap-1 text-left text-[11px] font-bold uppercase tracking-wide transition-opacity ${
                    c.sortable === false ? "cursor-default" : "cursor-pointer hover:opacity-80"
                  }`}
                >
                  <span className="truncate">{c.label}</span>
                  {c.sortable !== false && (
                    <span className="flex shrink-0 flex-col -space-y-1">
                      <ChevronUp size={10} className={sort.key === c.key && sort.dir === "asc" ? "text-white" : "text-white/35"} />
                      <ChevronDown size={10} className={sort.key === c.key && sort.dir === "desc" ? "text-white" : "text-white/35"} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 size={28} className="mb-3 animate-spin text-primary-500" />
                <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Loading distances…</p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                  <X size={26} />
                </div>
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">{fetchError}</p>
                <button
                  onClick={() => loadRows(asOfInput)}
                  className="mt-3 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                >
                  Try again
                </button>
              </div>
            ) : pageRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
                  <Inbox size={26} />
                </div>
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">No data available in table</p>
              </div>
            ) : (
              pageRows.map((r, i) => (
                <div
                  key={r.s_no ?? `${r.vehicle}-${i}`}
                  className="grid items-center gap-3 border-b border-slate-100 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <span className="text-[13.5px] font-bold text-slate-400">
                    {r.s_no ?? (safePage - 1) * PAGE_SIZE + i + 1}
                  </span>
                  <span className="truncate text-[13.5px] font-semibold text-slate-700 dark:text-slate-100">
                    {r.vehicle || "—"}
                  </span>
                  <span className="truncate text-[13.5px] font-medium text-slate-600 dark:text-slate-300">
                    {r.base || "—"}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate font-mono text-[12.5px] text-slate-600 dark:text-slate-300">
                      {r.vehicle_lat_lng || "—"}
                    </span>
                    {r.vehicle_last_seen_at && (
                      <span className="block truncate text-[11px] text-slate-400">
                        last seen {fmtDateTime(r.vehicle_last_seen_at)}
                      </span>
                    )}
                  </div>
                  <span className="truncate font-mono text-[12.5px] text-slate-600 dark:text-slate-300">
                    {r.base_lat_lng || "—"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-700 dark:text-slate-100">
                    <Route size={14} className="shrink-0 text-primary-500" />
                    {r.distance_km}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:flex-row sm:px-6">
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{startIdx}</span> to{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{endIdx}</span> of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> entries
          </p>
          <div className="flex items-center gap-1.5">
            {[
              { icon: ChevronsLeft, go: () => setPage(1), dis: safePage === 1 },
              { icon: ChevronLeft, go: () => setPage((p) => Math.max(1, p - 1)), dis: safePage === 1 },
            ].map(({ icon: Icon, go, dis }, i) => (
              <motion.button key={`p${i}`} whileHover={!dis ? { scale: 1.1, y: -1 } : {}} whileTap={!dis ? { scale: 0.92 } : {}} onClick={go} disabled={dis} className={`h-9 w-9 ${ghostBtn}`}>
                <Icon size={16} />
              </motion.button>
            ))}
            <PageNumbers currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
            {[
              { icon: ChevronRight, go: () => setPage((p) => Math.min(totalPages, p + 1)), dis: safePage === totalPages },
              { icon: ChevronsRight, go: () => setPage(totalPages), dis: safePage === totalPages },
            ].map(({ icon: Icon, go, dis }, i) => (
              <motion.button key={`n${i}`} whileHover={!dis ? { scale: 1.1, y: -1 } : {}} whileTap={!dis ? { scale: 0.92 } : {}} onClick={go} disabled={dis} className={`h-9 w-9 ${ghostBtn}`}>
                <Icon size={16} />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
