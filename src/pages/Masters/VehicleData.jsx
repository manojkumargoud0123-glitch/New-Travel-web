import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useLocation } from "react-router-dom";
import { exportCSV, exportExcel, exportPDF, exportPrint } from "../../utils/exportUtils";
import {
  Truck,
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
  Upload,
  Save,
  Inbox,
  Loader2,
  Activity,
  Layers,
} from "lucide-react";
import PageNumbers from "../../components/PageNumbers";
import SearchSelect from "../../components/SearchSelect";
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

/* Human-friendly labels for the status names returned by the API */
const STATUS_LABELS = {
  online: "Online",
  offline: "Offline",
  onroad: "On Road",
  offroad: "Off Road",
  breakdown: "Breakdown",
};
const prettyStatus = (name) =>
  STATUS_LABELS[String(name).toLowerCase()] ||
  String(name).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* --------------------------- error message parser ------------------------- */
function parseApiError(json) {
  if (!json) return "Something went wrong. Please try again.";
  const d = json.detail;

  if (d && typeof d === "object" && !Array.isArray(d) && d.message) {
    return d.message;
  }
  if (Array.isArray(d) && d.length) {
    return d
      .map((e) => {
        const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : "";
        return field ? `${field}: ${e.msg}` : e.msg;
      })
      .join(", ");
  }
  if (typeof d === "string") return d;
  if (json.message) return json.message;
  return "Save failed. Please check the fields and try again.";
}

