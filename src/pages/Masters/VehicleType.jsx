import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { exportCSV, exportExcel, exportPDF, exportPrint } from "../../utils/exportUtils";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Search,
  FileText,
  FileSpreadsheet,
  FileDown,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
  Save,
  Inbox,
  Activity,
  RotateCcw,
} from "lucide-react";
import PageNumbers from "../../components/PageNumbers";
import SearchSelect from "../../components/SearchSelect";
import useLocalList, { newId, todayISO } from "../../hooks/useLocalList";
import { VEHICLE_TYPES } from "../../data/vehicleTypes";

/* =========================================================================
   CALM THEME — single indigo accent, flat surfaces, subtle glass
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

const STATUSES = ["Active", "Inactive"];

/* --------------------------------- field ---------------------------------- */

function Field({ label, required, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="px-0.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
        {label} {required && <span className="text-primary-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/* --------------------------------- modal ---------------------------------- */

const emptyForm = { name: "", description: "", status: "Active" };

function VehicleTypeModal({ open, onClose, onSave, editing, existingNames }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const set = (k) => (v) =>
    setForm((f) => ({ ...f, [k]: typeof v === "string" ? v : v.target.value }));

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name || "",
              description: editing.description || "",
              status: editing.status || "Active",
            }
          : emptyForm,
      );
      setError("");
    }
  }, [open, editing]);

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) {
      setError("Vehicle type is required.");
      return;
    }
    const clash = existingNames.some(
      (n) => n.toLowerCase() === name.toLowerCase() && n !== editing?.name,
    );
    if (clash) {
      setError(`"${name}" already exists.`);
      return;
    }
    setError("");
    onSave({ ...form, name, description: form.description.trim() });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-400/30 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-slate-900/85 dark:shadow-black/60"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                  <Layers size={20} />
                </span>
                <h2 className="font-display text-[18px] font-bold text-slate-900 dark:text-white">
                  {editing ? "Edit Vehicle Type" : "Add Vehicle Type"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
              <Field label="Vehicle Type" required>
                <input
                  value={form.name}
                  onChange={set("name")}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className={inputCls}
                  placeholder="e.g. Mini Truck"
                  autoFocus
                />
              </Field>
              <Field label="Status" required>
                <SearchSelect
                  options={STATUSES}
                  value={form.status}
                  onChange={set("status")}
                  icon={Activity}
                  isClearable={false}
                />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea
                  value={form.description}
                  onChange={set("description")}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Optional notes — capacity, usage, etc."
                />
              </Field>

              {error && (
                <div className="sm:col-span-2 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                    <X size={13} strokeWidth={3} />
                  </span>
                  <p className="flex-1 text-[13px] font-medium leading-relaxed text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02] sm:px-6">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
              >
                Close
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <Save size={16} />
                {editing ? "Update" : "Submit"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------- config --------------------------------- */

const PAGE_SIZE = 10;
const exportBtns = [
  { label: "CSV", icon: FileText },
  { label: "Excel", icon: FileSpreadsheet },
  { label: "PDF", icon: FileDown },
  { label: "Print", icon: Printer },
];
const columns = [
  { key: "sno", label: "S.NO.", sortable: false },
  { key: "name", label: "Vehicle Type" },
  { key: "description", label: "Description" },
  { key: "created", label: "Created Date" },
  { key: "status", label: "Status" },
];
const gridCols = "grid-cols-[60px_1.1fr_2fr_0.9fr_0.8fr_90px]";

const seedTypes = () =>
  VEHICLE_TYPES.map((name) => ({
    id: newId(),
    name,
    description: "",
    status: "Active",
    created: todayISO(),
  }));

/* --------------------------------- Page ----------------------------------- */

export default function VehicleType() {
  const rootRef = useRef(null);
  const [rows, setRows] = useLocalList("masters.vehicleTypes", seedTypes);

  // filters / table state
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [anyDropdownOpen, setAnyDropdownOpen] = useState(false);

  const openFlags = useRef({ t: false, s: false });
  const setFlag = (k) => (o) => {
    openFlags.current[k] = o;
    setAnyDropdownOpen(Object.values(openFlags.current).some(Boolean));
  };

  /* ---- entrance animation ---- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".vt-head", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".vt-card", { y: 24, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const typeNames = useMemo(() => rows.map((r) => r.name), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = rows.filter(
      (r) =>
        (!typeFilter || r.name === typeFilter) &&
        (!statusFilter || r.status === statusFilter) &&
        (!fromdate || r.created >= fromdate) &&
        (!todate || r.created <= todate) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)),
    );
    if (sort.key && sort.key !== "sno") {
      data = [...data].sort((a, b) => {
        const cmp = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return data;
  }, [rows, typeFilter, statusFilter, fromdate, todate, query, sort]);

  // any filter change starts back at page 1
  useEffect(() => setPage(1), [typeFilter, statusFilter, fromdate, todate, query]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, totalItems);
  const hasFilters = typeFilter || statusFilter || fromdate || todate || query;

  const toggleSort = (key) =>
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === "asc" ? "desc" : "asc",
    }));

  const resetFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setFromdate("");
    setTodate("");
    setQuery("");
  };

  const openAdd = () => {
    setEditing(null);
    setModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setModal(true);
  };

  const remove = (row) => {
    if (!window.confirm(`Delete vehicle type "${row.name}"?`)) return;
    setRows((list) => list.filter((r) => r.id !== row.id));
  };

  const save = (form) => {
    if (editing) {
      setRows((list) => list.map((r) => (r.id === editing.id ? { ...r, ...form } : r)));
    } else {
      setRows((list) => [...list, { id: newId(), created: todayISO(), ...form }]);
    }
    setModal(false);
    setEditing(null);
  };

  return (
    <div
      ref={rootRef}
      className="relative mx-auto max-w-[1500px] 2xl:max-w-none px-4 py-8 sm:px-6 lg:px-10"
    >
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-primary-500/10 blur-[120px]" />

      {/* header */}
      <div className="vt-head relative mb-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400">
          Masters
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            <Layers size={22} />
          </span>
          Vehicle Type
        </h1>
      </div>

      {/* card */}
      <div className={`vt-card ${card} ${anyDropdownOpen ? "z-30" : ""} overflow-visible`}>
        {/* card header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-white/[0.06] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">
            All Vehicle Types
          </h2>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus size={17} /> Add Vehicle Type
          </motion.button>
        </div>

        {/* filters: Vehicle Type + Status + created date range */}
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Vehicle Type
            </label>
            <SearchSelect
              options={typeNames}
              value={typeFilter}
              onChange={setTypeFilter}
              onOpenChange={setFlag("t")}
              placeholder="All Types"
              icon={Layers}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Status
            </label>
            <SearchSelect
              options={STATUSES}
              value={statusFilter}
              onChange={setStatusFilter}
              onOpenChange={setFlag("s")}
              placeholder="All Statuses"
              icon={Activity}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              From Date
            </label>
            <input
              type="date"
              value={fromdate}
              onChange={(e) => setFromdate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              To Date
            </label>
            <input
              type="date"
              value={todate}
              onChange={(e) => setTodate(e.target.value)}
              className={inputCls}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={resetFilters}
            disabled={!hasFilters}
            className="flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 sm:w-auto"
          >
            <RotateCcw size={15} /> Reset
          </motion.button>
        </div>

        {/* toolbar */}
        <div className="flex flex-col gap-3 px-5 pb-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {exportBtns.map(({ label, icon: Icon }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (label === "CSV")   exportCSV(filtered, columns, "vehicle-types");
                  if (label === "Excel") exportExcel(filtered, columns, "vehicle-types");
                  if (label === "PDF")   exportPDF(filtered, columns, "Vehicle Types", "vehicle-types");
                  if (label === "Print") exportPrint(filtered, columns, "Vehicle Types");
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-300"
              >
                <Icon size={15} /> {label}
              </motion.button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Vehicle Types"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto px-2 pb-2 sm:px-4">
          <div className="min-w-[860px]">
            <div
              className={`grid ${gridCols} items-center gap-3 rounded-xl bg-slate-800 px-5 py-3.5 text-white dark:bg-white/[0.06]`}
            >
              {columns.map((c) => (
                <button
                  key={c.key}
                  onClick={() => c.sortable !== false && toggleSort(c.key)}
                  className={`flex items-center gap-1 text-left text-[11px] font-bold uppercase tracking-wide transition-opacity ${
                    c.sortable === false ? "cursor-default" : "cursor-pointer hover:opacity-80"
                  }`}
                >
                  {c.label}
                  {c.sortable !== false && (
                    <span className="flex flex-col -space-y-1">
                      <ChevronUp
                        size={10}
                        className={
                          sort.key === c.key && sort.dir === "asc" ? "text-white" : "text-white/35"
                        }
                      />
                      <ChevronDown
                        size={10}
                        className={
                          sort.key === c.key && sort.dir === "desc" ? "text-white" : "text-white/35"
                        }
                      />
                    </span>
                  )}
                </button>
              ))}
              <span className="text-[11px] font-bold uppercase tracking-wide">Action</span>
            </div>

            {pageRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
                  <Inbox size={26} />
                </div>
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">
                  No vehicle types found
                </p>
                <p className="mt-1 text-[13px] text-slate-400">
                  {hasFilters ? "Try adjusting your filters." : "Add a vehicle type to get started."}
                </p>
              </div>
            ) : (
              pageRows.map((r, i) => (
                <div
                  key={r.id}
                  className={`group grid ${gridCols} items-center gap-3 border-b border-slate-100 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03]`}
                >
                  <span className="text-[13.5px] font-bold text-slate-400">
                    {(safePage - 1) * PAGE_SIZE + i + 1}
                  </span>
                  <span className="truncate text-[13.5px] font-medium text-slate-700 dark:text-slate-100">
                    {r.name}
                  </span>
                  <span className="truncate text-[13.5px] text-slate-500 dark:text-slate-400" title={r.description}>
                    {r.description || "—"}
                  </span>
                  <span className="text-[13.5px] text-slate-500 dark:text-slate-400">
                    {r.created || "—"}
                  </span>
                  <span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                        r.status === "Active"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                      }`}
                    >
                      {r.status}
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      whileHover={{ scale: 1.14 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEdit(r)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.14 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => remove(r)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-600 hover:text-white dark:bg-rose-500/15 dark:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </motion.button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:flex-row sm:px-6">
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{startIdx}</span> to{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{endIdx}</span> of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{totalItems}</span>{" "}
            entries
          </p>
          <div className="flex items-center gap-1.5">
            {[
              { icon: ChevronsLeft, go: () => setPage(1), dis: safePage === 1 },
              { icon: ChevronLeft, go: () => setPage(Math.max(1, safePage - 1)), dis: safePage === 1 },
            ].map(({ icon: Icon, go, dis }, i) => (
              <motion.button
                key={`p${i}`}
                whileHover={!dis ? { scale: 1.1, y: -1 } : {}}
                whileTap={!dis ? { scale: 0.92 } : {}}
                onClick={go}
                disabled={dis}
                className={`h-9 w-9 ${ghostBtn}`}
              >
                <Icon size={16} />
              </motion.button>
            ))}
            <PageNumbers currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
            {[
              { icon: ChevronRight, go: () => setPage(Math.min(totalPages, safePage + 1)), dis: safePage === totalPages },
              { icon: ChevronsRight, go: () => setPage(totalPages), dis: safePage === totalPages },
            ].map(({ icon: Icon, go, dis }, i) => (
              <motion.button
                key={`n${i}`}
                whileHover={!dis ? { scale: 1.1, y: -1 } : {}}
                whileTap={!dis ? { scale: 0.92 } : {}}
                onClick={go}
                disabled={dis}
                className={`h-9 w-9 ${ghostBtn}`}
              >
                <Icon size={16} />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <VehicleTypeModal
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
        }}
        onSave={save}
        editing={editing}
        existingNames={typeNames}
      />
    </div>
  );
}
