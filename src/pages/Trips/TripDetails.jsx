import { Fragment, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Search, Calendar, Car, Layers, Plus, X, Inbox, Loader2, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  FileText, FileSpreadsheet, FileDown, Printer, MapPin, Flag, Map as MapIcon,
  Phone, RotateCcw, History,
} from "lucide-react";
import { useAuth } from "../../config/AuthContext";
import SearchSelect from "../../components/SearchSelect";
import PageNumbers from "../../components/PageNumbers";
import { exportCSV, exportExcel, exportPDF, exportPrint } from "../../utils/exportUtils";
import TripCreation from "./TripCreation";
import TripMapModal from "./TripMapModal";

/* =========================================================================
   ENDPOINTS (through apiFetch: token + username / role_id / role_name)
   GET  /VehicleTypeNewFilter/          → { units: [{ id, vehicle_type_name }] }
   GET  /VehiclesDropdownByType/?vehicle_type_new=<type id>
                                        → { results: [{ unit_id, unit_name }] }
        (without the param it lists every vehicle)
   POST /TripList/ { vehicle_type, vehicle_number, from_date, to_date }
                                        → { results: [trip, …] }
        One row per trip: the latest leg of its reassign chain, earlier legs
        under previous_trips. The API has no paging, search or sort, so all
        three happen here in the browser (TanStack Table).
   ========================================================================= */
const EP = {
  types: "/VehicleTypeNewFilter/",
  vehicles: "/VehiclesDropdownByType/",
  trips: "/TripList/",
};

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

const labelCls = "px-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300";

/* --------------------------------- config --------------------------------- */
const PAGE_SIZE = 10;
const EXPORT_NAME = "trip-details";
const EXPORT_TITLE = "Trip Details";
const HIDDEN_COLUMNS = { _search: false };

const exportBtns = [
  { label: "CSV", icon: FileText },
  { label: "Excel", icon: FileSpreadsheet },
  { label: "PDF", icon: FileDown },
  { label: "Print", icon: Printer },
];

// Exports carry every row that matches the filters, status tab and search,
// in the table's current sort order.
const EXPORT_COLUMNS = [
  { key: "sno", label: "S.No" },
  { key: "trip_no", label: "Trip No" },
  { key: "vehicle", label: "Vehicle" },
  { key: "registration", label: "Registration" },
  { key: "vehicle_type", label: "Vehicle Type" },
  { key: "person", label: "Person" },
  { key: "phone", label: "Phone" },
  { key: "pickup", label: "Pickup" },
  { key: "drop", label: "Drop" },
  { key: "start", label: "Start Time" },
  { key: "end", label: "End Time" },
  { key: "created", label: "Created" },
  { key: "created_by", label: "Created By" },
  { key: "status", label: "Status" },
  { key: "reassigns", label: "Reassigns" },
  { key: "reason", label: "Cancel / Close Reason" },
];

/* --------------------------------- status --------------------------------- */
const pill = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-300",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
  slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300",
};
const dot = {
  green: "bg-emerald-500", blue: "bg-blue-500", indigo: "bg-indigo-500",
  amber: "bg-amber-500", slate: "bg-slate-400", rose: "bg-rose-500",
};

// Known statuses in tab order; anything else the API sends still shows, in grey.
const STATUSES = {
  active: { label: "Active", tone: "green" },
  scheduled: { label: "Scheduled", tone: "blue" },
  ongoing: { label: "Ongoing", tone: "green" },
  running: { label: "Running", tone: "green" },
  in_transit: { label: "In Transit", tone: "indigo" },
  delayed: { label: "Delayed", tone: "amber" },
  reassigned: { label: "Reassigned", tone: "amber" },
  completed: { label: "Completed", tone: "slate" },
  closed: { label: "Closed", tone: "slate" },
  cancelled: { label: "Cancelled", tone: "rose" },
};
const STATUS_ORDER = Object.keys(STATUSES);

const titleCase = (s) =>
  String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const statusMeta = (s) =>
  STATUSES[s] ?? { label: s ? titleCase(s) : "—", tone: "slate" };

