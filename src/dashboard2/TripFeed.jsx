import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Truck, User, Clock, Repeat, Inbox } from "lucide-react";
import { ROUTES, parseLocal, fmtDateTime } from "../dashboard/ui.jsx";
import { Panel, STATUSES, statusOf, toneVars, tone, ago } from "./kit.jsx";

const FILTERS = [{ key: "all", label: "All" }, ...STATUSES.map(({ key, label }) => ({ key, label }))];

const StatusPill = ({ st }) => (
  <span
    style={toneVars(st.color)}
    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
  >
    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
    {st.label}
  </span>
);

function FeedItem({ t, now, last, onOpen }) {
  const st = statusOf(t.status);
  const Icon = st.icon;
  const vehicle = t.vehicle_unit_name || t.vehicle_registration;

  return (
    <li className="relative flex gap-3">
      {/* timeline rail */}
      {!last && <span className="absolute bottom-0 left-[17px] top-11 w-px bg-slate-200 dark:bg-white/[0.08]" />}
      <span
        style={toneVars(st.color)}
        className={`relative mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.soft} ${tone.icon}`}
      >
        <Icon size={16} />
        {st.key === "active" && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${tone.dot}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-[rgb(var(--d2-surface))] ${tone.dot}`} />
          </span>
        )}
      </span>

      <button
        type="button" onClick={onOpen}
        className="group mb-1 min-w-0 flex-1 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{t.trip_no || `#${t.id}`}</span>
            {t.parent_trip != null && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <Repeat size={10} /> Reassigned
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden text-[11.5px] font-medium tabular-nums text-slate-400 sm:inline" title={fmtDateTime(t.trip_creation_time)}>
              {ago(t.trip_creation_time, now)}
            </span>
            <StatusPill st={st} />
          </div>
        </div>
        {/* route gets the full width so long place names stay readable */}
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">
          <span className="min-w-0 truncate" title={t.pickup_location || ""}>{t.pickup_location || "—"}</span>
          <ArrowRight size={13} className="shrink-0 text-slate-400" />
          <span className="min-w-0 truncate" title={t.drop_location || ""}>{t.drop_location || "—"}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Truck size={12} className="shrink-0" />
            <span className="truncate">{vehicle || "—"}{t.vehicle_type_name ? ` · ${t.vehicle_type_name}` : ""}</span>
          </span>
          {t.person_name && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <User size={12} className="shrink-0" />
              <span className="truncate">{t.person_name}{t.person_number ? ` · ${t.person_number}` : ""}</span>
            </span>
          )}
          {t.trip_start_time && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock size={12} className="shrink-0" /> Started {fmtDateTime(t.trip_start_time)}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

/* recent_trips as an activity timeline, filterable by status */
export default function TripFeed({ data }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const trips = Array.isArray(data?.recent_trips) ? data.recent_trips : [];
  const now = parseLocal(data?.timestamp) || new Date();

  const counts = useMemo(() => {
    const c = { all: trips.length };
    for (const t of trips) {
      const k = String(t.status || "").toLowerCase();
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [trips]);

  const list = filter === "all" ? trips : trips.filter((t) => String(t.status || "").toLowerCase() === filter);
  const open = (t) => navigate(ROUTES.trips, t.status ? { state: { status_filter: t.status } } : undefined);

  return (
    <Panel
      title="Recent trips" subtitle="Latest activity across the fleet"
      right={
        <Link
          to={ROUTES.trips}
          className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          View all <ChevronRight size={13} />
        </Link>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key} type="button" aria-pressed={on} onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                on
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.09]"
              }`}
            >
              {f.label}
              <span className={`tabular-nums ${on ? "opacity-70" : "text-slate-400"}`}>{counts[f.key] || 0}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-slate-400">
          <Inbox size={24} />
          <p className="text-[13px] font-medium">
            {trips.length === 0 ? "No trips yet" : "No trips with this status in the latest list"}
          </p>
        </div>
      ) : (
        // Desktop: the list is taken out of flow so the panel matches the column
        // beside it and a long list scrolls inside; phones get a capped height
        <div className="relative min-h-0 flex-1 lg:min-h-[300px]">
          <div className="-mr-2 max-h-[420px] overflow-y-auto pr-2 lg:absolute lg:inset-0 lg:max-h-none">
            <ol>
              {list.map((t, i) => (
                <FeedItem key={t.id ?? t.trip_no ?? i} t={t} now={now} last={i === list.length - 1} onOpen={() => open(t)} />
              ))}
            </ol>
          </div>
        </div>
      )}
    </Panel>
  );
}
