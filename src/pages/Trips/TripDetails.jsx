import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useLocation } from "react-router-dom";
import {
  Search, Calendar, FileDown, MapPin, Flag,
  Route as RouteIcon, User, Phone, List, GitBranch,
  Inbox, FileWarning, AlertTriangle, X, Plus,
  Users, Clock, Activity, Stethoscope, Navigation, Map,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Printer, FileText, FileSpreadsheet,
  ChevronDown, Layers, Radio, Play, Check,Maximize2, Minimize2 
} from "lucide-react";
import TripCreation from "./TripCreation";
import { exportExcel, exportPDF } from "../../utils/exportUtils";

/* ─── API BASE ──────────────────────────────────────────────────────────── */

/* ─── THEME ─────────────────────────────────────────────────────────────── */
const card =
  "relative rounded-2xl border border-slate-200 dark:border-slate-700/70 " +
  "bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-sm shadow-slate-200/60 dark:shadow-black/30";

const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-white/[0.08] " +
  "bg-white dark:bg-white/[0.03] px-4 py-3 text-[14px] font-medium " +
  "text-slate-700 dark:text-slate-100 outline-none transition-colors duration-200 " +
  "placeholder:text-slate-400 placeholder:font-normal " +
  "focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15";

const PER_PAGE = 10;

/* ─── STATUS ─────────────────────────────────────────────────────────────── */
const STATUS_META = {
  scheduled:  { tab:"running", label:"Scheduled",  color:"bg-blue-500",    text:"text-blue-600",    bg:"bg-blue-50 dark:bg-blue-500/15",      border:"border-blue-200 dark:border-blue-400/30"    },
  active:     { tab:"running", label:"Active",      color:"bg-emerald-500", text:"text-emerald-600", bg:"bg-emerald-50 dark:bg-emerald-500/15", border:"border-emerald-200 dark:border-emerald-400/30" },
  ongoing:    { tab:"running", label:"Ongoing",     color:"bg-emerald-500", text:"text-emerald-600", bg:"bg-emerald-50 dark:bg-emerald-500/15", border:"border-emerald-200 dark:border-emerald-400/30" },
  running:    { tab:"running", label:"Running",     color:"bg-emerald-500", text:"text-emerald-600", bg:"bg-emerald-50 dark:bg-emerald-500/15", border:"border-emerald-200 dark:border-emerald-400/30" },
  in_transit: { tab:"running", label:"In Transit",  color:"bg-indigo-500",  text:"text-indigo-600",  bg:"bg-indigo-50 dark:bg-indigo-500/15",  border:"border-indigo-200 dark:border-indigo-400/30"  },
  delayed:    { tab:"running", label:"Delayed",     color:"bg-amber-500",   text:"text-amber-600",   bg:"bg-amber-50 dark:bg-amber-500/15",    border:"border-amber-200 dark:border-amber-400/30"   },
  completed:  { tab:"closed",  label:"Completed",   color:"bg-slate-400",   text:"text-slate-500",   bg:"bg-slate-50 dark:bg-slate-500/15",    border:"border-slate-200 dark:border-slate-400/30"   },
  closed:     { tab:"closed",  label:"Closed",      color:"bg-slate-400",   text:"text-slate-500",   bg:"bg-slate-50 dark:bg-slate-500/15",    border:"border-slate-200 dark:border-slate-400/30"   },
  cancelled:  { tab:"closed",  label:"Cancelled",   color:"bg-rose-400",    text:"text-rose-500",    bg:"bg-rose-50 dark:bg-rose-500/15",      border:"border-rose-200 dark:border-rose-400/30"     },
};
const getStatus = (s) => STATUS_META[s?.toLowerCase()] ?? STATUS_META["active"];