function StatusBadge({ status }) {
  const m = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${pill[m.tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[m.tone]}`} />
      {m.label}
    </span>
  );
}

/* --------------------------------- helpers -------------------------------- */
// yyyy-mm-dd in local time
const ymd = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Default range: this month so far
const defaultFilters = () => {
  const now = new Date();
  return {
    typeName: "",
    vehicle: "",
    from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: ymd(now),
  };
};

const toTime = (iso) => {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : t;
};

// Table cells show date and time on two lines to keep the columns narrow
const dateParts = (iso) => {
  const t = toTime(iso);
  if (t === undefined) return null;
  const d = new Date(t);
  return {
    date: d.toLocaleDateString("en-IN", { dateStyle: "medium" }),
    time: d.toLocaleTimeString("en-IN", { timeStyle: "short" }),
  };
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? String(iso)
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const coord = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const listOf = (data, key) =>
  Array.isArray(data?.[key]) ? data[key] : Array.isArray(data) ? data : [];

const apiError = (res, data) =>
  (typeof data?.message === "string" && data.message) ||
  (typeof data?.detail === "string" && data.detail) ||
  (typeof data?.error === "string" && data.error) ||
  `Request failed (${res.status})`;

const naturalSort = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

// Every value in the trip (nested ones too) plus the dates as shown, lower-cased
function searchText(value) {
  const out = [];
  const walk = (x) => {
    if (x === null || x === undefined) return;
    if (typeof x === "object") Object.values(x).forEach(walk);
    else out.push(String(x));
  };
  walk(value);
  return out.join(" ").toLowerCase();
}

/* API trip → table row: the original fields plus parsed coordinates, display
   labels and the search text. */
function toRow(t) {
  const status = String(t.status || "").toLowerCase();
  const pickLat = coord(t.pickup_lat);
  const pickLng = coord(t.pickup_long);
  const dropLat = coord(t.drop_lat);
  const dropLng = coord(t.drop_long);
  const hasCoords =
    [pickLat, pickLng, dropLat, dropLng].every((v) => v !== null) &&
    !(pickLat === 0 && pickLng === 0) &&
    !(dropLat === 0 && dropLng === 0);
  const labels = {
    startLabel: fmtDateTime(t.trip_start_time),
    endLabel: fmtDateTime(t.trip_end_time),
    createdLabel: fmtDateTime(t.trip_creation_time),
    statusLabel: statusMeta(status).label,
  };
  return {
    ...t,
    ...labels,
    status,
    previous: Array.isArray(t.previous_trips) ? t.previous_trips : [],
    reassigns: Number(t.total_reassigns) || (Array.isArray(t.previous_trips) ? t.previous_trips.length : 0),
    hasCoords,
    pickLat,
    pickLng,
    dropLat,
    dropLng,
    _search: searchText({ ...t, ...labels }),
  };
}

const toExportRow = (r) => ({
  trip_no: r.trip_no ?? "",
  vehicle: r.vehicle_unit_name ?? "",
  registration: r.vehicle_registration ?? "",
  vehicle_type: r.vehicle_type_name ?? "",
  person: r.person_name ?? "",
  phone: r.person_number ?? "",
  pickup: r.pickup_location ?? "",
  drop: r.drop_location ?? "",
  start: r.startLabel,
  end: r.endLabel,
  created: r.createdLabel,
  created_by: r.trip_created_user_name ?? "",
  status: r.statusLabel,
  reassigns: r.reassigns,
  reason: r.cancel_reason || r.close_reason || "",
});

// What the route map needs (see TripMapModal)
const toMapTrip = (r) => ({
  id: r.id,
  tripCode: r.trip_no,
  vehicle: r.vehicle_unit_name || r.vehicle_registration || "—",
  vehicleId: r.vehicle_registration || null,
  customer: r.person_name || "—",
  from: r.pickup_location || "—",
  to: r.drop_location || "—",
  fromTime: r.startLabel || "—",
  toTime: r.endLabel || "—",
  hasCoords: r.hasCoords,
  sourceLat: r.pickLat,
  sourceLng: r.pickLng,
  destLat: r.dropLat,
  destLng: r.dropLng,
  distance: r.hasCoords
    ? `~${haversineKm(r.pickLat, r.pickLng, r.dropLat, r.dropLng).toFixed(1)} KM`
    : "—",
  duration: "straight line",
  tripCreationDatetime: r.trip_creation_time || null,
  actualEndDatetime: r.trip_end_time ?? null,
});

/* --------------------------------- cells ---------------------------------- */
const muted = <span className="text-slate-400">—</span>;

function Place({ icon: Icon, tone, text }) {
  return text ? (
    <span className="flex min-w-0 items-start gap-1.5" title={text}>
      <Icon size={13} className={`mt-[3px] shrink-0 ${tone}`} />
      <span className="line-clamp-2 text-[13px] font-medium leading-snug text-slate-600 dark:text-slate-300">
        {text}
      </span>
    </span>
  ) : (
    muted
  );
}

function SortArrows({ dir }) {
  return (
    <span className="flex shrink-0 flex-col -space-y-1" aria-hidden="true">
      <ChevronUp size={10} className={dir === "asc" ? "text-white" : "text-white/35"} />
      <ChevronDown size={10} className={dir === "desc" ? "text-white" : "text-white/35"} />
    </span>
  );
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 break-words text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {children || muted}
      </div>
    </div>
  );
}

const latLng = (lat, lng) => (lat !== null && lng !== null ? `${lat}, ${lng}` : "");

function DateCell({ iso, by }) {
  const p = dateParts(iso);
  if (!p) return muted;
  return (
    <span className="block">
      <span className="block whitespace-nowrap text-[13px] font-medium text-slate-600 dark:text-slate-300">{p.date}</span>
      <span className="block whitespace-nowrap text-[11.5px] font-medium text-slate-400">
        {p.time}
        {by ? ` · ${by}` : ""}
      </span>
    </span>
  );
}

/* Expanded row: everything the list row leaves out, plus the reassign chain */
function TripExtra({ trip: r }) {
  const closed = r.closed_at || r.close_reason || r.trip_end_time;
  const cancelled = r.cancelled_at || r.cancel_reason;
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Pickup">
          {r.pickup_location}
          {latLng(r.pickLat, r.pickLng) && (
            <span className="block font-mono text-[11.5px] font-medium text-slate-400">{latLng(r.pickLat, r.pickLng)}</span>
          )}
        </Detail>
        <Detail label="Drop">
          {r.drop_location}
          {latLng(r.dropLat, r.dropLng) && (
            <span className="block font-mono text-[11.5px] font-medium text-slate-400">{latLng(r.dropLat, r.dropLng)}</span>
          )}
        </Detail>
        <Detail label="Created">
          {r.createdLabel}
          {r.trip_created_user_name && (
            <span className="block text-[12px] font-medium text-slate-400">by {r.trip_created_user_name}</span>
          )}
        </Detail>
        <Detail label="Start / End">
          {r.startLabel || "—"}
          <span className="block text-[12px] font-medium text-slate-400">to {r.endLabel || "not ended"}</span>
        </Detail>
        {closed && (
          <Detail label="Closed">
            {fmtDateTime(r.closed_at) || r.endLabel}
            {r.closed_by_name && <span className="block text-[12px] font-medium text-slate-400">by {r.closed_by_name}</span>}
            {r.close_reason && <span className="block text-[12px] font-medium text-slate-500 dark:text-slate-400">“{r.close_reason}”</span>}
          </Detail>
        )}
        {closed && (r.end_odometer != null || latLng(coord(r.end_latitude), coord(r.end_longitude))) && (
          <Detail label="End Point">
            {r.end_odometer != null && <span className="block">Odometer {r.end_odometer}</span>}
            {latLng(coord(r.end_latitude), coord(r.end_longitude)) && (
              <span className="block font-mono text-[11.5px] font-medium text-slate-400">
                {latLng(coord(r.end_latitude), coord(r.end_longitude))}
              </span>
            )}
          </Detail>
        )}
        {cancelled && (
          <Detail label="Cancelled">
            {fmtDateTime(r.cancelled_at)}
            {r.cancelled_by_name && <span className="block text-[12px] font-medium text-slate-400">by {r.cancelled_by_name}</span>}
            {r.cancel_reason && <span className="block text-[12px] font-medium text-slate-500 dark:text-slate-400">“{r.cancel_reason}”</span>}
          </Detail>
        )}
      </div>

      {r.previous.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <History size={13} /> Earlier legs ({r.previous.length})
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/[0.06]">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead className="bg-slate-100/80 text-[10.5px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                <tr>
                  {["Trip No", "Vehicle", "Status", "Started", "Reassigned", "Reason"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.previous.map((p, i) => (
                  <tr key={p.id ?? i} className="border-t border-slate-200 dark:border-white/[0.06]">
                    <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{p.trip_no || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {p.vehicle_unit_name || p.vehicle_registration || "—"}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={String(p.status || "").toLowerCase()} /></td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{fmtDateTime(p.trip_start_time) || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {fmtDateTime(p.cancelled_at) || "—"}
                      {p.cancelled_by_name && <span className="block text-[11px] text-slate-400">by {p.cancelled_by_name}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{p.cancel_reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- columns -------------------------------- */
// Text sorts alphabetically (numbers inside it numerically), dates as dates.
// Empty values always sort last.
const columns = [
  {
    id: "sno",
    header: "S.No",
    enableSorting: false,
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination;
      const at = table.getRowModel().rows.findIndex((r) => r.id === row.id);
      return <span className="text-[13px] font-bold text-slate-400">{pageIndex * pageSize + at + 1}</span>;
    },
  },
  {
    id: "trip_no",
    header: "Trip No",
    accessorFn: (r) => r.trip_no || undefined,
    sortingFn: "alphanumeric",
    cell: ({ row: { original: r } }) => (
      <span className="flex flex-col items-start gap-1">
        <span className="whitespace-nowrap font-display text-[13px] font-extrabold tracking-wide text-rose-500">
          {r.trip_no || "—"}
        </span>
        {r.reassigns > 0 && (
          <span
            title={`Reassigned ${r.reassigns} time${r.reassigns === 1 ? "" : "s"}`}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[10.5px] font-bold ${pill.amber}`}
          >
            <RotateCcw size={10} /> {r.reassigns}
          </span>
        )}
      </span>
    ),
  },
  {
    id: "vehicle",
    header: "Vehicle",
    accessorFn: (r) => r.vehicle_unit_name || r.vehicle_registration || undefined,
    sortingFn: "alphanumeric",
    cell: ({ row: { original: r } }) => (
      <span className="block min-w-0">
        <span className="block whitespace-nowrap text-[13.5px] font-bold text-primary-600 dark:text-primary-400">
          {r.vehicle_unit_name || r.vehicle_registration || "—"}
        </span>
        {/* type (and registration, when it differs) under the number keeps the table narrow */}
        {(r.vehicle_type_name || (r.vehicle_registration && r.vehicle_registration !== r.vehicle_unit_name)) && (
          <span className="block whitespace-nowrap text-[11.5px] font-medium text-slate-400">
            {[r.vehicle_type_name, r.vehicle_registration !== r.vehicle_unit_name && r.vehicle_registration]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </span>
    ),
  },
  {
    id: "person",
    header: "Person",
    accessorFn: (r) => r.person_name || undefined,
    sortingFn: "alphanumeric",
    cell: ({ row: { original: r } }) => (
      <span className="block min-w-0">
        <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-100">{r.person_name || "—"}</span>
        {r.person_number && (
          <a
            href={`tel:${r.person_number}`}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Phone size={10} /> {r.person_number}
          </a>
        )}
      </span>
    ),
  },
  {
    id: "pickup",
    header: "Pickup",
    accessorFn: (r) => r.pickup_location || undefined,
    sortingFn: "alphanumeric",
    cell: ({ getValue }) => <Place icon={MapPin} tone="text-emerald-500" text={getValue()} />,
  },
  {
    id: "drop",
    header: "Drop",
    accessorFn: (r) => r.drop_location || undefined,
    sortingFn: "alphanumeric",
    cell: ({ getValue }) => <Place icon={Flag} tone="text-rose-500" text={getValue()} />,
  },
  {
    id: "start",
    header: "Start Time",
    accessorFn: (r) => toTime(r.trip_start_time),
    sortingFn: "basic",
    cell: ({ row: { original: r } }) => <DateCell iso={r.trip_start_time} />,
  },
  {
    id: "created",
    header: "Created",
    accessorFn: (r) => toTime(r.trip_creation_time),
    sortingFn: "basic",
    cell: ({ row: { original: r } }) => <DateCell iso={r.trip_creation_time} by={r.trip_created_user_name} />,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (r) => r.status || undefined,
    sortingFn: "alphanumeric",
    filterFn: "equalsString",
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row, table }) => {
      const r = row.original;
      const open = row.getIsExpanded();
      return (
        <span className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={!r.hasCoords}
            onClick={() => table.options.meta.openMap(r)}
            title={r.hasCoords ? "View route on map" : "No coordinates for this trip"}
            aria-label={`View route on map for ${r.trip_no || "trip"}`}
            className={`h-8 w-8 ${ghostBtn}`}
          >
            <MapIcon size={15} />
          </button>
          <button
            type="button"
            onClick={row.getToggleExpandedHandler()}
            aria-expanded={open}
            title={open ? "Hide details" : "Show details"}
            aria-label={`${open ? "Hide" : "Show"} details for ${r.trip_no || "trip"}`}
            className={`h-8 w-8 ${ghostBtn} ${open ? "!border-primary-300 !bg-primary-50 !text-primary-600 dark:!bg-primary-500/10 dark:!text-primary-300" : ""}`}
          >
            <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </span>
      );
    },
  },
  // Hidden: what the search box matches against
  { id: "_search", accessorFn: (r) => r._search, enableSorting: false, enableGlobalFilter: true },
];

