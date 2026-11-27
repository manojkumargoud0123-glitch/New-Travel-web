import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { gsap } from "gsap";
import { exportCSV, exportExcel, exportPDF, exportPrint } from "../../utils/exportUtils";
import {
  Layers,
  Plus,
  Pencil,
  Search,
  FileText,
  FileSpreadsheet,
  FileDown,
  Printer,
  ArrowDownAZ,
  ArrowDownZA,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
  Save,
  Inbox,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import PageNumbers from "../../components/PageNumbers";
import { useAuth } from "../../config/AuthContext";
import { EP, postJson, splitErrors, useVehicleTypes, naturalSort } from "../Trips/tripApi";

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

/* --------------------------------- modal ----------------------------------
   Add — POST /VehicleTypeADD/, Edit — POST /VehicleTypeEDIT/. Calls
   onSaved(message) once the API accepts it. Escape and the backdrop close it,
   except while saving. */

const FORM_FIELDS = ["add_vehicle_type"];

function VehicleTypeModal({ open, onClose, onSaved, editing, existingNames }) {
  const { apiFetch } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name || "");
      setError("");
      setBusy(false);
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) {
      setError("Vehicle type is required.");
      return;
    }
    const clash = existingNames.some(
      (n) => n.toLowerCase() === value.toLowerCase() && n !== editing?.name,
    );
    if (clash) {
      setError(`"${value}" already exists.`);
      return;
    }
    if (editing && value === editing.name) {
      onClose(); // nothing changed
      return;
    }

    setError("");
    setBusy(true);
    const r = editing
      ? await postJson(apiFetch, EP.typeEdit, { vehicle_type_id: editing.id, add_vehicle_type: value })
      : await postJson(apiFetch, EP.typeAdd, { add_vehicle_type: value });
    if (r.ok) {
      onSaved(
        editing
          ? `Vehicle type "${editing.name}" renamed to "${value}".`
          : `Vehicle type "${value}" added.`,
        value,
      );
      return;
    }
    const { inline, banner } = splitErrors(r, FORM_FIELDS);
    setError(inline.add_vehicle_type || banner);
    setBusy(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit Vehicle Type" : "Add Vehicle Type"}
            noValidate
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-400/30 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-slate-900/85 dark:shadow-black/60"
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
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
              <Field label="Vehicle Type" required>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  disabled={busy}
                  className={inputCls}
                  placeholder="e.g. Mini Truck"
                  autoFocus
                />
              </Field>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
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
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                disabled={busy}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
              >
                Close
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: busy ? 1 : 1.03 }}
                whileTap={{ scale: busy ? 1 : 0.97 }}
                disabled={busy}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-70"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editing ? "Update" : "Submit"}
              </motion.button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------- config --------------------------------- */

const PAGE_SIZE = 12; // fills 2, 3 or 4 columns evenly
const exportBtns = [
  { label: "CSV", icon: FileText },
  { label: "Excel", icon: FileSpreadsheet },
  { label: "PDF", icon: FileDown },
  { label: "Print", icon: Printer },
];
// columns of the CSV / Excel / PDF / Print exports
const columns = [
  { key: "sno", label: "S.NO." },
  { key: "name", label: "Vehicle Type" },
];
const gridCls = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