/* Which statuses belong to each tab (sent to the API as the `statuses` param when no explicit status chosen) */
const TAB_STATUSES = {
  running: ["scheduled", "ongoing", "running", "delayed"],
  closed:  ["completed", "cancelled"],
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shortAddr(addr, maxLen = 38) {
  if (!addr || addr === "N/A") return addr;
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  const stripped = parts.filter(
    (p) => !/^(India|Telangana|Andhra Pradesh|Karnataka|\d{6})$/i.test(p)
  );
  const joined = stripped.slice(0, 3).join(", ");
  return joined.length > maxLen ? joined.slice(0, maxLen) + "…" : joined;
}

/* Format a yyyy-mm-dd date input into "yyyy-mm-dd HH:MM:SS" for the API */
function toApiDate(dateStr, endOfDay = false) {
  if (!dateStr) return null;
  return endOfDay ? `${dateStr} 23:59:59` : `${dateStr} 00:00:00`;
}

/* ─── EXPORT HELPERS ─────────────────────────────────────────────────────── */
const EXPORT_HEADERS = [
  "Trip Code","Vehicle","Customer","Patient Phone","Beneficiary","Beneficiary Phone",
  "From","From Time","To","To Time","Distance","Duration","Driver","Case Type","Status",
];

const tripToRow = (t) => [
  t.tripCode || "—", t.vehicleId || "—", t.vehicle, t.customer, t.phone,
  t.beneficiaryName || "—", t.beneficiaryPhone || "—",
  t.from, t.fromTime, t.to, t.toTime, t.distance, t.duration,
  t.driver, t.caseType, t.status,
];

const TRIP_EXPORT_COLS = [
  { key: "tripCode",         label: "Trip Code" },
  { key: "vehicle",          label: "Vehicle" },
  { key: "customer",         label: "Customer" },
  { key: "phone",            label: "Patient Phone" },
  { key: "beneficiaryName",  label: "Beneficiary" },
  { key: "beneficiaryPhone", label: "Beneficiary Phone" },
  { key: "from",             label: "From" },
  { key: "fromTime",         label: "From Time" },
  { key: "to",               label: "To" },
  { key: "toTime",           label: "To Time" },
  { key: "distance",         label: "Distance" },
  { key: "duration",         label: "Duration" },
  { key: "driver",           label: "Driver" },
  { key: "caseType",         label: "Case Type" },
  { key: "status",           label: "Status" },
];

function downloadCSV(trips, filename = "trip-details.csv") {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    EXPORT_HEADERS.join(","),
    ...trips.map((t) => tripToRow(t).map(esc).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function buildExportHTML(trips, { title = "Trip Details Report" } = {}) {
  const rows = trips.map((t) => `
    <tr>
      <td class="id">${t.tripCode || "—"}</td>
      <td>${t.vehicleId || "—"}</td>
      <td>${t.vehicle}</td>
      <td>${t.customer}</td>
      <td>${t.phone}</td>
      <td>${t.beneficiaryName || "—"}</td>
      <td>${t.beneficiaryPhone || "—"}</td>
      <td class="addr">${t.from}<br><span class="time">${t.fromTime}</span></td>
      <td class="addr">${t.to}<br><span class="time">${t.toTime}</span></td>
      <td>${t.distance}</td>
      <td>${t.duration}</td>
      <td>${t.driver}</td>
      <td>${t.caseType}</td>
      <td><span class="status status-${(t.status || "").toLowerCase()}">${getStatus(t.status).label}</span></td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 16px; }
  .header h1 { font-size: 20px; margin: 0; color: #1e293b; }
  .header p { font-size: 11px; color: #64748b; margin: 2px 0 0; }
  .meta { text-align: right; font-size: 11px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
  th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; text-align: left; padding: 8px 6px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
  tr:nth-child(even) td { background: #f8fafc; }
  td.id { font-weight: 700; color: #f43f5e; }
  td.addr { line-height: 1.4; }
  td .time { color: #94a3b8; font-size: 9px; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: #f1f5f9; color: #475569; }
  .status-active, .status-running, .status-ongoing { background: #d1fae5; color: #047857; }
  .status-in_transit { background: #e0e7ff; color: #4338ca; }
  .status-completed, .status-closed { background: #f1f5f9; color: #475569; }
  .status-cancelled { background: #ffe4e6; color: #be123c; }
  .footer { margin-top: 14px; font-size: 9px; color: #94a3b8; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div><h1>${title}</h1><p>Generated report — ${trips.length} trip${trips.length !== 1 ? "s" : ""}</p></div>
    <div class="meta">Generated on ${new Date().toLocaleString()}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:9%">Trip Code</th><th style="width:6%">Veh. ID</th><th style="width:8%">Vehicle</th>
        <th style="width:8%">Patient</th><th style="width:7%">Phone</th>
        <th style="width:7%">Beneficiary</th><th style="width:7%">Ben. Phone</th>
        <th style="width:12%">From</th><th style="width:12%">To</th><th style="width:5%">Distance</th>
        <th style="width:5%">Duration</th><th style="width:7%">Driver</th><th style="width:5%">Case</th><th style="width:5%">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Trip Details Report — Page generated automatically</div>
</body>
</html>`;
}

function printTrips(trips, title) {
  const html = buildExportHTML(trips, { title });
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}

function mapTrip(t) {
  const dist = t.estimated_kilometers;
  const dur  = t.estimated_duration;
  const sLat = t.source_lat, sLng = t.source_lng, dLat = t.destination_lat, dLng = t.destination_lng;
  const hasCoords =
    sLat != null && sLng != null && dLat != null && dLng != null &&
    !(sLat === 0 && sLng === 0) && !(dLat === 0 && dLng === 0);
  const computedKm = hasCoords ? haversineKm(sLat, sLng, dLat, dLng) : null;
  const distLabel = (dist != null && dist > 0)
    ? `${dist} KM`
    : (computedKm ? `~${computedKm.toFixed(1)} KM` : "Calculating…");

  return {
    id: t.id,
    vehicleId: t.vehicle_no || null,
    tripCode: t.trip_code || null,
    vehicle: t.vehicle_no || "N/A",
    customer: t.patient_name || "N/A",
    phone: t.patient_no || "N/A",
    gender: t.gender || null,
    age: t.age != null && t.age !== 0 ? t.age : null,
    beneficiaryName: t.beneficiary_name || null,
    beneficiaryPhone: t.beneficiary_no || null,
    from: t.pickup_address || "N/A",
    fromShort: shortAddr(t.pickup_address),
    fromTime: t.scheduled_datetime ? new Date(t.scheduled_datetime).toLocaleString() : "N/A",
    rawDate: t.scheduled_datetime ? new Date(t.scheduled_datetime) : new Date(0),
    to: t.destination_address || "N/A",
    toShort: shortAddr(t.destination_address),
    toTime: t.estimated_arrival_time ? new Date(t.estimated_arrival_time).toLocaleString() : "N/A",
    distance: distLabel,
    duration: (dur != null && dur > 0) ? `${dur} min` : "Calculating…",
    driver: t.driver_name || "Unassigned",
    caseType: t.case_type || "General",
    tripType: t.trip_type || "N/A",
    status: t.status || "active",
    pickupDistrict: t.pickup_district_name || null,
    destDistrict: t.destination_district_name || null,
    createdAt: t.trip_creation_datetime ? new Date(t.trip_creation_datetime).toLocaleString() : null,
    tripCreationDatetime: t.trip_creation_datetime || null,
    actualEndDatetime: t.actual_end_datetime || null,
    actualStartDatetime: t.actual_start_datetime || null,
    hasCoords,
    sourceLat: hasCoords ? sLat : null,
    sourceLng: hasCoords ? sLng : null,
    destLat: hasCoords ? dLat : null,
    destLng: hasCoords ? dLng : null,
  };
}

/* ─── SEARCHABLE SELECT (status / district) ──────────────────────────────── */
/* options: [{ value, label }]; value is what we store, label is shown */
function FilterSelect({ options = [], value, onChange, placeholder = "Select...", icon: Icon, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = options.filter((o) =>
    !searchable ? true : o.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setQuery("");
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white dark:bg-white/[0.03] px-4 py-3 text-left text-[14px] font-medium outline-none transition-all ${
          open ? "border-primary-400 ring-2 ring-primary-500/15" : "border-slate-200 hover:border-slate-300 dark:border-white/[0.08]"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="shrink-0 text-slate-400" />}
          <span className={selected ? "text-slate-700 dark:text-slate-100" : "text-slate-400"}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
              title="Clear"
            >
              <X size={14} />
            </span>
          )}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
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
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 z-[60] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900"
          >
            {searchable && (
              <div className="border-b border-slate-100 p-2 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-white/[0.05]">
                  <Search size={15} className="shrink-0 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent text-[14px] font-medium text-slate-700 outline-none dark:text-slate-100"
                  />
                </div>
              </div>
            )}
            <div className="max-h-52 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-5 text-center text-[13px] text-slate-400">No results</p>
              ) : (
                filtered.map((o) => {
                  const isSel = String(o.value) === String(value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { onChange(o.value); setOpen(false); }}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                        isSel ? "bg-primary-500/10 text-primary-600 dark:text-primary-300" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="truncate">{o.label}</span>
                      {isSel && <Check size={16} className="shrink-0 text-primary-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── TOOLTIP BUTTON ─────────────────────────────────────────────────────── */
function TooltipButton({ icon: Icon, title, onClick, className, disabled = false }) {
  const btnRef = useRef(null);
  const [tip, setTip] = useState(null);

  const show = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top - 8 });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  return (
    <>
      <motion.button
        ref={btnRef}
        whileHover={!disabled ? { scale: 1.12, y: -1 } : {}}
        whileTap={!disabled ? { scale: 0.9 } : {}}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={disabled ? undefined : onClick}
        aria-label={title}
        disabled={disabled}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
        } ${className}`}
      >
        <Icon size={16} />
      </motion.button>

      {tip && createPortal(
        <AnimatePresence>
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.13 }}
            style={{
              position: "fixed", left: tip.x, top: tip.y,
              transform: "translate(-50%, -100%)", zIndex: 99999, pointerEvents: "none",
            }}
          >
            <div className="whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-xl ring-1 ring-white/10">
              {title}
            </div>
            <div style={{
              position: "absolute", bottom: -4, left: "50%",
              transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: "#0f172a",
            }} />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

/* ─── ADDRESS PILL ───────────────────────────────────────────────────────── */
function AddressPill({ icon: Icon, label, shortText, fullText, time, color = "slate" }) {
  const [expanded, setExpanded] = useState(false);
 const colors = {
  slate: "border-slate-200 bg-slate-50/80 dark:border-slate-700/60 dark:bg-white/[0.02]",
  green: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/40 dark:bg-emerald-500/[0.07]",
  red:   "border-rose-200 bg-rose-50/70 dark:border-rose-400/40 dark:bg-rose-500/[0.07]",
};
  return (
    <div className={`flex-1 min-w-0 rounded-xl border px-3.5 py-3 transition-all ${colors[color]}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        <Icon size={12} className="shrink-0" /> {label}
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left group"
        title={expanded ? "Click to collapse" : "Click to see full address"}
      >
        <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100 leading-snug break-words group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {expanded ? fullText : shortText}
        </p>
      </button>
      {time && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{time}</p>}
    </div>
  );
}

/* ─── CHIP ───────────────────────────────────────────────────────────────── */
function Chip({ icon: Icon, children, color = "default" }) {
  const colors = {
    default: "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300",
    blue:    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300",
    amber:   "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
    green:   "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    violet:  "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-300",
    cyan:    "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300",
  };
  return (
    <span className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${colors[color]}`}>
      <Icon size={13} className="opacity-70 shrink-0" />{children}
    </span>
  );
}

/* ─── EXPORT MENU ────────────────────────────────────────────────────────── */
function ExportMenu({ trips }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const computeCoords = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 8, right: window.innerWidth - r.right, width: r.width });
  }, []);

  const toggleOpen = () => { if (!open) computeCoords(); setOpen((v) => !v); };

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    const onScrollOrResize = () => computeCoords();
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, computeCoords]);

  const items = [
    { key: "csv",   label: "Export as CSV",   sub: "Spreadsheet-ready file",        icon: FileSpreadsheet, action: () => downloadCSV(trips) },
    { key: "excel", label: "Export as Excel", sub: "Excel workbook (.xlsx)",         icon: FileText,        action: () => exportExcel(trips, TRIP_EXPORT_COLS, "trip-details") },
    { key: "pdf",   label: "Export as PDF",   sub: "Formatted PDF document",         icon: FileDown,        action: () => exportPDF(trips, TRIP_EXPORT_COLS, "Trip Details Report", "trip-details") },
    { key: "print", label: "Print",            sub: "Open print dialog",              icon: Printer,         action: () => printTrips(trips, "Trip Details Report") },
  ];

  return (
    <>
      <motion.button
        ref={btnRef}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={toggleOpen}
        className="flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        <FileDown size={16} /> Export
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>

      {open && coords && createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: "fixed", top: coords.top, right: coords.right, zIndex: 99999, width: Math.max(coords.width, 240) }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/[0.1] dark:bg-slate-800"
          >
            {items.map(({ key, label, sub, icon: Icon, action }) => (
              <button key={key} onClick={() => { action(); setOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.06]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Icon size={16} />
                </span>
                <span>
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-100">{label}</p>
                  <p className="text-[11px] text-slate-400">{sub}</p>
                </span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

/* ─── MAP TILE LAYERS ────────────────────────────────────────────────────── */
const MAP_TILES = [
  { key: "street", label: "Street", emoji: "🗺️", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 },
  { key: "google", label: "Google", emoji: "🌐", url: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "© Google", maxZoom: 20 },
  { key: "google-hybrid", label: "Google Hybrid", emoji: "🛰️", url: "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}", subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "© Google", maxZoom: 20 },
  { key: "satellite", label: "Satellite", emoji: "🛰️", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri, Maxar, Earthstar Geographics", maxZoom: 19 },
  { key: "terrain", label: "Terrain", emoji: "⛰️", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>', maxZoom: 17 },
];

/* ─── UNIFIED TRIP MAP MODAL ─────────────────────────────────────────────── */
function TripMapModal({ trip, onClose }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const routeLayersRef = useRef([]);
  const trailLayersRef = useRef([]);
  const modalCardRef = useRef(null);
const [isFullscreen, setIsFullscreen] = useState(false);

  const [isLoading,   setIsLoading]   = useState(true);
  const [mapError,    setMapError]    = useState(null);
  const [routeInfo,   setRouteInfo]   = useState(null);
  const [gpsData,     setGpsData]     = useState(null);
  const [allPoints,   setAllPoints]   = useState([]);
  const [isOnTrip,    setIsOnTrip]    = useState(false);
  const [tripStarted, setTripStarted] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── playback state ──
const [playIndex, setPlayIndex]   = useState(0);      // current point shown (index into sortedAsc)
const [isPlaying, setIsPlaying]   = useState(false);
const [playSpeed, setPlaySpeed]   = useState(1);      // 1x / 2x / 4x
const [isLive, setIsLive]         = useState(true);   // true = marker follows latest; false = scrubbing/replaying
const [pointCount, setPointCount] = useState(0);

const sortedAscRef  = useRef([]);   // GPS points oldest→newest (playback order)
const trailDotsRef  = useRef([]);   // dot markers per ping
const isLiveRef     = useRef(true); // mirror of isLive for use inside interval closure
const playTimerRef  = useRef(null);

  const tripActive = trip.actualEndDatetime === null;
  const tripStart  = trip.tripCreationDatetime ? new Date(trip.tripCreationDatetime) : null;

  const loadLeaflet = () =>
    new Promise((res, rej) => {
      if (window.L) return res(window.L);
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(link);
      }
      if (document.getElementById("leaflet-js")) {
        const t = setInterval(() => { if (window.L) { clearInterval(t); res(window.L); } }, 50);
        return;
      }
      const s = document.createElement("script");
      s.id = "leaflet-js";
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      s.onload = () => res(window.L); s.onerror = rej;
      document.head.appendChild(s);
    });

  // Route line and GPS trail came from the old backend; the Travel
  // API has no equivalent yet, so the map shows pickup/drop only.
  const fetchRouteCoords = async () => null;

const fetchGPS = useCallback(async () => [], []);

useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const init = async () => {
      try {
        const [L, routeData] = await Promise.all([loadLeaflet(), fetchRouteCoords()]);
        if (cancelled || !mapRef.current) return;

        if (routeData) {
          setRouteInfo({ distance: `${routeData.distance} KM`, duration: `${Math.round(routeData.duration * 60)} min` });
        }

        let centerLat = trip.sourceLat ?? 17.385;
        let centerLng = trip.sourceLng ?? 78.4867;
        if (trip.hasCoords) {
          centerLat = (trip.sourceLat + trip.destLat) / 2;
          centerLng = (trip.sourceLng + trip.destLng) / 2;
        }

        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: 12,
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        const baseLayers = {};
      MAP_TILES.forEach((t, i) => {
  const layer = L.tileLayer(t.url, {
    attribution: t.attribution,
    maxZoom: t.maxZoom,
    ...(t.subdomains ? { subdomains: t.subdomains } : {}),
  });
  baseLayers[`${t.emoji} ${t.label}`] = layer;
  if (i === 0) layer.addTo(map);
});
        L.control.layers(baseLayers, null, { position: "topright", collapsed: true }).addTo(map);

        if (routeData?.coords?.length > 1) {
          const shadow = L.polyline(routeData.coords, { color: "#6366f1", weight: 8, opacity: 0.18, lineCap: "round", lineJoin: "round" }).addTo(map);
          const main   = L.polyline(routeData.coords, { color: "#6366f1", weight: 4, opacity: 0.92, lineCap: "round", lineJoin: "round" }).addTo(map);
          routeLayersRef.current = [shadow, main];
          map.fitBounds(main.getBounds(), { padding: [60, 60], maxZoom: 12 });

          if (routeData.coords.length > 5) {
            const waypointIcon = L.divIcon({ className: "", html: `<div style="width:8px;height:8px;border-radius:50%;background:#6366f1;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
            const step = Math.max(1, Math.floor(routeData.coords.length / 12));
            routeData.coords.forEach((pt, i) => {
              if (i === 0 || i === routeData.coords.length - 1) return;
              if (i % step === 0) L.marker(pt, { icon: waypointIcon }).addTo(map);
            });
          }
        } else if (trip.hasCoords) {
          map.fitBounds(L.latLngBounds([[trip.sourceLat, trip.sourceLng], [trip.destLat, trip.destLng]]), { padding: [60, 60], maxZoom: 12 });
        }

        if (trip.hasCoords) {
          const mkIcon = (bg, emoji) => L.divIcon({
            className: "",
            html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${bg};border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.26);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);font-size:14px">${emoji}</div></div>`,
            iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36],
          });
          L.marker([trip.sourceLat, trip.sourceLng], { icon: mkIcon("#10b981", "📍") }).addTo(map)
            .bindPopup(`<div style="font-family:system-ui;min-width:180px;line-height:1.6"><b style="color:#059669;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">📍 Pickup</b><p style="font-size:12px;margin:4px 0 2px;font-weight:600;color:#1e293b">${trip.from}</p><p style="font-size:11px;color:#64748b">${trip.fromTime}</p></div>`);
          L.marker([trip.destLat, trip.destLng], { icon: mkIcon("#ef4444", "🏁") }).addTo(map)
            .bindPopup(`<div style="font-family:system-ui;min-width:180px;line-height:1.6"><b style="color:#dc2626;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">🏁 Destination</b><p style="font-size:12px;margin:4px 0 2px;font-weight:600;color:#1e293b">${trip.to}</p><p style="font-size:11px;color:#64748b">${trip.toTime}</p></div>`);
        }

        // const vehicleIcon = L.divIcon({
        //   className: "",
        //   html: `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:3px solid #fff;box-shadow:0 4px 16px rgba(99,102,241,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;animation:vehiclePulse 2s infinite;">🚑</div>
        //   <style>@keyframes vehiclePulse{0%,100%{box-shadow:0 4px 16px rgba(99,102,241,0.5),0 0 0 0 rgba(99,102,241,0.4)}50%{box-shadow:0 4px 16px rgba(99,102,241,0.5),0 0 0 12px rgba(99,102,241,0)}}</style>`,
        //   iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -24],
        // });

        const vehicleIcon = L.divIcon({
  className: "vehicle-marker",
  html: `
    <div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
      <svg width="44" height="34" viewBox="0 0 44 34" xmlns="http://www.w3.org/2000/svg">
        <!-- roof beacon -->
        <rect x="12" y="3" width="7" height="3.5" rx="1.2" fill="#2563eb"/>
        <!-- body (white) -->
        <rect x="2" y="6.5" width="26" height="15" rx="2.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
        <!-- cab (white) -->
        <path d="M28 10 h5.5 l6.5 6.5 v5 h-12 z" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
        <!-- windshield -->
        <path d="M29.5 11.5 h3.6 l4.6 4.6 h-8.2 z" fill="#93c5fd"/>
        <!-- green side stripe -->
        <rect x="2" y="16.5" width="26" height="3" fill="#16a34a"/>
        <!-- red cross -->
        <rect x="8.4" y="9" width="2.6" height="6.4" rx="0.5" fill="#dc2626"/>
        <rect x="6.5" y="10.9" width="6.4" height="2.6" rx="0.5" fill="#dc2626"/>
        <!-- wheels -->
        <circle cx="10.5" cy="23.5" r="4" fill="#1e293b"/>
        <circle cx="10.5" cy="23.5" r="1.6" fill="#94a3b8"/>
        <circle cx="31.5" cy="23.5" r="4" fill="#1e293b"/>
        <circle cx="31.5" cy="23.5" r="1.6" fill="#94a3b8"/>
      </svg>
    </div>`,
  iconSize: [44, 34],
  iconAnchor: [22, 17],
  popupAnchor: [0, -18],
});

   // helper to (re)bind the vehicle popup for a given point
const bindVehiclePopup = (point, onTrip) => {
  if (!vehicleMarkerRef.current) return;
  vehicleMarkerRef.current.bindPopup(`
    <div style="font-family:system-ui;min-width:200px;line-height:1.7">
      <b style="color:#6366f1;font-size:13px">🚑 ${trip.vehicle}</b>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0"/>
      <div style="font-size:11.5px;color:#334155">
        <div><b>Speed:</b> ${point.speed ?? "—"} km/h</div>
        <div><b>Direction:</b> ${point.direction ?? "—"}°</div>
        <div><b>Ignition:</b> <span style="color:${point.ignition === 'ON' ? '#059669' : '#dc2626'}">${point.ignition ?? "—"}</span></div>
        <div><b>Time:</b> ${new Date(point.created_at).toLocaleString()}</div>
        <div><b>Status:</b> <span style="color:${onTrip ? '#059669' : '#64748b'}">${onTrip ? '🟢 On Trip' : '⚪ Trip Ended'}</span></div>
      </div>
    </div>`);
};

const doGpsFetch = async () => {
  if (cancelled) return;
  const entries = await fetchGPS();
  if (cancelled) return;
  setLastRefresh(new Date());

  if (!entries.length) {
    if (trip.hasCoords && !vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([trip.sourceLat, trip.sourceLng], { icon: vehicleIcon })
        .addTo(map)
        .bindPopup(`<div style="font-family:system-ui;min-width:180px"><b style="color:#6366f1">🚑 ${trip.vehicle}</b><p style="font-size:11px;color:#64748b;margin:4px 0 0">No GPS signal yet — showing pickup location</p></div>`);
    }
    return;
  }

  // Ascending order = playback order (oldest → newest)
  const asc = [...entries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  sortedAscRef.current = asc;
  setAllPoints(asc);
  setPointCount(asc.length);

  const onTrip = trip.actualEndDatetime === null;
  setIsOnTrip(onTrip);
  setTripStarted(tripStart ? tripStart.toLocaleString() : null);

  // ── Redraw trail: solid line + a dot at each ping ──
  trailLayersRef.current.forEach((l) => map.removeLayer(l));
  trailDotsRef.current.forEach((l) => map.removeLayer(l));
  trailLayersRef.current = [];
  trailDotsRef.current = [];

if (asc.length > 1) {
  const trailCoords = asc.map((e) => [e.lat, e.lng]);
  const tShadow = L.polyline(trailCoords, { color: "#1e3a8a", weight: 10, opacity: 0.18, lineCap: "round", lineJoin: "round" }).addTo(map);
  const tMain   = L.polyline(trailCoords, { color: "#1d4ed8", weight: 6,  opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(map);
  trailLayersRef.current = [tShadow, tMain];

// AFTER — dot only at start point and live (latest) point
const startDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#10b981;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
  iconSize: [10, 10], iconAnchor: [5, 5],
});
const liveDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#6366f1;border:2px solid #fff;box-shadow:0 1px 4px rgba(99,102,241,0.5)"></div>`,
  iconSize: [10, 10], iconAnchor: [5, 5],
});

// Start point dot (first GPS ping)
trailDotsRef.current.push(
  L.marker([asc[0].lat, asc[0].lng], { icon: startDotIcon, interactive: false }).addTo(map)
);

// Live point dot (latest GPS ping) — only add if there's more than one point
if (asc.length > 1) {
  const latest = asc[asc.length - 1];
  trailDotsRef.current.push(
    L.marker([latest.lat, latest.lng], { icon: liveDotIcon, interactive: false }).addTo(map)
  );
}
}

  // ── Marker placement ──
  // If LIVE, jump marker to newest point and pin the scrubber to the end.
  // If the user is scrubbing/replaying, DON'T move the marker — just let the
  // timeline grow (live-on-the-side behaviour).
  if (isLiveRef.current) {
    const latest = asc[asc.length - 1];
    setGpsData(latest);
    setPlayIndex(asc.length - 1);
    if (vehicleMarkerRef.current) vehicleMarkerRef.current.setLatLng([latest.lat, latest.lng]);
    else vehicleMarkerRef.current = L.marker([latest.lat, latest.lng], { icon: vehicleIcon }).addTo(map);
    bindVehiclePopup(latest, onTrip);
  } else if (!vehicleMarkerRef.current) {
    // first load but user somehow not live — still create a marker
    const p = asc[Math.min(playIndex, asc.length - 1)];
    vehicleMarkerRef.current = L.marker([p.lat, p.lng], { icon: vehicleIcon }).addTo(map);
    bindVehiclePopup(p, onTrip);
  }
};
await doGpsFetch();
setIsLoading(false);
setTimeout(() => { if (!cancelled) mapInstanceRef.current?.invalidateSize(); }, 250);
if (tripActive) intervalId = setInterval(doGpsFetch, 10000);
      } catch {
        if (!cancelled) { setIsLoading(false); setMapError("Failed to load map. Check your internet connection."); }
      }
    };

    init();
   return () => {
  cancelled = true;
  if (intervalId) clearInterval(intervalId);
  if (playTimerRef.current) clearInterval(playTimerRef.current);
  trailDotsRef.current = [];
  if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);
  // Move the marker whenever the playback index changes (scrub or auto-play)
