import React, { useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer,
} from "recharts";
import { RefreshCw, LayoutGrid, ArrowRight, AreaChart as AreaIcon, Table2, CalendarDays } from "lucide-react";
import { ROUTES, parseLocal, localISO, fmtTime } from "../dashboard/ui.jsx";
import { Num, fmtNum, compact } from "./kit.jsx";

/* The hero is dark in both themes, so its chart uses the dark-surface steps
   and every dot gets a 2px ring in this colour. */
const HERO_BG = "#0d0f22";
const AXIS_INK = "rgba(255,255,255,0.45)";
const SERIES = "var(--primary-400)";

const HERO_STYLE = {
  backgroundColor: HERO_BG,
  backgroundImage: [
    "radial-gradient(900px 420px at 0% 0%, color-mix(in srgb, var(--primary-600) 40%, transparent), transparent 62%)",
    "radial-gradient(700px 380px at 100% 115%, color-mix(in srgb, var(--secondary-500) 22%, transparent), transparent 60%)",
  ].join(","),
};

// faint grid that fades out from the top-left glow
const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
  backgroundSize: "36px 36px",
  maskImage: "radial-gradient(ellipse 80% 70% at 20% 0%, black, transparent 75%)",
  WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 20% 0%, black, transparent 75%)",
};

const greetingFor = (h) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
const dayBefore = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);

const TrendTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 shadow-2xl">
      <p className="flex items-center gap-2 text-[15px] font-bold text-white">
        <span className="h-0.5 w-3 rounded-full bg-[var(--primary-400)]" />
        {fmtNum(p.count)} {p.count === 1 ? "trip" : "trips"}
      </p>
      <p className="mt-0.5 text-[11.5px] font-medium text-white/55">
        {p.full}{p.isToday ? " · today so far" : ""}
      </p>
    </div>
  );
};

