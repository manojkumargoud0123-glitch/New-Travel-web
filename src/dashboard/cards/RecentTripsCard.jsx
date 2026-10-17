import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Truck, User, Phone, Clock, Repeat } from "lucide-react";
import {
  DashCard, Empty, useDashUI, useElementWidth, pressable, prettyLabel, fmtDateTime, tint, acc, ROUTES,
} from "../ui.jsx";
import { colorVars } from "../palettes.js";
import { COLOR_GROUPS } from "../settings.js";
import { CARD_META } from "./meta.js";

const META = CARD_META.recentTrips;
const TABLE_MIN_WIDTH = 520; // below this the card switches to a stacked list
const CONTACT_MIN_WIDTH = 760; // the Contact column only shows on a wide card

const StatusBadge = ({ status }) => {
  const ui = useDashUI();
  const key = String(status || "").toLowerCase();
  const known = key in COLOR_GROUPS.trips.keys;
  const label = known ? COLOR_GROUPS.trips.keys[key] : prettyLabel(key) || "—";
  return (
    <span
      style={known ? colorVars(ui.color("trips", key)) : undefined}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 ${ui.sz.cellSub} font-bold ${ui.chip} ${
        known ? `${tint.border} ${tint.soft} ${tint.text}` : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {key === "active" && <span className={`absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full opacity-75 ${tint.dot}`} />}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${known ? tint.dot : "bg-slate-400"}`} />
      </span>
      {label}
    </span>
  );
};

const ReassignedChip = () => (
  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
    <Repeat size={10} /> Reassigned
  </span>
);

const RouteCell = ({ t, text }) => (
  <div className="flex min-w-0 gap-2">
    <div className="flex flex-col items-center py-[5px]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
      <span className="my-0.5 min-h-[6px] w-px flex-1 bg-slate-300 dark:bg-white/15" />
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
    </div>
    <div className={`flex min-w-0 flex-col gap-0.5 ${text} font-semibold text-slate-700 dark:text-slate-200`}>
      <span className="truncate" title={t.pickup_location || ""}>{t.pickup_location || "—"}</span>
      <span className="truncate" title={t.drop_location || ""}>{t.drop_location || "—"}</span>
    </div>
  </div>
);

const endNote = (t) => {
  if (t.trip_end_time) return `Ended ${fmtDateTime(t.trip_end_time)}`;
  if (t.cancelled_at) return `Cancelled ${fmtDateTime(t.cancelled_at)}`;
  if (String(t.status).toLowerCase() === "active") return "In progress";
  return "";
};

/* recent_trips — a table when the card is wide, a stacked list when narrow */
export default function RecentTripsCard({ data }) {
  const ui = useDashUI();
  const { sz } = ui;
  const navigate = useNavigate();
  const ref = useRef(null);
  const width = useElementWidth(ref, [ui.contained]);
  const trips = Array.isArray(data?.recent_trips) ? data.recent_trips : [];
  const open = (t) => navigate(ROUTES.trips, t.status ? { state: { status_filter: t.status } } : undefined);

  const showContact = width >= CONTACT_MIN_WIDTH;
  // header cells stick to the top while the list scrolls inside the card
  const th = `sticky top-0 z-10 bg-white/95 ${sz.cellHead} shadow-[inset_0_-1px_0_rgb(148_163_184/0.25)] font-bold uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-slate-900/95`;
  const td = `${sz.cell} align-top`;
  const main = `${sz.cellMain} font-semibold text-slate-700 dark:text-slate-100`;
  const sub = `${sz.cellSub} text-slate-400`;

  const content = trips.length === 0 ? (
    <Empty icon={META.icon} text="No trips yet" />
  ) : width >= TABLE_MIN_WIDTH ? (
    <table className="w-full table-fixed text-left">
      {showContact ? (
        <colgroup>
          <col className="w-[20%]" /><col className="w-[15%]" /><col className="w-[16%]" />
          <col className="w-[23%]" /><col className="w-[15%]" /><col className="w-[11%]" />
        </colgroup>
      ) : (
        <colgroup>
          <col className="w-[25%]" /><col className="w-[19%]" /><col className="w-[25%]" />
          <col className="w-[17%]" /><col className="w-[14%]" />
        </colgroup>
      )}
      <thead>
        <tr>
          <th className={th}>Trip</th>
          <th className={th}>Vehicle</th>
          {showContact && <th className={th}>Contact</th>}
          <th className={th}>Route</th>
          <th className={th}>Start</th>
          <th className={`${th} text-right`}>Status</th>
        </tr>
      </thead>
      <tbody>
        {trips.map((t) => (
          <tr
            key={t.id ?? t.trip_no}
            {...pressable(() => open(t))}
            className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80 dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
          >
            <td className={td}>
              <p className={`truncate font-display ${sz.cellMain} font-bold text-slate-800 dark:text-white`}>{t.trip_no || `#${t.id}`}</p>
              <p className={`truncate ${sub}`}>
                {fmtDateTime(t.trip_creation_time)}{t.trip_created_user_name ? ` · ${t.trip_created_user_name}` : ""}
              </p>
              {t.parent_trip != null && <div className="mt-1"><ReassignedChip /></div>}
            </td>
            <td className={td}>
              <p className={`flex items-center gap-1.5 truncate ${main}`}>
                <Truck size={12} className="shrink-0 text-slate-400" />
                <span className="truncate">{t.vehicle_unit_name || t.vehicle_registration || "—"}</span>
              </p>
              <p className={`truncate ${sub}`}>{t.vehicle_type_name || "—"}</p>
            </td>
            {showContact && (
              <td className={td}>
                <p className={`flex items-center gap-1.5 ${main}`}>
                  <User size={12} className="shrink-0 text-slate-400" />
                  <span className="truncate">{t.person_name || "—"}</span>
                </p>
                {t.person_number && (
                  <p className={`flex items-center gap-1.5 truncate tabular-nums ${sub}`}>
                    <Phone size={10} className="shrink-0" /> {t.person_number}
                  </p>
                )}
              </td>
            )}
            <td className={td}><RouteCell t={t} text={sz.cellMain} /></td>
            <td className={td}>
              <p className={`truncate tabular-nums ${main}`}>{fmtDateTime(t.trip_start_time)}</p>
              <p className={`truncate ${sub}`}>{endNote(t)}</p>
            </td>
            <td className={`${td} text-right`}><StatusBadge status={t.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <div className="flex flex-col gap-2">
      {trips.map((t) => (
        <div key={t.id ?? t.trip_no} {...pressable(() => open(t))} className={`cursor-pointer p-2.5 ${ui.tile}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`truncate font-display ${sz.cellMain} font-bold text-slate-800 dark:text-white`}>{t.trip_no || `#${t.id}`}</p>
              <p className={`truncate ${sub}`}>
                {t.vehicle_unit_name || "—"}{t.vehicle_type_name ? ` · ${t.vehicle_type_name}` : ""}
              </p>
            </div>
            <StatusBadge status={t.status} />
          </div>
          <div className="mt-2"><RouteCell t={t} text={sz.cellMain} /></div>
          <div className={`mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-medium text-slate-500 dark:text-slate-400 ${sz.cellSub}`}>
            <span className="inline-flex min-w-0 items-center gap-1"><User size={11} className="shrink-0" /> <span className="truncate">{t.person_name || "—"}</span></span>
            <span className="inline-flex items-center gap-1 tabular-nums"><Clock size={11} /> {fmtDateTime(t.trip_start_time)}</span>
          </div>
          {t.parent_trip != null && <div className="mt-1.5"><ReassignedChip /></div>}
        </div>
      ))}
    </div>
  );

  return (
    <DashCard
      icon={META.icon} title={META.title} subtitle="Latest trips across the fleet"
      right={
        <button
          onClick={() => navigate(ROUTES.trips)}
          className={`flex items-center gap-0.5 border px-2 py-0.5 ${sz.cellSub} font-bold transition-colors ${ui.chip} ${acc.border} ${acc.soft} ${acc.text} ${acc.softHover}`}
        >
          View all <ChevronRight size={12} />
        </button>
      }
    >
      {ui.contained ? (
        // Desktop: the list is taken out of flow (absolute) so the card matches
        // the height of the card beside it and a long list scrolls inside
        <div className={`relative min-w-0 flex-1 ${sz.listMin}`}>
          <div ref={ref} className="absolute inset-0 -mr-1.5 overflow-y-auto pr-1.5">{content}</div>
        </div>
      ) : (
        <div ref={ref} className="min-w-0">{content}</div>
      )}
    </DashCard>
  );
}