useEffect(() => {
  if (isLiveRef.current) return;            // live fetch handles the marker; don't fight it
  const asc = sortedAscRef.current;
  if (!asc.length || !vehicleMarkerRef.current) return;
  const pt = asc[Math.min(playIndex, asc.length - 1)];
  if (pt) {
    vehicleMarkerRef.current.setLatLng([pt.lat, pt.lng]);
    setGpsData(pt);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [playIndex]);

// Auto-advance timer while playing
useEffect(() => {
  if (!isPlaying) {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    return;
  }
  const stepMs = 600 / playSpeed; // base 600ms per ping
  playTimerRef.current = setInterval(() => {
    setPlayIndex((i) => {
      const max = sortedAscRef.current.length - 1;
      if (i >= max) {
        setIsPlaying(false);
        setIsLive(true);            // reached the end → snap back to live
        return max;
      }
      return i + 1;
    });
  }, stepMs);
  return () => clearInterval(playTimerRef.current);
}, [isPlaying, playSpeed]);
useEffect(() => {
  const onFsChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 120);
  };
  document.addEventListener("fullscreenchange", onFsChange);
  return () => document.removeEventListener("fullscreenchange", onFsChange);
}, []);

const handlePlayPause = () => {
  const max = sortedAscRef.current.length - 1;
  if (!isPlaying) {
    setIsLive(false);                        // detach from live while replaying
    if (playIndex >= max) setPlayIndex(0);   // restart if sitting at the end
  }
  setIsPlaying((p) => !p);
};

