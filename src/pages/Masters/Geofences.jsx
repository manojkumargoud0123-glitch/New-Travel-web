import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { exportCSV, exportExcel, exportPDF, exportPrint } from "../../utils/exportUtils";
import {
  Hexagon,
  Circle as CircleIcon,
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
  Crosshair,
  Undo2,
  MousePointerClick,
  Shapes,
} from "lucide-react";
import PageNumbers from "../../components/PageNumbers";
import SearchSelect from "../../components/SearchSelect";
import useLocalList, { newId, todayISO } from "../../hooks/useLocalList";

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
const SHAPES = { circle: "Circle", polygon: "Polygon" };
const SHAPE_LABELS = Object.values(SHAPES);
const shapeFromLabel = (label) =>
  Object.keys(SHAPES).find((k) => SHAPES[k] === label) || "";

/* =========================================================================
   LEAFLET
   ========================================================================= */

const DEFAULT_VIEW = { center: [20.5937, 78.9629], zoom: 5 }; // India
const ACCENT = "#6366f1";
const MUTED = "#94a3b8";

const TILES = {
  Street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  Satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
};

const vertexStyle = {
  radius: 5,
  color: "#fff",
  weight: 2,
  fillColor: ACCENT,
  fillOpacity: 1,
  interactive: false,
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* Creates a map on the ref'd element; returns null until it exists. */
function useLeafletMap(containerRef) {
  const [map, setMap] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const base = Object.fromEntries(
      Object.entries(TILES).map(([name, t]) => [
        name,
        L.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom }),
      ]),
    );
    const m = L.map(el, {
      center: DEFAULT_VIEW.center,
      zoom: DEFAULT_VIEW.zoom,
      layers: [base.Street],
    });
    L.control.layers(base, null, { position: "topright" }).addTo(m);

    // the container can resize after mount (modal spring-in, responsive grid)
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el);

    setMap(m);
    return () => {
      ro.disconnect();
      m.remove();
      setMap(null);
    };
  }, [containerRef]);

  return map;
}

const fenceLayer = (f, style) =>
  f.shape === "circle"
    ? L.circle([f.lat, f.lng], { radius: f.radius, ...style })
    : L.polygon(f.points, style);

const fenceCenter = (f) => {
  if (f.shape === "circle") return [f.lat, f.lng];
  const n = f.points.length || 1;
  return [
    f.points.reduce((s, p) => s + p[0], 0) / n,
    f.points.reduce((s, p) => s + p[1], 0) / n,
  ];
};

const fmtCoord = ([lat, lng]) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

const fmtSize = (f) =>
  f.shape === "circle"
    ? f.radius >= 1000
      ? `${(f.radius / 1000).toFixed(2)} km radius`
      : `${Math.round(f.radius)} m radius`
    : `${f.points.length} points`;

/* ------------------------------ overview map ------------------------------ */

