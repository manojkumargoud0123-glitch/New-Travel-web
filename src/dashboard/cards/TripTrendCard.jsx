import React, { useId, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from "recharts";
import { Sigma, Activity, TrendingUp, CalendarDays } from "lucide-react";
import { DashCard, Pill, Empty, useDashUI, acc, parseLocal, localISO } from "../ui.jsx";
import { CARD_META } from "./meta.js";

const META = CARD_META.tripTrend;

const TrendTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-white shadow-xl">
      <p className="text-[11px] font-semibold text-slate-300">
        {p.full}
        {p.isToday && <span className="ml-1.5 rounded bg-white/15 px-1 text-[10px]">Today</span>}
      </p>
      <p className="font-display text-[15px] font-extrabold tabular-nums">
        {p.count.toLocaleString()} {p.count === 1 ? "trip" : "trips"}
      </p>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }) => {
  const ui = useDashUI();
  return (
    <div className={`inline-flex min-w-0 items-center ${ui.sz.chipBox} ${ui.tile}`}>
      <Icon size={ui.sz.chipIconPx} className={`shrink-0 ${acc.text}`} />
      <span className={`whitespace-nowrap ${ui.sz.chipLabel} font-semibold text-slate-400`}>{label}</span>
      <span className={`truncate font-display ${ui.sz.chipNum} font-extrabold tabular-nums text-slate-800 dark:text-white`}>{value}</span>
    </div>
  );
};

/* trip_trend — daily bars with the count printed on top of each bar */
export default function TripTrendCard({ data }) {
  const ui = useDashUI();
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const trend = Array.isArray(data?.trip_trend) ? data.trip_trend : [];
  const todayKey = localISO(parseLocal(data?.timestamp) || new Date());

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

  const total = rows.reduce((s, d) => s + d.count, 0);
  const avg = rows.length ? total / rows.length : 0;
  const peak = rows.reduce((best, d) => (d.count > best.count ? d : best), rows[0] || { count: 0 });
  const today = rows.find((d) => d.isToday);
  const { from, to } = ui.accent;

  const renderLabel = ({ x, y, width, value, index }) => {
    if (x == null || y == null) return null;
    const v = Number(value) || 0;
    const isToday = rows[index]?.isToday;
    const cls =
      v === 0
        ? "fill-slate-300 dark:fill-slate-600"
        : ui.mono
          ? "fill-slate-700 dark:fill-slate-200"
          : "fill-[rgb(var(--acc-600))] dark:fill-[rgb(var(--acc-400))]";
    return (
      <text
        x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle"
        fontSize={ui.sz.barLabelPx + (isToday ? 1 : 0)} fontWeight={800} className={cls}
      >
        {v.toLocaleString()}
      </text>
    );
  };

  return (
    <DashCard icon={META.icon} title={META.title} subtitle="Trips per day" right={rows.length > 0 && <Pill>Last {rows.length} days</Pill>}>
      {rows.length === 0 ? (
        <Empty icon={META.icon} text="No trend data" />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Stat icon={Sigma} label="Total" value={total.toLocaleString()} />
            <Stat icon={Activity} label="Avg/day" value={avg.toFixed(1)} />
            <Stat icon={TrendingUp} label="Peak" value={peak.count > 0 ? `${peak.label} · ${peak.count.toLocaleString()}` : "—"} />
            <Stat icon={CalendarDays} label="Today" value={(today?.count ?? 0).toLocaleString()} />
          </div>
          <div className={`relative w-full ${ui.sz.chartFixed}`}>
            <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 20, right: 2, left: 2, bottom: 0 }} barCategoryGap="22%">
                <defs>
                  <linearGradient id={`${gid}-bar`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={from[400]} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={from[600]} stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id={`${gid}-today`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={from[400]} stopOpacity={1} />
                    <stop offset="100%" stopColor={to[600]} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label" axisLine={false} tickLine={false} minTickGap={6} tickMargin={6}
                  tick={{ fontSize: ui.sz.axisPx, fill: "#94a3b8", fontWeight: 600 }}
                />
                <YAxis hide domain={[0, Math.max(1, peak.count)]} />
                <Tooltip cursor={{ fill: "rgba(148,163,184,0.10)", radius: 8 }} content={<TrendTooltip />} />
                <Bar
                  dataKey="count" radius={[6, 6, 2, 2]} maxBarSize={32} isAnimationActive={ui.anim}
                  background={{ fill: "rgba(148,163,184,0.08)", radius: 6 }}
                >
                  {rows.map((d) => (
                    <Cell key={d.date} fill={d.isToday ? `url(#${gid}-today)` : `url(#${gid}-bar)`} />
                  ))}
                  <LabelList dataKey="count" content={renderLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </DashCard>
  );
}