const handleScrub = (idx) => {
  setIsPlaying(false);
  const max = sortedAscRef.current.length - 1;
  setIsLive(idx >= max);                      // dragging to the very end re-attaches live
  setPlayIndex(idx);
};

const goLive = () => {
  const max = sortedAscRef.current.length - 1;
  setIsPlaying(false);
  setIsLive(true);
  setPlayIndex(max < 0 ? 0 : max);
};

const cycleSpeed = () => setPlaySpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));

const toggleFullscreen = () => {
  const el = modalCardRef.current;
  if (!el) return;
  if (!document.fullscreenElement) {
    el.requestFullscreen?.().then(() => {
      setIsFullscreen(true);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 120);
    }).catch(() => {});
  } else {
    document.exitFullscreen?.().then(() => {
      setIsFullscreen(false);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 120);
    }).catch(() => {});
  }
};

  const displayDistance = routeInfo?.distance ?? trip.distance;
  const displayDuration = routeInfo?.duration ?? trip.duration;

  return (
    <AnimatePresence>
      <style>{`
        .leaflet-control-layers-toggle { width: 30px !important; height: 30px !important; background-size: 16px 16px !important; border-radius: 8px !important; }
        .leaflet-control-layers { border: none !important; border-radius: 10px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important; overflow: hidden; }
        .leaflet-control-layers-expanded { padding: 8px 10px !important; background: #ffffff !important; color: #334155 !important; font-family: system-ui, -apple-system, sans-serif !important; font-size: 13px !important; font-weight: 600 !important; min-width: 130px; }
        .leaflet-control-layers-base label { display: flex !important; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 7px; cursor: pointer; transition: background 0.15s; margin: 0; }
        .leaflet-control-layers-base label:hover { background: #f1f5f9 !important; }
        .leaflet-control-layers-selector { margin-right: 2px; accent-color: #6366f1; }
        .leaflet-control-layers-separator { display: none; }
        .dark .leaflet-control-layers-expanded { background: #1e293b !important; color: #e2e8f0 !important; }
        .dark .leaflet-control-layers-base label:hover { background: rgba(255,255,255,0.06) !important; }
        .dark .leaflet-control-layers-toggle { background-color: #1e293b !important; }
      `}</style>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <motion.div
  ref={modalCardRef}
  initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }}
  transition={{ type: "spring", stiffness: 300, damping: 26 }}
  className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/60 dark:border-white/[0.08] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
  style={isFullscreen ? { height: "100vh", maxHeight: "100vh", maxWidth: "100vw" } : { height: "90vh", maxHeight: 780 }}