// Tile colours, picked by id so a type keeps its colour when renamed
const TONES = [
  { bar: "from-indigo-500 to-violet-500", glow: "bg-indigo-500/10", badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" },
  { bar: "from-emerald-500 to-teal-500", glow: "bg-emerald-500/10", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { bar: "from-amber-400 to-orange-500", glow: "bg-amber-500/10", badge: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" },
  { bar: "from-sky-500 to-cyan-500", glow: "bg-sky-500/10", badge: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" },
  { bar: "from-rose-500 to-pink-500", glow: "bg-rose-500/10", badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" },
  { bar: "from-violet-500 to-fuchsia-500", glow: "bg-violet-500/10", badge: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" },
];

// "Concrete Mixer" → "CM", "Tipper" → "TI"
const initials = (name) => {
  const words = name.match(/[\p{L}\p{N}]+/gu) || [];
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || "?").slice(0, 2).toUpperCase();
};

/* ---------------------------------- tile ---------------------------------- */

function TypeTile({ type, highlighted, onEdit }) {
  const tone = TONES[Math.abs(Number(type.id) || 0) % TONES.length];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 transition-[box-shadow,border-color] duration-300 hover:shadow-lg hover:shadow-slate-200/70 dark:bg-white/[0.03] dark:hover:shadow-black/30 ${
        highlighted
          ? "border-emerald-300 ring-2 ring-emerald-400/50 dark:border-emerald-400/40"
          : "border-slate-200 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/[0.15]"
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.bar}`} />
      <span
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-150 ${tone.glow}`}
      />

      <div className="relative flex items-center gap-3.5">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-[15px] font-extrabold tracking-wide ${tone.badge}`}
        >
          {initials(type.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-slate-800 dark:text-slate-100" title={type.name}>
            {type.name}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-slate-400">ID {type.id}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.14 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onEdit(type)}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400"
          title="Edit"
          aria-label={`Edit ${type.name}`}
        >
          <Pencil size={15} />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* --------------------------------- Page -----------------------------------
   The list comes from GET /VehicleTypeNewFilter/ (id + name only); search,
   sort and paging happen in the browser. */

export default function VehicleType() {
  const rootRef = useRef(null);
  const { types: rows, loading, error: loadError, reload } = useVehicleTypes();

  // list state
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(""); // success message after add / edit
  const [highlight, setHighlight] = useState(null); // name of the type just saved
  const jumpRef = useRef(null); // saved name whose page to show once the list has it

  /* ---- entrance animation ---- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".vt-head", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".vt-card", { y: 24, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!highlight) return undefined;
    const t = setTimeout(() => {
      setHighlight(null);
      jumpRef.current = null;
    }, 5000);
    return () => clearTimeout(t);
  }, [highlight]);

  const typeNames = useMemo(() => rows.map((r) => r.name), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const data = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    return data.sort((a, b) => dir * naturalSort(a.name, b.name));
  }, [rows, query, sortDir]);

  // a new search starts back at page 1
  useEffect(() => setPage(1), [query]);

  // after a save, turn to the page that holds the saved type
  useEffect(() => {
    if (!jumpRef.current) return;
    const idx = filtered.findIndex((r) => r.name === jumpRef.current);
    if (idx === -1) return;
    jumpRef.current = null;
    setPage(Math.floor(idx / PAGE_SIZE) + 1);
  }, [filtered]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, totalItems);
  const searching = query.trim() !== "";

  const openAdd = () => {
    setEditing(null);
    setModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setModal(true);
  };
  const closeModal = () => {
    setModal(false);
    setEditing(null);
  };

  const onSaved = (message, name) => {
    closeModal();
    setNotice(message);
    setHighlight(name);
    jumpRef.current = name;
    reload();
  };

  return (
    <MotionConfig reducedMotion="user">
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

        {/* result of the last add / edit */}
        <AnimatePresence>
          {notice && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-500/10"
            >
              <CheckCircle2 size={17} className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="flex-1 text-[13.5px] font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p>
              <button
                type="button"
                onClick={() => setNotice("")}
                title="Dismiss"
                aria-label="Dismiss"
                className="shrink-0 cursor-pointer rounded-md p-0.5 text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* card */}
        <div className={`vt-card ${card} overflow-visible`}>
          {/* card header */}
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-white/[0.06] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="flex items-center gap-2.5 text-[17px] font-bold text-slate-900 dark:text-white">
              All Vehicle Types
              {!loadError && !(loading && rows.length === 0) && (
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[12px] font-bold text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                  {rows.length}
                </span>
              )}
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

          {/* toolbar */}
          <div className="flex flex-col gap-3 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
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
            <div className="flex w-full items-center gap-2 lg:w-auto">
              <div className="relative flex-1 lg:w-72 lg:flex-none">
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
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                title={sortDir === "asc" ? "Sorted A to Z" : "Sorted Z to A"}
                aria-label={sortDir === "asc" ? "Sorted A to Z, switch to Z to A" : "Sorted Z to A, switch to A to Z"}
                className={`h-[44px] w-[44px] shrink-0 ${ghostBtn}`}
              >
                {sortDir === "asc" ? <ArrowDownAZ size={18} /> : <ArrowDownZA size={18} />}
              </motion.button>
            </div>
          </div>

          {/* cards */}
          <div className="px-5 pb-5 sm:px-6">
            {loading && rows.length === 0 ? (
              <div className={gridCls} role="status" aria-label="Loading vehicle types">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 rounded-2xl border border-slate-200 p-4 dark:border-white/[0.08]"
                  >
                    <span className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <span className="block h-3.5 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
                      <span className="block h-3 w-1/4 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                  <AlertTriangle size={26} />
                </div>
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">
                  Couldn't load vehicle types.
                </p>
                <button
                  type="button"
                  onClick={reload}
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
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">
                  No vehicle types found
                </p>
                <p className="mt-1 text-[13px] text-slate-400">
                  {searching ? "Nothing matches your search." : "Add a vehicle type to get started."}
                </p>
              </div>
            ) : (
              <div className={gridCls}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {pageRows.map((r) => (
                    <TypeTile key={r.id} type={r} highlighted={r.name === highlight} onEdit={openEdit} />
                  ))}
                </AnimatePresence>
              </div>
            )}
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
          onClose={closeModal}
          onSaved={onSaved}
          editing={editing}
          existingNames={typeNames}
        />
      </div>
    </MotionConfig>
  );
}