function TrendChart({ rows, peak, today }) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const labels = useMemo(() => Object.fromEntries(rows.map((r) => [r.date, r.label])), [rows]);
  const todayIdx = today ? rows.indexOf(today) : -1;
  // label the peak too, unless it is today or right next to it (labels would collide)
  const showPeak = peak.count > 0 && Math.abs(rows.indexOf(peak) - todayIdx) > 1;
  const dot = { r: 5, stroke: HERO_BG, strokeWidth: 2 };

  return (
    // fixed height includes the x-axis band, so nothing scrolls inside the card
    <div className="relative h-[200px] w-full">
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 26, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity={0.3} />
                <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
            <XAxis
              dataKey="date" tickFormatter={(d) => labels[d] ?? d}
              axisLine={false} tickLine={false} tickMargin={8} minTickGap={18} interval="preserveStartEnd"
              tick={{ fill: AXIS_INK, fontSize: 11.5, fontWeight: 600 }}
            />
            <YAxis
              width={36} axisLine={false} tickLine={false} allowDecimals={false} tickCount={4}
              domain={[0, "auto"]} tickFormatter={compact}
              tick={{ fill: AXIS_INK, fontSize: 11.5, fontWeight: 600 }}
            />
            <Tooltip cursor={{ stroke: "rgba(255,255,255,0.28)", strokeWidth: 1 }} content={<TrendTip />} />
            <Area
              type="monotone" dataKey="count" stroke={SERIES} strokeWidth={2} fill={`url(#${gid}-fill)`}
              dot={false} activeDot={{ ...dot, fill: SERIES }} isAnimationActive={!reduce}
            />
            {showPeak && (
              <ReferenceDot
                x={peak.date} y={peak.count} {...dot} r={4} fill={SERIES}
                label={{ value: fmtNum(peak.count), position: "top", offset: 10, fill: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700 }}
              />
            )}
            {today && (
              <ReferenceDot
                x={today.date} y={today.count} {...dot} fill="var(--primary-300)"
                label={{ value: fmtNum(today.count), position: "top", offset: 10, fill: "#fff", fontSize: 12.5, fontWeight: 800 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// The chart's table twin — every value readable without hovering
const TrendTable = ({ rows }) => (
  <div className="h-[200px] overflow-y-auto rounded-xl ring-1 ring-white/10">
    <table className="w-full text-left text-[13px]">
      <thead className="sticky top-0 bg-[#171a3a] text-[11px] font-bold uppercase tracking-wider text-white/50">
        <tr>
          <th className="px-3.5 py-2">Date</th>
          <th className="px-3.5 py-2 text-right">Trips</th>
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((r) => (
          <tr key={r.date} className="border-t border-white/[0.06]">
            <td className="px-3.5 py-2 font-medium text-white/75">
              {r.full}
              {r.isToday && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10.5px] font-bold text-white">Today</span>}
            </td>
            <td className="px-3.5 py-2 text-right font-semibold tabular-nums text-white">{fmtNum(r.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const VIEWS = [
  { key: "chart", label: "Chart", icon: AreaIcon },
  { key: "table", label: "Table", icon: Table2 },
];

const ViewToggle = ({ value, onChange }) => (
  <div className="inline-flex shrink-0 rounded-full bg-white/[0.06] p-0.5 ring-1 ring-white/10">
    {VIEWS.map(({ key, label, icon: Icon }) => (
      <button
        key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
          value === key ? "bg-white text-slate-900" : "text-white/60 hover:text-white"
        }`}
      >
        <Icon size={13} /> {label}
      </button>
    ))}
  </div>
);

const Figure = ({ label, value, sub, className = "" }) => (
  <div className={`min-w-0 bg-white/[0.04] px-3.5 py-2.5 ${className}`}>
    <p className="text-[12px] font-semibold text-white/55">{label}</p>
    <p className="truncate text-[22px] font-bold leading-tight tracking-tight text-white"><Num value={value} /></p>
    <p className="truncate text-[11.5px] font-medium text-white/40">{sub}</p>
  </div>
);

const pill =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold ring-1 ring-white/15 transition-colors";

/* Greeting, today's headline number and the daily trend */
export default function Hero({ data, user, refreshing, onRefresh }) {
  const navigate = useNavigate();
  const [view, setView] = useState("chart");
  const top = data?.top_cards || {};
  const stamp = parseLocal(data?.timestamp);
  const serverDay = stamp || new Date();
  const todayKey = localISO(serverDay);
  const yesterdayKey = localISO(dayBefore(serverDay));

  const trend = Array.isArray(data?.trip_trend) ? data.trip_trend : [];
  const rows = useMemo(
    () =>
      trend.map((t) => {
        const d = parseLocal(t.date);
        return {
          date: String(t.date),
          count: Number(t.count) || 0,
          label: d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : String(t.date),
          full: d ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : String(t.date),
          isToday: String(t.date) === todayKey,
        };
      }),
    [trend, todayKey]
  );

  const today = rows.find((r) => r.isToday);
  const yesterday = rows.find((r) => r.date === yesterdayKey);
  const past = rows.filter((r) => !r.isToday);
  const avg = past.length ? past.reduce((s, r) => s + r.count, 0) / past.length : null;
  const peak = rows.reduce((best, r) => (r.count > best.count ? r : best), rows[0] || { count: 0 });

  const now = new Date();
  const firstName = String(user?.name || user?.username || "").trim().split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const monthLabel = serverDay.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <section style={HERO_STYLE} className="relative overflow-hidden rounded-[24px] text-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.55)] ring-1 ring-white/10">
      <div className="pointer-events-none absolute inset-0" style={GRID_STYLE} />

      <div className="relative p-4 sm:p-5 lg:p-6">
        {/* top bar */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/55">
              <CalendarDays size={13} /> {dateLabel}
            </p>
            <h1 className="mt-0.5 truncate text-[20px] font-extrabold tracking-tight sm:text-[23px]">
              {greetingFor(now.getHours())}{firstName ? `, ${firstName}` : ""}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${pill} bg-white/[0.05] font-medium text-white/70 ring-white/10`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live · {fmtTime(stamp)}
            </span>
            <button onClick={() => onRefresh()} disabled={refreshing} className={`${pill} bg-white/10 hover:bg-white/15 disabled:opacity-60`}>
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
            <Link to="/dashboard" className={`${pill} bg-white/10 hover:bg-white/15`}>
              <LayoutGrid size={13} /> Classic view
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
          {/* headline */}
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/50">Trips today</p>
              <p className="mt-1.5 bg-gradient-to-b from-white to-primary-200 bg-clip-text text-[52px] font-extrabold leading-[0.95] tracking-[-0.03em] text-transparent sm:text-[62px]">
                <Num value={top.today_trips} />
              </p>
              {(yesterday || avg != null) && (
                <p className="mt-2 text-[13px] font-medium text-white/55">
                  {yesterday && <>Yesterday <span className="font-bold text-white">{fmtNum(yesterday.count)}</span></>}
                  {yesterday && avg != null && <span className="mx-2 text-white/25">·</span>}
                  {avg != null && <>{past.length}-day average <span className="font-bold text-white">{avg.toFixed(1)}</span></>}
                </p>
              )}
            </div>

            <div>
              <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl ring-1 ring-white/10">
                <Figure label="This month" value={top.month_trips} sub={monthLabel} />
                <Figure label="All time" value={top.total_trips} sub="Every trip, any status" className="border-l border-white/10" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(ROUTES.trips, { state: { trip_scope: "today" } })}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-bold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-primary-50 active:scale-[0.98]"
                >
                  Today's trips <ArrowRight size={15} />
                </button>
                <Link to={ROUTES.trips} className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-white/75 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white">
                  All trips
                </Link>
              </div>
            </div>
          </div>

          {/* trend */}
          <div className="flex min-w-0 flex-col rounded-[18px] border border-white/10 bg-white/[0.035] p-3.5 sm:p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-white">Daily trips</p>
                <p className="truncate text-[12px] font-medium text-white/50">
                  {rows.length > 0
                    ? <>Last {rows.length} days{peak.count > 0 && <span className="hidden sm:inline"> · peak {fmtNum(peak.count)} on {peak.label}</span>}</>
                    : "No history yet"}
                </p>
              </div>
              {rows.length > 0 && <ViewToggle value={view} onChange={setView} />}
            </div>
            {rows.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-white/15 text-[13px] font-medium text-white/45">
                Trip history will appear here
              </div>
            ) : view === "chart" ? (
              <TrendChart rows={rows} peak={peak} today={today} />
            ) : (
              <TrendTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