function OverviewMap({ fences, focus }) {
  const elRef = useRef(null);
  const map = useLeafletMap(elRef);
  const layersRef = useRef({});

  useEffect(() => {
    if (!map) return;
    const group = L.featureGroup().addTo(map);
    const byId = {};
    fences.forEach((f) => {
      const color = f.status === "Active" ? ACCENT : MUTED;
      const layer = fenceLayer(f, { color, weight: 2, fillColor: color, fillOpacity: 0.15 });
      layer.bindTooltip(esc(f.name), { sticky: true });
      layer.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:160px">
           <div style="font-weight:700;font-size:13.5px;color:#0f172a">${esc(f.name)}</div>
           <div style="margin-top:4px;font-size:12px;color:#64748b">${SHAPES[f.shape]} · ${esc(fmtSize(f))}</div>
           <div style="font-size:12px;color:#64748b">${fmtCoord(fenceCenter(f))}</div>
           <div style="margin-top:4px;font-size:11.5px;font-weight:600;color:${f.status === "Active" ? "#059669" : "#64748b"}">${esc(f.status)}</div>
         </div>`,
      );
      layer.addTo(group);
      byId[f.id] = layer;
    });
    layersRef.current = byId;

    if (fences.length) map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15 });
    else map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);

    return () => group.remove();
  }, [map, fences]);

  useEffect(() => {
    if (!map || !focus) return;
    const layer = layersRef.current[focus.id];
    if (!layer) return;
    // open after the fly ends — popup auto-pan would cut the animation short
    map.once("moveend", () => layer.openPopup());
    map.flyToBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 16, duration: 0.8 });
  }, [map, focus]);

  return <div ref={elRef} className="absolute inset-0" />;
}

/* -------------------------------- draw map -------------------------------- */

function DrawMap({ shape, center, radius, points, onPick }) {
  const elRef = useRef(null);
  const map = useLeafletMap(elRef);

  // latest values without re-binding the click handler / refitting on each change
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const initial = useRef({ shape, center, radius, points });

  useEffect(() => {
    if (!map) return;
    const handler = (e) =>
      onPickRef.current([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]);
    map.on("click", handler);
    map.getContainer().style.cursor = "crosshair";

    // editing an existing fence: frame it once
    const f = initial.current;
    if (f.shape === "circle" && f.center) {
      map.fitBounds(L.latLng(f.center).toBounds(Math.max(f.radius, 50) * 2), { padding: [30, 30] });
    } else if (f.shape === "polygon" && f.points.length) {
      map.fitBounds(L.latLngBounds(f.points), { padding: [30, 30], maxZoom: 17 });
    }
    return () => map.off("click", handler);
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const g = L.featureGroup().addTo(map);
    const style = { color: ACCENT, weight: 2, fillColor: ACCENT, fillOpacity: 0.18, interactive: false };
    if (shape === "circle" && center) {
      if (radius > 0) L.circle(center, { radius, ...style }).addTo(g);
      L.circleMarker(center, vertexStyle).addTo(g);
    }
    if (shape === "polygon" && points.length) {
      if (points.length >= 3) L.polygon(points, style).addTo(g);
      else L.polyline(points, { ...style, dashArray: "6 6" }).addTo(g);
      points.forEach((p) => L.circleMarker(p, vertexStyle).addTo(g));
    }
    return () => g.remove();
  }, [map, shape, center, radius, points]);

  return <div ref={elRef} className="absolute inset-0" />;
}

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

const emptyForm = {
  name: "",
  shape: "circle",
  lat: "",
  lng: "",
  radius: "500",
  points: [],
  description: "",
  status: "Active",
};

const isNum = (v) => v !== "" && Number.isFinite(Number(v));

const formFrom = (editing) =>
  editing
    ? {
        ...emptyForm,
        name: editing.name,
        shape: editing.shape,
        lat: editing.shape === "circle" ? String(editing.lat) : "",
        lng: editing.shape === "circle" ? String(editing.lng) : "",
        radius: editing.shape === "circle" ? String(editing.radius) : emptyForm.radius,
        points: editing.shape === "polygon" ? editing.points : [],
        description: editing.description || "",
        status: editing.status || "Active",
      }
    : emptyForm;

/* The dialog mounts fresh on every open so the draw map starts from the
   right geofence instead of whatever the form held last time. */
function GeofenceModal({ open, ...props }) {
  return (
    <AnimatePresence>
      {open && <GeofenceDialog key="geofence-dialog" {...props} />}
    </AnimatePresence>
  );
}

function GeofenceDialog({ onClose, onSave, editing, existingNames }) {
  const [form, setForm] = useState(() => formFrom(editing));
  const [error, setError] = useState("");

  const set = (k) => (v) =>
    setForm((f) => ({ ...f, [k]: typeof v === "string" ? v : v.target.value }));

  const center = useMemo(
    () => (isNum(form.lat) && isNum(form.lng) ? [Number(form.lat), Number(form.lng)] : null),
    [form.lat, form.lng],
  );
  const radius = isNum(form.radius) ? Number(form.radius) : 0;

  const pick = (pt) => {
    setError("");
    setForm((f) =>
      f.shape === "circle"
        ? { ...f, lat: String(pt[0]), lng: String(pt[1]) }
        : { ...f, points: [...f.points, pt] },
    );
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) return setError("Geofence name is required.");
    const clash = existingNames.some(
      (n) => n.toLowerCase() === name.toLowerCase() && n !== editing?.name,
    );
    if (clash) return setError(`"${name}" already exists.`);

    let geometry;
    if (form.shape === "circle") {
      if (!center) return setError("Click the map (or enter latitude/longitude) to set the centre.");
      const [lat, lng] = center;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return setError("Latitude/longitude is out of range.");
      if (!(radius > 0)) return setError("Radius must be greater than 0 metres.");
      geometry = { lat, lng, radius, points: [] };
    } else {
      if (form.points.length < 3) return setError("A polygon needs at least 3 points — click the map to add them.");
      geometry = { lat: null, lng: null, radius: null, points: form.points };
    }

    setError("");
    onSave({
      name,
      shape: form.shape,
      ...geometry,
      description: form.description.trim(),
      status: form.status,
    });
  };

  const isCircle = form.shape === "circle";

  return (
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
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-400/30 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-slate-900/85 dark:shadow-black/60"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
              <Hexagon size={20} />
            </span>
            <h2 className="font-display text-[18px] font-bold text-slate-900 dark:text-white">
              {editing ? "Edit Geofence" : "Add Geofence"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 overflow-y-auto px-5 py-5 sm:px-6 lg:grid-cols-[340px_1fr]">
          {/* form */}
          <div className="flex flex-col gap-4">
            <Field label="Geofence Name" required>
              <input
                value={form.name}
                onChange={set("name")}
                className={inputCls}
                placeholder="e.g. Main Warehouse"
                autoFocus
              />
            </Field>

            <Field label="Shape" required>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">
                {[
                  { key: "circle", icon: CircleIcon },
                  { key: "polygon", icon: Hexagon },
                ].map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setError("");
                      setForm((f) => ({ ...f, shape: key }));
                    }}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-[13.5px] font-semibold transition-colors ${
                      form.shape === key
                        ? "bg-white text-primary-600 shadow-sm dark:bg-white/10 dark:text-primary-300"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={15} /> {SHAPES[key]}
                  </button>
                ))}
              </div>
            </Field>

            {isCircle ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude" required>
                    <input
                      value={form.lat}
                      onChange={set("lat")}
                      inputMode="decimal"
                      className={inputCls}
                      placeholder="17.38500"
                    />
                  </Field>
                  <Field label="Longitude" required>
                    <input
                      value={form.lng}
                      onChange={set("lng")}
                      inputMode="decimal"
                      className={inputCls}
                      placeholder="78.48670"
                    />
                  </Field>
                </div>
                <Field label="Radius (metres)" required>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={form.radius}
                    onChange={set("radius")}
                    className={inputCls}
                  />
                </Field>
              </>
            ) : (
              <Field label="Points" required>
                <div className="flex items-center gap-2">
                  <span className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-[14px] font-medium text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-300">
                    {form.points.length} point{form.points.length === 1 ? "" : "s"}
                    {form.points.length > 0 && form.points.length < 3 && (
                      <span className="text-slate-400"> — need {3 - form.points.length} more</span>
                    )}
                  </span>
                  <button
                    type="button"
                    title="Undo last point"
                    disabled={!form.points.length}
                    onClick={() => setForm((f) => ({ ...f, points: f.points.slice(0, -1) }))}
                    className={`h-[44px] w-[44px] ${ghostBtn}`}
                  >
                    <Undo2 size={16} />
                  </button>
                  <button
                    type="button"
                    title="Clear all points"
                    disabled={!form.points.length}
                    onClick={() => setForm((f) => ({ ...f, points: [] }))}
                    className={`h-[44px] w-[44px] ${ghostBtn}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Field>
            )}

            <Field label="Status" required>
              <SearchSelect
                options={STATUSES}
                value={form.status}
                onChange={set("status")}
                icon={Activity}
                isClearable={false}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={set("description")}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Optional notes"
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

          {/* map */}
          <div className="flex min-h-[340px] flex-col gap-2 lg:min-h-[460px]">
            <p className="flex items-center gap-2 px-0.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
              <MousePointerClick size={15} className="shrink-0 text-primary-500" />
              {isCircle
                ? "Click the map to place the centre — the circle uses the radius on the left."
                : "Click the map to add polygon points in order."}
            </p>
            <div className="relative isolate flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08]">
              <DrawMap
                shape={form.shape}
                center={center}
                radius={radius}
                points={form.points}
                onPick={pick}
              />
            </div>
          </div>
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
  { key: "name", label: "Geofence Name" },
  { key: "shapeLabel", label: "Shape" },
  { key: "centerLabel", label: "Centre (Lat, Lng)", sortable: false },
  { key: "sizeLabel", label: "Radius / Points", sortable: false },
  { key: "created", label: "Created Date" },
  { key: "status", label: "Status" },
];
const gridCols = "grid-cols-[60px_1.3fr_0.8fr_1.3fr_1fr_0.9fr_0.8fr_120px]";

/* --------------------------------- Page ----------------------------------- */

export default function Geofences() {
  const rootRef = useRef(null);
  const mapWrapRef = useRef(null);
  const [rows, setRows] = useLocalList("masters.geofences", []);

  // filters / table state
  const [nameFilter, setNameFilter] = useState("");
  const [shapeFilter, setShapeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [focus, setFocus] = useState(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [anyDropdownOpen, setAnyDropdownOpen] = useState(false);

  const openFlags = useRef({ n: false, sh: false, s: false });
  const setFlag = (k) => (o) => {
    openFlags.current[k] = o;
    setAnyDropdownOpen(Object.values(openFlags.current).some(Boolean));
  };

  /* ---- entrance animation ---- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gf-head", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".gf-card", { y: 24, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const names = useMemo(() => rows.map((r) => r.name), [rows]);

  // rows + display/export fields
  const decorated = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        shapeLabel: SHAPES[r.shape],
        centerLabel: fmtCoord(fenceCenter(r)),
        sizeLabel: fmtSize(r),
      })),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shape = shapeFromLabel(shapeFilter);
    let data = decorated.filter(
      (r) =>
        (!nameFilter || r.name === nameFilter) &&
        (!shape || r.shape === shape) &&
        (!statusFilter || r.status === statusFilter) &&
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
  }, [decorated, nameFilter, shapeFilter, statusFilter, query, sort]);

  // any filter change starts back at page 1
  useEffect(() => setPage(1), [nameFilter, shapeFilter, statusFilter, query]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, totalItems);
  const hasFilters = nameFilter || shapeFilter || statusFilter || query;

  const toggleSort = (key) =>
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === "asc" ? "desc" : "asc",
    }));

  const resetFilters = () => {
    setNameFilter("");
    setShapeFilter("");
    setStatusFilter("");
    setQuery("");
  };

  const locate = (row) => {
    setFocus({ id: row.id, at: Date.now() });
    mapWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    if (!window.confirm(`Delete geofence "${row.name}"?`)) return;
    setRows((list) => list.filter((r) => r.id !== row.id));
  };

  const save = (data) => {
    if (editing) {
      setRows((list) => list.map((r) => (r.id === editing.id ? { ...r, ...data } : r)));
    } else {
      setRows((list) => [...list, { id: newId(), created: todayISO(), ...data }]);
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
      <div className="gf-head relative mb-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400">
          Masters
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            <Hexagon size={22} />
          </span>
          Geofences
        </h1>
      </div>

      {/* card */}
      <div className={`gf-card ${card} ${anyDropdownOpen ? "z-30" : ""} overflow-visible`}>
        {/* card header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-white/[0.06] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">
            All Geofences
          </h2>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus size={17} /> Add Geofence
          </motion.button>
        </div>

        {/* filters: Geofence Name + Shape + Status */}
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Geofence Name
            </label>
            <SearchSelect
              options={names}
              value={nameFilter}
              onChange={setNameFilter}
              onOpenChange={setFlag("n")}
              placeholder="All Geofences"
              icon={Hexagon}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Shape
            </label>
            <SearchSelect
              options={SHAPE_LABELS}
              value={shapeFilter}
              onChange={setShapeFilter}
              onOpenChange={setFlag("sh")}
              placeholder="All Shapes"
              icon={Shapes}
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
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={resetFilters}
            disabled={!hasFilters}
            className="flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 sm:col-span-3 lg:col-span-1 lg:w-auto"
          >
            <RotateCcw size={15} /> Reset
          </motion.button>
        </div>

        {/* map of the filtered geofences */}
        <div className="px-5 pb-5 sm:px-6">
          <div
            ref={mapWrapRef}
            className="relative isolate h-[380px] overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08] lg:h-[440px]"
          >
            <OverviewMap fences={filtered} focus={focus} />
            {rows.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[1000] flex justify-center">
                <span className="rounded-full bg-slate-900/80 px-4 py-2 text-[12.5px] font-medium text-white shadow-lg backdrop-blur">
                  No geofences yet — use “Add Geofence” to draw one
                </span>
              </div>
            )}
          </div>
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
                  if (label === "CSV")   exportCSV(filtered, columns, "geofences");
                  if (label === "Excel") exportExcel(filtered, columns, "geofences");
                  if (label === "PDF")   exportPDF(filtered, columns, "Geofences", "geofences");
                  if (label === "Print") exportPrint(filtered, columns, "Geofences");
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
              placeholder="Search Geofences"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto px-2 pb-2 sm:px-4">
          <div className="min-w-[1040px]">
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
                  No geofences found
                </p>
                <p className="mt-1 text-[13px] text-slate-400">
                  {hasFilters ? "Try adjusting your filters." : "Add a geofence to get started."}
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
                  <span className="truncate text-[13.5px] font-medium text-slate-700 dark:text-slate-100" title={r.description || r.name}>
                    {r.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13.5px] text-slate-600 dark:text-slate-300">
                    {r.shape === "circle" ? <CircleIcon size={14} className="text-slate-400" /> : <Hexagon size={14} className="text-slate-400" />}
                    {r.shapeLabel}
                  </span>
                  <span className="truncate font-mono text-[12.5px] text-slate-500 dark:text-slate-400">
                    {r.centerLabel}
                  </span>
                  <span className="text-[13.5px] text-slate-500 dark:text-slate-400">
                    {r.sizeLabel}
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
                      onClick={() => locate(r)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors hover:bg-primary-600 hover:text-white dark:bg-primary-500/15 dark:text-primary-400"
                      title="Show on map"
                    >
                      <Crosshair size={15} />
                    </motion.button>
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

      <GeofenceModal
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
        }}
        onSave={save}
        editing={editing}
        existingNames={names}
      />
    </div>
  );
}