const COLUMN_WIDTH = {
  sno: "w-[52px]",
  trip_no: "w-[110px]",
  vehicle: "w-[136px]",
  person: "w-[140px]",
  pickup: "min-w-[160px]",
  drop: "min-w-[160px]",
  start: "w-[112px]",
  created: "w-[124px]",
  status: "w-[118px]",
  actions: "w-[92px] text-right",
};

/* --------------------------------- Page ----------------------------------- */
export default function TripDetails() {
  const rootRef = useRef(null);
  const { apiFetch } = useAuth();

  /* ---- filters (sent to the API) ---- */
  const [form, setForm] = useState(defaultFilters);
  const [formError, setFormError] = useState("");
  const [types, setTypes] = useState([]); // [{ id, name }]
  const [typesError, setTypesError] = useState(false);
  const [vehicles, setVehicles] = useState([]); // unit names
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState(false);

  /* ---- data ---- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const appliedRef = useRef({ ...defaultFilters(), typeId: null });
  const requestRef = useRef(0);

  /* ---- table (search, status tab, sort and paging are all in the browser) ---- */
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [sorting, setSorting] = useState([{ id: "start", desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [expanded, setExpanded] = useState({});

  const [mapTrip, setMapTrip] = useState(null);
  const [isCreationOpen, setIsCreationOpen] = useState(false);

  const typeId = useMemo(
    () => types.find((t) => t.name === form.typeName)?.id ?? null,
    [types, form.typeName],
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toFirstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  /* ---- vehicle types (once) ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(EP.types);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiError(res, data));
        if (!alive) return;
        setTypes(
          listOf(data, "units")
            .map((u) => ({ id: u.id, name: u.vehicle_type_name }))
            .filter((t) => t.id != null && t.name),
        );
        setTypesError(false);
      } catch {
        if (alive) setTypesError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiFetch]);

  /* ---- vehicles for the chosen type (all vehicles when none) ---- */
  useEffect(() => {
    let alive = true;
    setVehiclesLoading(true);
    (async () => {
      try {
        const qs = typeId != null ? `?vehicle_type_new=${encodeURIComponent(typeId)}` : "";
        const res = await apiFetch(`${EP.vehicles}${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiError(res, data));
        if (!alive) return;
        const names = [...new Set(listOf(data, "results").map((v) => v.unit_name).filter(Boolean))].sort(naturalSort);
        setVehicles(names);
        setVehiclesError(false);
        // a vehicle picked under another type no longer applies
        setForm((f) => (f.vehicle && !names.includes(f.vehicle) ? { ...f, vehicle: "" } : f));
      } catch {
        if (!alive) return;
        setVehicles([]);
        setVehiclesError(true);
      } finally {
        if (alive) setVehiclesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiFetch, typeId]);

  /* ---- trips ---- */
  const loadTrips = useCallback(
    async (f) => {
      const id = ++requestRef.current;
      appliedRef.current = f;
      setLoading(true);
      setFetchError("");
      try {
        const res = await apiFetch(EP.trips, {
          method: "POST",
          body: {
            vehicle_type: f.typeId != null ? String(f.typeId) : null,
            vehicle_number: f.vehicle || null,
            from_date: f.from || null,
            to_date: f.to || null,
          },
        });
        const data = await res.json().catch(() => ({}));
        if (id !== requestRef.current) return; // a newer request took over
        if (!res.ok) throw new Error(apiError(res, data));
        setRows(listOf(data, "results"));
      } catch (e) {
        if (id !== requestRef.current) return;
        setRows([]);
        setFetchError(
          e instanceof TypeError
            ? "Couldn't reach the server. Check your connection and try again."
            : e.message || "Couldn't load trips.",
        );
      } finally {
        if (id === requestRef.current) {
          setLoading(false);
          setExpanded({});
          toFirstPage();
        }
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    loadTrips(appliedRef.current);
  }, [loadTrips]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (form.from && form.to && form.from > form.to) {
      setFormError("From Date must be on or before To Date.");
      return;
    }
    setFormError("");
    loadTrips({ ...form, typeId });
  };

  const onReset = () => {
    const f = defaultFilters();
    setForm(f);
    setFormError("");
    loadTrips({ ...f, typeId: null });
  };

  const isDefault = (() => {
    const d = defaultFilters();
    return !form.typeName && !form.vehicle && form.from === d.from && form.to === d.to;
  })();

  /* ---- table ---- */
  const data = useMemo(() => rows.map(toRow), [rows]);

  const statusTabs = useMemo(() => {
    const counts = new Map();
    data.forEach((r) => counts.set(r.status, (counts.get(r.status) || 0) + 1));
    const rank = (s) => (STATUS_ORDER.includes(s) ? STATUS_ORDER.indexOf(s) : STATUS_ORDER.length);
    return [
      { key: "all", label: "All", count: data.length },
      ...[...counts.entries()]
        .filter(([s]) => s)
        .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
        .map(([s, n]) => ({ key: s, label: statusMeta(s).label, count: n })),
    ];
  }, [data]);

  // A status that's gone after reloading falls back to All
  useEffect(() => {
    if (statusTab !== "all" && !statusTabs.some((t) => t.key === statusTab)) setStatusTab("all");
  }, [statusTabs, statusTab]);

  const columnFilters = useMemo(
    () => (statusTab === "all" ? [] : [{ id: "status", value: statusTab }]),
    [statusTab],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      expanded,
      columnFilters,
      globalFilter: query.trim(),
      columnVisibility: HIDDEN_COLUMNS,
    },
    meta: { openMap: (r) => setMapTrip(toMapTrip(r)) },
    defaultColumn: { enableGlobalFilter: false, sortUndefined: "last" },
    globalFilterFn: "includesString",
    sortDescFirst: false, // first click ascending, then it alternates
    enableSortingRemoval: false,
    autoResetPageIndex: false, // reset explicitly: new data, search, status tab
    getRowId: (r, i) => String(r.id ?? `row-${i}`),
    getRowCanExpand: () => true,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const matched = table.getPrePaginationRowModel().rows; // filtered + sorted, every page
  const pageRows = table.getRowModel().rows;
  const total = matched.length;
  const pageCount = Math.max(1, table.getPageCount());
  const page = Math.min(pagination.pageIndex + 1, pageCount);
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);
  const visibleColumns = table.getVisibleLeafColumns().length;
  const goTo = (p) => table.setPageIndex(Math.min(Math.max(p, 1), pageCount) - 1);

  const runExport = (label) => {
    const out = matched.map((r) => toExportRow(r.original));
    if (label === "CSV") exportCSV(out, EXPORT_COLUMNS, EXPORT_NAME);
    if (label === "Excel") exportExcel(out, EXPORT_COLUMNS, EXPORT_NAME);
    if (label === "PDF") exportPDF(out, EXPORT_COLUMNS, EXPORT_TITLE, EXPORT_NAME);
    if (label === "Print") exportPrint(out, EXPORT_COLUMNS, EXPORT_TITLE);
  };

  /* ---- entrance ---- */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const ctx = gsap.context(() => {
      gsap.from(".td-head", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".td-bar", { y: 22, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.08, stagger: 0.08 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const closeCreation = () => {
    setIsCreationOpen(false);
    loadTrips(appliedRef.current); // a trip may have been added
  };

  const searching = query.trim() !== "" || statusTab !== "all";

  return (
    <div ref={rootRef} className="relative mx-auto max-w-[1500px] 2xl:max-w-none px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-primary-500/10 blur-[120px]" />

      {/* header */}
      <div className="td-head relative mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400">Trips</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Trip Details
          </h1>
          <p className="mt-2 text-[14px] text-slate-500 dark:text-slate-400">
            Trips by vehicle and date: route, person, timing and reassignments.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsCreationOpen(true)}
          className="flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-[14px] font-semibold text-white shadow-md shadow-primary-500/15 transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          <Plus size={18} /> Create Trip
        </motion.button>
      </div>

      {/* filters */}
      {/* noValidate: the date range is checked in onSubmit, with our own message */}
      <form onSubmit={onSubmit} noValidate className={`td-bar relative z-20 mb-5 ${card}`}>
        <div className="grid grid-cols-1 items-end gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <div className="flex flex-col gap-1.5">
            <span className={labelCls}>Vehicle Type</span>
            <SearchSelect
              options={types.map((t) => t.name)}
              value={form.typeName}
              onChange={(v) => setField("typeName", v)}
              placeholder={typesError ? "Couldn't load types" : "All types"}
              icon={Layers}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelCls}>Vehicle Number</span>
            <SearchSelect
              options={vehicles}
              value={form.vehicle}
              onChange={(v) => setField("vehicle", v)}
              placeholder={
                vehiclesLoading ? "Loading vehicles…" : vehiclesError ? "Couldn't load vehicles" : `All vehicles (${vehicles.length})`
              }
              icon={Car}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="td-from" className={labelCls}>From Date</label>
            <div className="relative">
              <Calendar size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
              <input
                id="td-from"
                type="date"
                value={form.from}
                max={form.to || undefined}
                onChange={(e) => setField("from", e.target.value)}
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="td-to" className={labelCls}>To Date</label>
            <div className="relative">
              <Calendar size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
              <input
                id="td-to"
                type="date"
                value={form.to}
                min={form.from || undefined}
                onChange={(e) => setField("to", e.target.value)}
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="flex h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-[14px] font-semibold text-white shadow-md shadow-primary-500/15 transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-500 dark:hover:bg-primary-600 xl:flex-none"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Submit
            </motion.button>
            {!isDefault && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onReset}
                title="Reset filters"
                aria-label="Reset filters"
                className={`h-[44px] w-[44px] ${ghostBtn}`}
              >
                <X size={16} />
              </motion.button>
            )}
          </div>
        </div>
        {formError && (
          <p role="alert" className="-mt-1 px-5 pb-4 text-[12.5px] font-semibold text-rose-600 dark:text-rose-400">
            {formError}
          </p>
        )}
      </form>

      {/* table card */}
      <div className={`td-bar ${card} overflow-visible`}>
        {/* status tabs */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 pt-4 pb-3 dark:border-white/[0.06] sm:px-6">
          {statusTabs.map((t) => {
            const on = statusTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setStatusTab(t.key);
                  toFirstPage();
                }}
                aria-pressed={on}
                className={`relative flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                  on ? "text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="td-status-tab"
                    className="absolute inset-0 rounded-xl bg-slate-800 dark:bg-primary-600"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
                <span
                  className={`relative z-10 rounded-md px-1.5 py-px text-[11px] font-bold ${
                    on ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* toolbar: exports + search */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-white/[0.06] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {exportBtns.map(({ label, icon: Icon }) => (
              <motion.button
                key={label}
                type="button"
                whileHover={total ? { scale: 1.04, y: -1 } : {}}
                whileTap={total ? { scale: 0.96 } : {}}
                disabled={!total}
                onClick={() => runExport(label)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-300"
              >
                <Icon size={15} /> {label}
              </motion.button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                toFirstPage();
              }}
              placeholder="Search trips"
              aria-label="Search trips"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto px-2 pb-2 sm:px-4">
          <table className="mt-3 w-full min-w-[1100px] border-separate border-spacing-0 text-left">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h, i, all) => {
                    const canSort = h.column.getCanSort();
                    const dir = h.column.getIsSorted();
                    return (
                      <th
                        key={h.id}
                        scope="col"
                        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : canSort ? "none" : undefined}
                        className={`bg-slate-800 px-3 py-3.5 text-[11px] font-bold uppercase tracking-wide text-white dark:bg-white/[0.06] ${
                          i === 0 ? "rounded-l-xl pl-5" : ""
                        } ${i === all.length - 1 ? "rounded-r-xl pr-5" : ""} ${COLUMN_WIDTH[h.column.id] || ""}`}
                      >
                        {canSort ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className="flex cursor-pointer items-center gap-1 uppercase transition-opacity hover:opacity-80"
                          >
                            <span className="whitespace-nowrap">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                            <SortArrows dir={dir} />
                          </button>
                        ) : (
                          <span className="whitespace-nowrap">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns} className="py-16 text-center">
                    <Loader2 size={28} className="mx-auto mb-3 animate-spin text-primary-500" />
                    <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Loading trips…</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={visibleColumns} className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                      <AlertTriangle size={26} />
                    </div>
                    <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">{fetchError}</p>
                    <button
                      type="button"
                      onClick={() => loadTrips(appliedRef.current)}
                      className="mt-3 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns} className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
                      <Inbox size={26} />
                    </div>
                    <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">No trips found</p>
                    <p className="mt-1 text-[13px] text-slate-400">
                      {searching && data.length
                        ? "Nothing matches your search or status."
                        : "No trips for these filters. Try a wider date range."}
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      {row.getVisibleCells().map((cell, i, all) => (
                        <td
                          key={cell.id}
                          className={`border-b border-slate-100 px-3 py-3 align-middle dark:border-white/[0.05] ${
                            i === 0 ? "pl-5" : ""
                          } ${i === all.length - 1 ? "pr-5" : ""} ${row.getIsExpanded() ? "border-b-transparent" : ""}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {row.getIsExpanded() && (
                      <tr>
                        <td colSpan={visibleColumns} className="border-b border-slate-100 px-5 pb-4 dark:border-white/[0.05]">
                          <TripExtra trip={row.original} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:flex-row sm:px-6">
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{startIdx}</span> to{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{endIdx}</span> of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> entries
            {total !== data.length && <span className="text-slate-400"> (filtered from {data.length})</span>}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {[
              { icon: ChevronsLeft, go: () => goTo(1), dis: page === 1, label: "First page" },
              { icon: ChevronLeft, go: () => goTo(page - 1), dis: page === 1, label: "Previous page" },
            ].map(({ icon: Icon, go, dis, label }) => (
              <motion.button key={label} type="button" aria-label={label} whileHover={!dis ? { scale: 1.1, y: -1 } : {}} whileTap={!dis ? { scale: 0.92 } : {}} onClick={go} disabled={dis} className={`h-9 w-9 ${ghostBtn}`}>
                <Icon size={16} />
              </motion.button>
            ))}
            <PageNumbers currentPage={page} totalPages={pageCount} onPageChange={goTo} />
            {[
              { icon: ChevronRight, go: () => goTo(page + 1), dis: page === pageCount, label: "Next page" },
              { icon: ChevronsRight, go: () => goTo(pageCount), dis: page === pageCount, label: "Last page" },
            ].map(({ icon: Icon, go, dis, label }) => (
              <motion.button key={label} type="button" aria-label={label} whileHover={!dis ? { scale: 1.1, y: -1 } : {}} whileTap={!dis ? { scale: 0.92 } : {}} onClick={go} disabled={dis} className={`h-9 w-9 ${ghostBtn}`}>
                <Icon size={16} />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {mapTrip && <TripMapModal trip={mapTrip} onClose={() => setMapTrip(null)} />}

      {/* creation modal */}
      <AnimatePresence>
        {isCreationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md dark:bg-black/50" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="relative flex h-full max-h-[90vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-slate-900/90"
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary-500" />
                  <h2 className="text-[15px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dispatch Operations</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={closeCreation}
                  aria-label="Close"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
                >
                  <X size={18} />
                </motion.button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <TripCreation onClose={closeCreation} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