>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] px-5 py-3 shrink-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600"><Map size={17} /></div>
              <div>
                <h2 className="text-[14px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {trip.tripCode ?? `Trip #${trip.id}`} — Route &amp; Live Tracking
                  {isOnTrip && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-400/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> LIVE
                    </span>
                  )}
                </h2>
                <p className="text-[11.5px] text-slate-400">{trip.vehicle} · {trip.customer}</p>
              </div>
            </div>
        <div className="flex items-center gap-1.5">
  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={toggleFullscreen}
    title={isFullscreen ? "Exit full screen" : "Full screen"}
    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400 transition-colors">
    {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
  </motion.button>
  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:bg-rose-100 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
    <X size={16} />
  </motion.button>
</div>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-slate-100 dark:border-white/[0.05] shrink-0 bg-slate-50/60 dark:bg-white/[0.01]">
            {tripStarted && (
              <div className="flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-400/30 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-violet-700 dark:text-violet-300">
                <Clock size={12} /> Trip started: {tripStarted}
              </div>
            )}
            <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold ${
              isOnTrip ? "border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.03] text-slate-500"
            }`}>
              <span className={`h-2 w-2 rounded-full inline-block ${isOnTrip ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {isOnTrip ? "Vehicle on trip" : "Trip ended"}
            </div>
            {routeInfo && (
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="h-3 w-3 rounded-sm bg-indigo-500 inline-block opacity-80" /> Route: {routeInfo.distance} · ~{routeInfo.duration}
              </span>
            )}
            {lastRefresh && (
              <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
                {tripActive && <span className="ml-1 text-emerald-500">(auto-refreshes every 10s)</span>}
              </span>
            )}
          </div>

          {gpsData && !isLoading && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-slate-100 dark:border-white/[0.05] bg-indigo-50/60 dark:bg-indigo-500/[0.06] shrink-0">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Speed:</span><span className="text-indigo-700 dark:text-indigo-300 font-bold">{gpsData.speed ?? "—"} km/h</span></div>
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Direction:</span><span className="font-bold">{gpsData.direction ?? "—"}°</span></div>
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Ignition:</span><span className={`font-bold ${gpsData.ignition === "ON" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>{gpsData.ignition ?? "—"}</span></div>
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Coords:</span><span className="font-mono font-bold text-[11px]">{gpsData.lat?.toFixed(5)}, {gpsData.lng?.toFixed(5)}</span></div>
            </div>
          )}

          <div className="relative flex-1 min-h-0">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                <p className="text-[13px] font-semibold text-slate-500">Loading route &amp; live tracking…</p>
              </div>
            )}
            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10">
                <div className="flex flex-col items-center gap-2"><AlertTriangle size={24} className="text-rose-400" /><p className="text-rose-500 font-semibold">{mapError}</p></div>
              </div>
            )}
            <div ref={mapRef} className="h-full w-full" />

            {!isLoading && pointCount > 0 && (
  <div className="absolute bottom-4 left-1/2 z-[500] w-[92%] max-w-3xl -translate-x-1/2">
    <div className="flex items-center gap-3 rounded-2xl bg-slate-900/85 px-4 py-2.5 backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
      <button onClick={handlePlayPause}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
        {isPlaying
          ? <span className="flex gap-[3px]"><span className="h-3.5 w-[3px] rounded-sm bg-white" /><span className="h-3.5 w-[3px] rounded-sm bg-white" /></span>
          : <Play size={18} className="ml-0.5" fill="currentColor" />}
      </button>

      <input
        type="range" min={0} max={Math.max(0, pointCount - 1)} value={playIndex}
        onChange={(e) => handleScrub(Number(e.target.value))}
        className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400
                   [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
        style={{ background: `linear-gradient(to right, #818cf8 ${(playIndex / Math.max(1, pointCount - 1)) * 100}%, rgba(255,255,255,0.2) ${(playIndex / Math.max(1, pointCount - 1)) * 100}%)` }}
      />

      <button onClick={cycleSpeed}
        className="shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-bold text-white hover:bg-white/10 transition-colors">
        {playSpeed}x
      </button>

      <span className="h-5 w-px bg-white/15" />

      <span className="shrink-0 font-mono text-[12px] font-semibold text-white/90 tabular-nums">
        {sortedAscRef.current[playIndex]?.created_at
          ? new Date(sortedAscRef.current[playIndex].created_at).toLocaleTimeString()
          : "--:--:--"}
      </span>

      <button onClick={goLive}
        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
          isLive ? "bg-emerald-500/20 text-emerald-300" : "text-white/50 hover:bg-white/10"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
        LIVE
      </button>
    </div>
  </div>
)}
          </div>

          <div className="flex items-center justify-center flex-wrap gap-5 py-2 border-t border-slate-200 dark:border-white/[0.06] bg-white/90 dark:bg-slate-900/90 shrink-0 px-4">
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-violet-600"><span className="text-base">🚑</span> Vehicle (ID: {trip.vehicleId})</span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Pickup</span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-rose-600"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" /> Destination</span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600"><span className="h-3 w-5 rounded bg-indigo-500 inline-block opacity-80" /> Planned route</span>
{allPoints.length > 0 && (
  <>
    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600">
      <span className="h-1 w-5 rounded bg-indigo-500 inline-block" /> GPS trail ({allPoints.length})
    </span>
    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Trail start
    </span>
    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600">
      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" /> Live position
    </span>
  </>
)}
            <span className="text-[11.5px] text-slate-400">{displayDistance} · {displayDuration}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ─── TRIP CARD ──────────────────────────────────────────────────────────── */
function TripCard({ trip, onStart }) {
  const [panel, setPanel]     = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const toggle = (p) => setPanel((c) => (c === p ? null : p));
  const statusMeta = getStatus(trip.status);
  const hasBeneficiary = trip.beneficiaryName || trip.beneficiaryPhone;
  const hasValidGender = trip.gender && trip.gender.toLowerCase() !== "string" && trip.gender.trim() !== "";
  const hasValidAge    = trip.age != null && String(trip.age) !== "0";
  const isValidPatient = trip.customer && trip.customer.toLowerCase() !== "string";
  const isValidPhone   = trip.phone && trip.phone.toLowerCase() !== "string";
  const isValidFrom    = trip.from && trip.from.toLowerCase() !== "string" && trip.from !== "N/A";
  const isValidTo      = trip.to && trip.to.toLowerCase() !== "string" && trip.to !== "N/A";

  const alreadyStarted = !!trip.actualStartDatetime ||
    ["active", "running", "ongoing", "in_transit"].includes((trip.status || "").toLowerCase());

  return (
    <>
      <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className={`trip-card overflow-visible ${card}`}>
        <div className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${statusMeta.color}`} />
        <div className="p-4 sm:p-5 pl-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {trip.tripCode ? (
                <span className="font-display text-[13px] font-extrabold text-rose-500 leading-none bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 px-2.5 py-1 rounded-lg tracking-wide">{trip.tripCode}</span>
              ) : null}
              {trip.status?.toLowerCase() !== "scheduled" && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.color}`} />{statusMeta.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-300"><Stethoscope size={10} />{trip.caseType}</span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"><Activity size={10} />{trip.tripType}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <TooltipButton icon={List} title="Documents" onClick={() => toggle("docs")}
                className={panel === "docs" ? "border-primary-400 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-primary-500/10 dark:hover:text-primary-300"} />
              <TooltipButton icon={GitBranch} title="Route Details" onClick={() => toggle("route")}
                className={panel === "route" ? "border-primary-400 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-primary-500/10 dark:hover:text-primary-300"} />
              {hasBeneficiary && (
                <TooltipButton icon={Users} title="Beneficiary Info" onClick={() => toggle("beneficiary")}
                  className={panel === "beneficiary" ? "border-primary-400 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-primary-500/10 dark:hover:text-primary-300"} />
              )}
              <TooltipButton icon={Map} title="Route & Live Tracking" onClick={() => setMapOpen(true)}
                className="border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-400 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20" />
              <TooltipButton icon={Play} title={alreadyStarted ? "Trip already started" : "Start Trip"} disabled={alreadyStarted} onClick={() => onStart(trip)}
                className={alreadyStarted ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-500" : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"} />
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-[16px] font-bold text-primary-600 dark:text-primary-400 leading-tight">{trip.vehicle}</h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                Patient: <span className="text-slate-900 dark:text-white uppercase">{isValidPatient ? trip.customer : <span className="text-slate-400 font-normal italic">Not specified</span>}</span>
              </span>
              {hasValidGender && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300">{trip.gender}</span>}
              {hasValidAge && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-300">Age {trip.age}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mb-3">
            <AddressPill icon={MapPin} label={`From${trip.pickupDistrict ? ` · ${trip.pickupDistrict}` : ""}`} shortText={isValidFrom ? trip.fromShort : "—"} fullText={isValidFrom ? trip.from : "Not specified"} time={trip.fromTime} color="green" />
            <AddressPill icon={Flag} label={`To${trip.destDistrict ? ` · ${trip.destDistrict}` : ""}`} shortText={isValidTo ? trip.toShort : "—"} fullText={isValidTo ? trip.to : "Not specified"} time={trip.toTime} color="red" />
<div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-slate-700/60 dark:bg-white/[0.02]">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1"><RouteIcon size={12} /> Distance</div>
              <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{trip.distance}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{trip.duration !== "Calculating…" ? `~${trip.duration}` : "Duration: Calculating…"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip icon={User} color={trip.driver === "Unassigned" ? "default" : "violet"}>Driver:{" "}{trip.driver === "Unassigned" ? <span className="text-rose-400 ml-1">Unassigned</span> : <span className="ml-1">{trip.driver}</span>}</Chip>
            {isValidPhone && <Chip icon={Phone} color="blue">{trip.phone}</Chip>}
            {trip.createdAt && <Chip icon={Clock} color="amber">Created: {trip.createdAt}</Chip>}
          </div>

          <AnimatePresence initial={false}>
            {panel === "route" && (
              <motion.div key="route" initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
                <div className="rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-3 dark:border-primary-400/30 dark:bg-primary-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><GitBranch size={14} className="text-primary-500" /><span className="text-[11.5px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">Route Details</span></div>
                    <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} onClick={() => setMapOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-400 transition-colors"><Map size={12} /> Open Map</motion.button>
                  </div>
                  {!trip.hasCoords && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-400/25 dark:bg-amber-500/[0.07] px-3 py-2"><AlertTriangle size={13} className="text-amber-500 shrink-0" /><p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">No coordinates available — planned route cannot be shown, but live GPS may still appear.</p></div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-1 gap-1 shrink-0"><span className="h-2.5 w-2.5 rounded-full border-2 border-primary-500 bg-white" /><span className="w-0.5 h-7 bg-gradient-to-b from-primary-400 to-emerald-400" /><span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-500 bg-white" /></div>
                    <div className="flex-1 min-w-0 text-[12.5px]">
                      <p className="font-semibold text-slate-700 dark:text-slate-100 break-words">{isValidFrom ? trip.from : "Pickup address not specified"}</p>
                      <p className="text-slate-400 my-1 flex items-center gap-1.5"><Navigation size={11} />{trip.distance} · {trip.duration}</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100 break-words">{isValidTo ? trip.to : "Destination not specified"}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {panel === "docs" && (
              <motion.div key="docs" initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-400/30 dark:bg-amber-500/10"><FileWarning size={16} className="mt-0.5 shrink-0 text-amber-500" /><p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">Destination documents ready for <span className="font-bold">{trip.toShort}</span>. Main trip documents are not attached.</p></div>
              </motion.div>
            )}
            {panel === "beneficiary" && hasBeneficiary && (
              <motion.div key="beneficiary" initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 dark:border-indigo-400/30 dark:bg-indigo-500/10">
                  <div className="flex items-center gap-2 mb-2"><Users size={14} className="text-indigo-500" /><span className="text-[11.5px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Beneficiary</span></div>
                  <div className="flex flex-wrap gap-4">
                    {trip.beneficiaryName && (<div><p className="text-[10.5px] font-bold uppercase text-slate-400">Name</p><p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{trip.beneficiaryName}</p></div>)}
                    {trip.beneficiaryPhone && (<div><p className="text-[10.5px] font-bold uppercase text-slate-400">Phone</p><a href={`tel:${trip.beneficiaryPhone}`} className="text-[13.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">{trip.beneficiaryPhone}</a></div>)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      {mapOpen && <TripMapModal trip={trip} onClose={() => setMapOpen(false)} />}
    </>
  );
}

/* ─── TRIP START DIALOG ──────────────────────────────────────────────────── */
function StartTripDialog({ trip, busy, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {trip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={busy ? undefined : onCancel} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 dark:border-white/[0.08] bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15"><Play size={22} /></span><h2 className="font-display text-[18px] font-bold text-slate-900 dark:text-white">Start Trip</h2></div>
              <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={busy ? undefined : onCancel} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition-colors"><X size={19} /></motion.button>
            </div>
            <p className="px-6 py-4 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">Start trip <span className="font-bold text-slate-900 dark:text-white">{trip.tripCode || trip.vehicle}</span> now? This will mark the vehicle as on-trip and begin live tracking.</p>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] px-6 py-4">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCancel} disabled={busy} className="cursor-pointer rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-5 py-2.5 text-[14px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.07] transition-colors disabled:opacity-50">Cancel</motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onConfirm(trip)} disabled={busy} className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60">
                {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Play size={16} />}{busy ? "Starting…" : "Start Trip"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─── PAGINATION ─────────────────────────────────────────────────────────── */
function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  const pages = [];
  const delta = 2;
  const left  = Math.max(1, current - delta);
  const right = Math.min(total, current + delta);
  if (left > 1)      { pages.push(1); if (left > 2) pages.push("…l"); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total) { if (right < total - 1) pages.push("…r"); pages.push(total); }

  const btn = (content, key, action, disabled = false, active = false) => (
    <motion.button key={key} whileHover={!disabled && !active ? { scale: 1.08, y: -1 } : {}} whileTap={!disabled ? { scale: 0.94 } : {}}
      onClick={() => !disabled && action()} disabled={disabled}
      className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg text-[13px] font-semibold transition-colors px-1 ${
        active ? "bg-primary-600 text-white shadow-sm shadow-primary-500/20" : disabled ? "text-slate-300 dark:text-slate-600 cursor-not-allowed" : "border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400"
      }`}>{content}</motion.button>
  );

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
      <p className="text-[12.5px] text-slate-400 font-medium">Page {current} of {total}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {btn(<ChevronsLeft size={14} />,  "first", () => onChange(1),           current === 1)}
        {btn(<ChevronLeft  size={14} />,  "prev",  () => onChange(current - 1), current === 1)}
        {pages.map((p, i) => typeof p === "string" ? <span key={p + i} className="text-slate-400 px-0.5 text-[13px] select-none">…</span> : btn(p, p, () => onChange(p), false, p === current))}
        {btn(<ChevronRight  size={14} />, "next",  () => onChange(current + 1), current === total)}
        {btn(<ChevronsRight size={14} />, "last",  () => onChange(total),       current === total)}
      </div>
    </div>
  );
}

/* ─── PAGE ───────────────────────────────────────────────────────────────── */
export default function TripDetails() {
  const rootRef = useRef(null);
  const location = useLocation();
  // Armed only AFTER the first mount pass (see the trailing effect near the
  // other effects). The reactive page/tab/creation-modal effects check this so
  // they don't each fire a duplicate /trips/filter on the initial render — the
  // dedicated mount effect already does the first fetch.
  const didInit = useRef(false);

const skipNextTab = useRef(false);  
  const [tab, setTab] = useState("running");
const pendingDistrictName = useRef(null);
  // filter inputs (uncommitted)
  const [query, setQuery]       = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [statusFilter, setStatusFilter]     = useState("");   // single status value
  const [districtFilter, setDistrictFilter] = useState("");   // single district id

  // dropdown options
  const [statusOptions, setStatusOptions]     = useState([]); // [{value,label}]
  const [districtOptions, setDistrictOptions] = useState([]); // [{value,label}]

  // data
  const [tripsData, setTripsData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);

  const [toStart, setToStart]   = useState(null);
  const [starting, setStarting] = useState(false);
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // counts per tab (lightweight: total of current result only; see note)
  const [runningCount, setRunningCount] = useState(0);
  const [closedCount, setClosedCount]   = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));

  const suppressAuto = useRef(false);   // ← add near your other refs (with didInit, skipNextTab)

  // Status / district filter options came from the old backend — none for now.

/* ── trips ──
   The old backend's trip endpoints are gone. The Travel API has GET
   /TripList/ for this list — until it's wired in, no request is made and
   the list stays empty. */
const fetchTrips = useCallback(async () => {
  setLoading(false);
  setError(null);
  setTripsData([]);
  setTotalItems(0);
}, []);

  const loadCounts = useCallback(async () => {
    setRunningCount(0);
    setClosedCount(0);
  }, []);
  // Load counts on mount and whenever the creation modal CLOSES (a trip may
  // have been added). Skip the run triggered by the modal opening.
  useEffect(() => {
    if (isCreationOpen) return;
    loadCounts();
  }, [loadCounts, isCreationOpen]);

useEffect(() => {
  const incoming = location.state?.status_filter;
  const scope    = location.state?.trip_scope;
  const incomingDistrict = location.state?.district_name;

  if (incomingDistrict) pendingDistrictName.current = incomingDistrict;

  if (incoming || scope || incomingDistrict) {
    const val = incoming ? String(incoming).toLowerCase() : "";
    const todayStr = new Date().toLocaleDateString("en-CA");
    const isToday  = scope === "today";
    const fromVal  = isToday ? todayStr : "";
    const toVal    = isToday ? todayStr : "";
    const tabForStatus = (STATUS_META[val]?.tab) || "running";

    suppressAuto.current = true;

    setStatusFilter(val);
    setFrom(fromVal);
    setTo(toVal);
    setTab(tabForStatus);
    setPage(1);

    // If a district is pending, don't fire the no-district fetch here —
    // let the resolver effect do the fetch once options load.
    if (!incomingDistrict) {
      fetchTrips({ pageArg: 1, tabArg: tabForStatus, statusArg: val, fromArg: fromVal, toArg: toVal });
    }

    window.history.replaceState({}, document.title);
    setTimeout(() => { suppressAuto.current = false; }, 0);
  } else {
    fetchTrips({ pageArg: 1, tabArg: "running" });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  if (!pendingDistrictName.current || districtOptions.length === 0) return;

  const want = pendingDistrictName.current.trim().toLowerCase();
  const norm = (s) => String(s).trim().toLowerCase();

  // exact match first, then loose contains either direction
  let match =
    districtOptions.find((o) => norm(o.label) === want) ||
    districtOptions.find((o) => norm(o.label).includes(want) || want.includes(norm(o.label)));

  if (match) {
    suppressAuto.current = true;
    setDistrictFilter(match.value);
    setPage(1);
    fetchTrips({ pageArg: 1, districtArg: match.value });
    setTimeout(() => { suppressAuto.current = false; }, 0);
  } else {
    // no match — at least show something
    fetchTrips({ pageArg: 1 });
    console.warn("District name from dashboard didn't match any option:", pendingDistrictName.current);
  }
  pendingDistrictName.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [districtOptions]);
// Page changes
useEffect(() => {
  if (!didInit.current || suppressAuto.current) return;
  fetchTrips({ pageArg: page });
  // eslint-disable-next-line
}, [page]);

// Tab changes
useEffect(() => {
  if (!didInit.current || suppressAuto.current) return;
  if (skipNextTab.current) { skipNextTab.current = false; return; }
  setStatusFilter("");
  setPage(1);
  fetchTrips({ pageArg: 1, tabArg: tab, statusArg: "" });
  // eslint-disable-next-line
}, [tab]);

// After closing creation modal
useEffect(() => {
  if (!didInit.current || suppressAuto.current) return;
  if (!isCreationOpen) fetchTrips({ pageArg: 1, tabArg: tab });
  // eslint-disable-next-line
}, [isCreationOpen]);

// Arm the reactive re-fetch effects above only AFTER this first mount pass.
// The mount effect already does the initial /trips/filter; without this gate
// the page/tab/creation-modal effects each fired their own duplicate on load.
// The cleanup re-disarms so React 18 StrictMode's dev remount stays single-shot.
useEffect(() => {
  didInit.current = true;
  return () => { didInit.current = false; };
}, []);

  /* ── scroll to top on mount ── */
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  /* ── entrance animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".td-head", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".td-bar",  { y: 22, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".trip-card", { y: 22, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.07 });
    }, rootRef);
    return () => ctx.revert();
  }, [tab, loading, page]);

  /* ── actions ── */
  const applyFilters = () => {
    setPage(1);
    fetchTrips({ pageArg: 1 });
  };
  const resetFilters = () => {
    setQuery(""); setFrom(""); setTo(""); setStatusFilter(""); setDistrictFilter("");
    setPage(1);
    fetchTrips({ pageArg: 1, statusArg: "", districtArg: "", fromArg: "", toArg: "", searchArg: "" });
  };

  // Starting a trip used the old backend; the Travel API has no
  // "start trip" endpoint yet.
  const confirmStart = async () => {
    setToStart(null);
    alert("Starting a trip isn't available yet.");
  };

  const tabs = [
    { key: "running", label: "Running Trips"},
    { key: "closed",  label: "Closed Trips" },
  ];

  const hasActiveFilters = statusFilter || districtFilter || from || to || query;

  return (
    <div ref={rootRef} className="relative mx-auto max-w-[1500px] 2xl:max-w-none px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-primary-500/10 blur-[120px]" />

      {/* Header */}
      <div className="td-head relative mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400">Trips</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Trip Details</h1>
          <p className="mt-2 text-[14px] text-slate-500 dark:text-slate-400">Inspect trips — route, timing, beneficiary, and assigned resources.</p>
        </div>
        <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} onClick={() => setIsCreationOpen(true)}
          className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-[14px] font-semibold text-white shadow-md shadow-primary-500/15 transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600">
          <Plus size={18} /> Create Trip
        </motion.button>
      </div>

      {/* Filter bar */}
      <div className={`td-bar mb-5 ${card} relative z-20`}>
        {/* Row 1 — Status + District + From + To */}
        <div className="grid grid-cols-1 items-end gap-4 p-4 sm:p-5 pb-0 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Status</label>
            <FilterSelect
              options={statusOptions}
              value={statusFilter}
              placeholder="All Statuses"
              icon={Activity}
              searchable={false}
              onChange={(val) => {
                const targetTab = val
                  ? (STATUS_META[val?.toLowerCase()]?.tab ?? "running")
                  : tab;
                const tabChanging = val && targetTab !== tab;
                if (tabChanging) skipNextTab.current = true;
                setStatusFilter(val);
                if (tabChanging) setTab(targetTab);
                setPage(1);
                fetchTrips({ pageArg: 1, tabArg: targetTab, statusArg: val });
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">District</label>
            <FilterSelect options={districtOptions} value={districtFilter} onChange={setDistrictFilter} placeholder="All Districts" icon={MapPin} searchable />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">From Date</label>
            <div className="relative">
              <Calendar size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10 text-slate-400" />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} pl-10`} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">To Date</label>
            <div className="relative">
              <Calendar size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10 text-slate-400" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} pl-10`} />
            </div>
          </div>
        </div>
      

        {/* Row 2 — Search (wide) + Submit + Reset */}
        <div className="grid grid-cols-1 items-end gap-4 p-4 sm:p-5 pt-4 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Search Trip Code / Vehicle / Patient / Driver</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="E.G: Trip Code, TS01AB90033, patient name…" className={`${inputCls} pl-10`} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} onClick={applyFilters}
              className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-[14px] font-semibold text-white shadow-md shadow-primary-500/15 transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600">
              <Search size={16} /> Submit
            </motion.button>
            {hasActiveFilters && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={resetFilters}
                className="flex h-[46px] items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.07] transition-colors">
                <X size={16} />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs row — Export aligned right */}
      <div className={`td-bar mb-5 ${card}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative cursor-pointer rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-colors ${tab === t.key ? "text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>
                {tab === t.key && (<motion.span layoutId="td-tab" className="absolute inset-0 rounded-xl bg-slate-800 dark:bg-primary-600" transition={{ type: "spring", stiffness: 360, damping: 30 }} />)}
                <span className="relative z-10">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="pr-1"><ExportMenu trips={tripsData} /></div>
        </div>
      </div>

      {/* Trip list */}
      <AnimatePresence mode="wait">
        <motion.div key={tab + page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
          {loading ? (
            <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${card}`}>
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
              <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">Loading trips…</p>
            </div>
          ) : error ? (
            <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${card}`}>
              <AlertTriangle size={28} className="mb-3 text-rose-400" />
              <p className="text-[15px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          ) : tripsData.length === 0 ? (
            <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${card}`}>
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]"><Inbox size={26} /></div>
              <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">No {tab} trips found.</p>
              <p className="mt-1 text-[13px] text-slate-400">{hasActiveFilters ? "Try adjusting your filters." : "No trips to display."}</p>
            </div>
          ) : (
            <>
              {tripsData.map((trip) => <TripCard key={trip.id} trip={trip} onStart={setToStart} />)}
              <Pagination current={page} total={totalPages} onChange={setPage} />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <StartTripDialog trip={toStart} busy={starting} onCancel={() => setToStart(null)} onConfirm={confirmStart} />

      {/* Creation modal */}
      <AnimatePresence>
        {isCreationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md dark:bg-black/50" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 15 }} transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="relative flex h-full max-h-[90vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-2xl border border-white/60 dark:border-white/[0.08] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl ring-1 ring-black/5">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.08] px-6 py-4">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary-500" /><h2 className="text-[15px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dispatch Operations</h2></div>
                <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.92 }} onClick={() => setIsCreationOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition-colors"><X size={18} /></motion.button>
              </div>
              <div className="flex-1 overflow-y-auto"><TripCreation onClose={() => setIsCreationOpen(false)} /></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}