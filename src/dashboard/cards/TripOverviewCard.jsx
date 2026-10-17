import React from "react";
import { useNavigate } from "react-router-dom";
import { Play, CheckCircle2, XCircle, CalendarDays, CalendarRange } from "lucide-react";
import { DashCard, Donut, MetricRow, AccentStat, useDashUI, ROUTES, parseLocal } from "../ui.jsx";
import { CARD_META } from "./meta.js";

const META = CARD_META.tripOverview;

const ROWS = [
  { key: "active", field: "active_trips", label: "Active", icon: Play },
  { key: "completed", field: "completed_trips", label: "Completed", icon: CheckCircle2 },
  { key: "cancelled", field: "cancelled_trips", label: "Cancelled", icon: XCircle },
];

/* top_cards — all-time status donut + Today / This Month */
export default function TripOverviewCard({ data }) {
  const ui = useDashUI();
  const navigate = useNavigate();
  const top = data?.top_cards || {};
  const total = Number(top.total_trips) || 0;
  const rows = ROWS.map((r) => ({ ...r, value: Number(top[r.field]) || 0, color: ui.color("trips", r.key) }));

  const stamp = parseLocal(data?.timestamp) || new Date();
  const todayLabel = stamp.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const monthLabel = stamp.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <DashCard icon={META.icon} title={META.title} subtitle="All-time status, today and this month" to={ROUTES.trips}>
      {/* Donut block and tiles sit side by side when there's room and wrap on a
          narrow card; max widths keep either from stretching on a wide one */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex min-w-0 max-w-[420px] flex-[1_1_300px] items-center gap-3.5">
          <Donut total={total} label="Trips" segments={rows} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {rows.map((r) => (
              <MetricRow
                key={r.key} icon={r.icon} label={r.label} value={r.value} total={total} color={r.color}
                onClick={() => navigate(ROUTES.trips, { state: { status_filter: r.key, trip_scope: "all" } })}
              />
            ))}
          </div>
        </div>
        <div className="grid min-w-0 max-w-[340px] flex-[1_1_240px] grid-cols-2 gap-2.5">
          <AccentStat
            icon={CalendarDays} label="Today" value={top.today_trips} hint={todayLabel}
            onClick={() => navigate(ROUTES.trips, { state: { trip_scope: "today" } })}
          />
          <AccentStat icon={CalendarRange} label="This Month" value={top.month_trips} hint={monthLabel} />
        </div>
      </div>
    </DashCard>
  );
}