/* --------------------------------- field ---------------------------------- */

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="px-0.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
        {label} {required && <span className="text-primary-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function FileField({ label, required, file, onFile }) {
  return (
    <Field label={label} required={required}>
      <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2.5 transition-colors hover:border-primary-400/60 hover:bg-primary-500/[0.03] dark:border-white/15 dark:bg-white/[0.02]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 transition-transform group-hover:scale-110">
          <Upload size={15} />
        </span>
        <span className="truncate text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
          {file?.name || "Choose file — no file chosen"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </label>
    </Field>
  );
}

/* --------------------------------- modal ---------------------------------- */

const emptyForm = {
  vehicleNo: "",
  owner_name: "",
  owner_address: "",
  vehicle_make: "",
  vehicle_model: "",
  chassis_no: "",
  engine_no: "",
  colour: "",
  vehicle_reg_date: "",
};

function AddVehicleModal({ open, onClose, onSave, editing, vehicleOptions, submitting, serverError }) {
  const [form, setForm] = useState(emptyForm);
  const [rcFile, setRcFile] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [error, setError] = useState("");

  const set = (k) => (v) =>
    setForm((f) => ({ ...f, [k]: typeof v === "string" ? v : v.target.value }));

  useEffect(() => {
    if (serverError) setError(serverError);
  }, [serverError]);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              vehicleNo: editing.vehicleNo || "",
              owner_name: editing.owner_name || "",
              owner_address: editing.owner_address || "",
              vehicle_make: editing.vehicle_make || "",
              vehicle_model: editing.vehicle_model || "",
              chassis_no: editing.chassis_no || "",
              engine_no: editing.engine_no || "",
              colour: editing.colour || "",
              vehicle_reg_date: editing.vehicle_reg_date || "",
            }
          : emptyForm,
      );
      setRcFile(null);
      setImgFile(null);
      setError("");
    }
  }, [open, editing]);

  const handleSubmit = () => {
    const required = [
      "vehicleNo",
      "owner_name",
      "owner_address",
      "vehicle_make",
      "vehicle_model",
      "chassis_no",
      "engine_no",
      "colour",
      "vehicle_reg_date",
    ];
    const missing = required.filter((k) => !String(form[k]).trim());
    if (missing.length) {
      setError("Please fill all required fields.");
      return;
    }
    if (!editing && (!rcFile || !imgFile)) {
      setError("RC copy and vehicle image are required.");
      return;
    }
    setError("");
    onSave(form, rcFile, imgFile);
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
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-400/30 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-slate-900/85 dark:shadow-black/60"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                  <Truck size={20} />
                </span>
                <h2 className="font-display text-[18px] font-bold text-slate-900 dark:text-white">
                  {editing ? "Edit Vehicle Data" : "Add Vehicle Data"}
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
              <Field label="Vehicle Number" required>
                <SearchSelect
                  options={vehicleOptions}
                  value={form.vehicleNo}
                  onChange={set("vehicleNo")}
                  placeholder="Select or type a Vehicle Number"
                  icon={Truck}
                  allowAddNew
                />
              </Field>
              <Field label="Owner Name" required>
                <input
                  value={form.owner_name}
                  onChange={set("owner_name")}
                  className={inputCls}
                  placeholder="Enter Owner Name"
                />
              </Field>

              <Field label="Owner Address" required>
                <input
                  value={form.owner_address}
                  onChange={set("owner_address")}
                  className={inputCls}
                  placeholder="Enter Owner Address"
                />
              </Field>
              <Field label="Vehicle Make" required>
                <input
                  value={form.vehicle_make}
                  onChange={set("vehicle_make")}
                  className={inputCls}
                  placeholder="Enter Vehicle Make"
                />
              </Field>

              <Field label="Vehicle Model" required>
                <input
                  value={form.vehicle_model}
                  onChange={set("vehicle_model")}
                  className={inputCls}
                  placeholder="Enter Vehicle Model"
                />
              </Field>
              <Field label="Colour" required>
                <input
                  value={form.colour}
                  onChange={set("colour")}
                  className={inputCls}
                  placeholder="Enter Colour"
                />
              </Field>

              <Field label="Engine Number" required>
                <input
                  value={form.engine_no}
                  onChange={set("engine_no")}
                  className={inputCls}
                  placeholder="Enter Engine Number"
                />
              </Field>
              <Field label="Chassis Number" required>
                <input
                  value={form.chassis_no}
                  onChange={set("chassis_no")}
                  className={inputCls}
                  placeholder="Enter Chassis Number"
                />
              </Field>

              <Field label="Date of Registration" required>
                <input
                  type="date"
                  value={form.vehicle_reg_date}
                  onChange={set("vehicle_reg_date")}
                  className={inputCls}
                />
              </Field>
              <div className="hidden sm:block" />

              <FileField
                label="RC Copy upload"
                required={!editing}
                file={rcFile}
                onFile={setRcFile}
              />
              <FileField
                label="Vehicle Image"
                required={!editing}
                file={imgFile}
                onFile={setImgFile}
              />

              {error && (
                <div className="sm:col-span-2 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                    <X size={13} strokeWidth={3} />
                  </span>
                  <p className="flex-1 text-[13px] font-medium leading-relaxed text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="shrink-0 cursor-pointer rounded-md p-0.5 text-rose-400 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20"
                    title="Dismiss"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02] sm:px-6">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                disabled={submitting}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
              >
                Close
              </motion.button>
              <motion.button
                whileHover={{ scale: submitting ? 1 : 1.03 }}
                whileTap={{ scale: submitting ? 1 : 0.97 }}
                onClick={handleSubmit}
                disabled={submitting}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
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

const PAGE_SIZE = 50;
const exportBtns = [
  { label: "CSV", icon: FileText },
  { label: "Excel", icon: FileSpreadsheet },
  { label: "PDF", icon: FileDown },
  { label: "Print", icon: Printer },
];
const columns = [
  { key: "sno", label: "S.NO.", sortable: false },
  { key: "vehicleNo", label: "Vehicle Number" },
  { key: "owner_name", label: "Owner Name" },
  { key: "vehicle_make", label: "Make" },
  { key: "vehicle_model", label: "Model" },
  { key: "engine_no", label: "Engine Number" },
  { key: "chassis_no", label: "Chassis Number" },
  { key: "colour", label: "Colour" },
  { key: "capacity", label: "Capacity" },
  { key: "vehicle_reg_date", label: "Reg. Date" },
  { key: "status", label: "Status" },
];
const gridCols =
  "grid-cols-[60px_1.2fr_1fr_0.9fr_0.9fr_1.2fr_1.2fr_0.8fr_0.7fr_1fr_0.8fr_90px]";

/* --------------------------------- Page ----------------------------------- */

export default function VehicleData() {
  const rootRef = useRef(null);
  const location = useLocation();

  const [rows, setRows] = useState([]);
  const [vehicleNames, setVehicleNames] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]); // [{ id, name }]
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");

  // filters / table state
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
// near your other useState declarations
const [statusFilter, setStatusFilter] = useState(
  () => (location.state?.status_filter
    ? String(location.state.status_filter).toLowerCase()
    : "")
); // holds the status NAME (e.g. "online")
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "vehicleNo", dir: "asc" });
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [anyDropdownOpen, setAnyDropdownOpen] = useState(false);

  const openFlags = useRef({ t: false, v: false, s: false });
  const setFlag = (k) => (o) => {
    openFlags.current[k] = o;
    setAnyDropdownOpen(Object.values(openFlags.current).some(Boolean));
  };

  /* ---- map status label (shown) <-> name (sent) ---- */
  const statusLabels = useMemo(
    () => statusOptions.map((s) => prettyStatus(s.name)),
    [statusOptions]
  );
  const labelToName = useMemo(() => {
    const m = {};
    statusOptions.forEach((s) => { m[prettyStatus(s.name)] = s.name; });
    return m;
  }, [statusOptions]);
  const nameToLabel = useMemo(() => {
    const m = {};
    statusOptions.forEach((s) => { m[s.name] = prettyStatus(s.name); });
    return m;
  }, [statusOptions]);

  // value shown in the status dropdown (the pretty label)
  const statusFilterLabel = statusFilter ? (nameToLabel[statusFilter] || prettyStatus(statusFilter)) : "";

  /* ---- data ----
     Vehicles, vehicle names and statuses came from the old backend.
     The Travel API has no vehicle-list endpoint yet, so no request is made
     and the options and table stay empty. */
  const loadVehicleNames = useCallback(async () => setVehicleNames([]), []);
  const loadStatuses = useCallback(async () => setStatusOptions([]), []);
  const loadVehicles = useCallback(async () => {
    setRows([]);
    setTotalItems(0);
    setTotalPages(1);
    setFetchError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadVehicleNames();
    loadStatuses();
  }, [loadVehicleNames, loadStatuses]);

  /* ---- status passed from the Dashboard via router state ----
     The value is already seeded into `statusFilter`'s initial state above, so
     the list loads once already-filtered. Here we only clear the navigation
     state so a manual refresh / back doesn't re-apply it. (Re-setting the
     filter here previously risked a second /vehicle/list call.) */
  useEffect(() => {
    if (location.state?.status_filter) window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  /* ---- entrance animation ---- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".vd-head", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".vd-card", { y: 24, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const sortedRows = useMemo(() => {
    if (!sort.key || sort.key === "sno") return rows;
    return [...rows].sort((a, b) => {
      const x = a[sort.key],
        y = b[sort.key];
      const cmp =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort]);

  const startIdx = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, totalItems);

  const toggleSort = (key) =>
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === "asc" ? "desc" : "asc",
    }));

  const applyFilters = () => {
    setPage(1);
    loadVehicles();
  };

  const clearStatus = () => {
    setStatusFilter("");
    setPage(1);
  };

  const openEdit = (row) => {
    setEditing(row);
    setSaveError("");
    setModal(true);
  };

  // Deleting / saving vehicles used the old backend — not available yet.
  const remove = async () => {
    alert("Deleting vehicles isn't available yet.");
  };

  const save = async () => {
    setSaveError("Saving vehicles isn't available yet.");
  };

  return (
    <div
      ref={rootRef}
      className="relative mx-auto max-w-[1500px] 2xl:max-w-none px-4 py-8 sm:px-6 lg:px-10"
    >
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-primary-500/10 blur-[120px]" />

      {/* header */}
      <div className="vd-head relative mb-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400">
          Masters
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            <Truck size={22} />
          </span>
          Vehicle Data
        </h1>
      </div>

      {/* card */}
      <div className={`vd-card ${card} ${anyDropdownOpen ? "z-30" : ""} overflow-visible`}>
        {/* card header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-white/[0.06] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">
            All Vehicles
          </h2>
        </div>

        {/* filters: Vehicle Type + Vehicle Number + Status + date range */}
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] xl:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Vehicle Type
            </label>
            <SearchSelect
              options={VEHICLE_TYPES}
              value={vehicleTypeFilter}
              onChange={(v) => setVehicleTypeFilter(v)}
              onOpenChange={setFlag("t")}
              placeholder="All Types"
              icon={Layers}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Vehicle Number
            </label>
            <SearchSelect
              options={vehicleNames}
              value={vehicleFilter}
              onChange={(v) => setVehicleFilter(v)}
              onOpenChange={setFlag("v")}
              placeholder="All Vehicles"
              icon={Truck}
            />
          </div>

          {/* NEW — Vehicle Status filter */}
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Vehicle Status
            </label>
            <SearchSelect
              options={statusLabels}
              value={statusFilterLabel}
              onChange={(label) => {
                // store the underlying status name, not the label
                setStatusFilter(label ? (labelToName[label] || label.toLowerCase()) : "");
              }}
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
            onClick={applyFilters}
            className="flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 sm:w-auto lg:self-end"
          >
            Submit
          </motion.button>
        </div>

        {/* Active status filter chip (e.g. when arriving from dashboard) */}
        {/* {statusFilter && (
          <div className="flex items-center gap-2 px-5 pb-1 sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[12px] font-semibold text-primary-600 dark:border-primary-400/30 dark:bg-primary-500/10 dark:text-primary-300">
              Status: {statusFilterLabel}
              <button
                type="button"
                onClick={clearStatus}
                className="ml-0.5 cursor-pointer rounded-full p-0.5 hover:bg-primary-100 dark:hover:bg-primary-500/20"
                title="Clear status filter"
              >
                <X size={13} />
              </button>
            </span>
          </div>
        )} */}

        {/* toolbar */}
        <div className="flex flex-col gap-3 px-5 pb-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {exportBtns.map(({ label, icon: Icon }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (label === "CSV")   exportCSV(sortedRows, columns, "vehicle-master");
                  if (label === "Excel") exportExcel(sortedRows, columns, "vehicle-master");
                  if (label === "PDF")   exportPDF(sortedRows, columns, "Vehicle Master", "vehicle-master");
                  if (label === "Print") exportPrint(sortedRows, columns, "Vehicle Master");
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
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Search Vehicle Data"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto px-2 pb-2 sm:px-4">
          <div className="min-w-[1240px]">
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
                          sort.key === c.key && sort.dir === "asc"
                            ? "text-white"
                            : "text-white/35"
                        }
                      />
                      <ChevronDown
                        size={10}
                        className={
                          sort.key === c.key && sort.dir === "desc"
                            ? "text-white"
                            : "text-white/35"
                        }
                      />
                    </span>
                  )}
                </button>
              ))}
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Action
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 size={28} className="mb-3 animate-spin text-primary-500" />
                <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">
                  Loading vehicles…
                </p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                  <X size={26} />
                </div>
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">
                  {fetchError}
                </p>
                <button
                  onClick={loadVehicles}
                  className="mt-3 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                >
                  Try again
                </button>
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
                  <Inbox size={26} />
                </div>
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">
                  No vehicles found
                </p>
                <p className="mt-1 text-[13px] text-slate-400">
                  {statusFilter
                    ? `No vehicles with status "${statusFilterLabel}".`
                    : "Try adjusting your filters."}
                </p>
              </div>
            ) : (
              sortedRows.map((r, i) => (
                <div
                  key={r.id}
                  className={`vd-row group grid ${gridCols} items-center gap-3 border-b border-slate-100 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03]`}
                >
                  <span className="text-[13.5px] font-bold text-slate-400">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </span>
                  <span className="truncate text-[13.5px] font-medium text-slate-700 dark:text-slate-100">
                    {r.vehicleNo}
                  </span>
                  <span className="truncate text-[13.5px] text-slate-600 dark:text-slate-300">
                    {r.owner_name || "—"}
                  </span>
                  <span className="truncate text-[13.5px] text-slate-600 dark:text-slate-300">
                    {r.vehicle_make || "—"}
                  </span>
                  <span className="truncate text-[13.5px] text-slate-600 dark:text-slate-300">
                    {r.vehicle_model || "—"}
                  </span>
                  <span className="truncate text-[13.5px] text-slate-500 dark:text-slate-400">
                    {r.engine_no || "—"}
                  </span>
                  <span className="truncate text-[13.5px] text-slate-500 dark:text-slate-400">
                    {r.chassis_no || "—"}
                  </span>
                  <span className="truncate text-[13.5px] text-slate-500 dark:text-slate-400">
                    {r.colour || "—"}
                  </span>
                  <span className="text-[13.5px] text-slate-500 dark:text-slate-400">
                    {r.capacity ?? "—"}
                  </span>
                  <span className="text-[13.5px] text-slate-500 dark:text-slate-400">
                    {r.vehicle_reg_date || "—"}
                  </span>
                  <span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                        String(r.status).toLowerCase() === "online" || r.status === "Active"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                      }`}
                    >
                      {r.status ? prettyStatus(r.status) : "—"}
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
                      onClick={() => remove(r.id)}
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
              { icon: ChevronsLeft, go: () => setPage(1), dis: page === 1 },
              { icon: ChevronLeft, go: () => setPage((p) => Math.max(1, p - 1)), dis: page === 1 },
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
            <PageNumbers currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            {[
              { icon: ChevronRight, go: () => setPage((p) => Math.min(totalPages, p + 1)), dis: page === totalPages },
              { icon: ChevronsRight, go: () => setPage(totalPages), dis: page === totalPages },
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

      <AddVehicleModal
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
          setSaveError("");
        }}
        onSave={save}
        editing={editing}
        vehicleOptions={vehicleNames}
        submitting={submitting}
        serverError={saveError}
      />
    </div>
  );
}