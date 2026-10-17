import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "../dashboard/ui.jsx";
import { Panel, Badge, Num, STATUSES, toneVars, tone, fmtNum, fmtPct, EASE } from "./kit.jsx";

const OTHER = { key: "other", label: "Other", color: "--d2-other" };

/* One 100% bar of every trip by status. Segments are separated by a 2px gap,
   carry their own hover/focus tooltip, and open Trip Details filtered. */
export default function TripOutcomes({ data }) {
  const navigate = useNavigate();
  const top = data?.top_cards || {};
  const items = STATUSES.map((s) => ({ ...s, value: Number(top[s.field]) || 0 }));
  const known = items.reduce((sum, s) => sum + s.value, 0);
  const total = Math.max(Number(top.total_trips) || 0, known);
  // any statuses the API counts in the total but doesn't break out
  const other = total - known;
  const pct = (v) => (total > 0 ? (v / total) * 100 : 0);
  const segments = [...items, ...(other > 0 ? [{ ...OTHER, value: other }] : [])].filter((s) => s.value > 0);
  const completed = items.find((s) => s.key === "completed");
  const open = (key) => navigate(ROUTES.trips, { state: { status_filter: key, trip_scope: "all" } });

  return (
    <Panel
      title="Trip outcomes" subtitle={`All ${fmtNum(total)} trips by status`}
      right={total > 0 && <Badge>{fmtPct(pct(completed.value))} completed</Badge>}
    >
      <div className="flex flex-1 flex-col justify-center gap-5">
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, ease: EASE }}
          style={{ originX: 0 }} className="flex h-3.5 w-full gap-[2px]"
        >
          {segments.length === 0 ? (
            <div className="h-full w-full rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          ) : (
            segments.map((s, i) => {
              const clickable = s.key !== OTHER.key;
              const Tag = clickable ? "button" : "div";
              // end tooltips hug the bar's edge so they never stick out of the page
              const tipAt =
                i === segments.length - 1 && i > 0 ? "right-0" : i === 0 && segments.length > 1 ? "left-0" : "left-1/2 -translate-x-1/2";
              return (
                <Tag
                  key={s.key}
                  type={clickable ? "button" : undefined}
                  onClick={clickable ? () => open(s.key) : undefined}
                  tabIndex={clickable ? undefined : 0}
                  aria-label={`${s.label}: ${fmtNum(s.value)} trips, ${fmtPct(pct(s.value))}`}
                  style={{ ...toneVars(s.color), flexGrow: s.value, flexBasis: 0 }}
                  className={`group relative h-full min-w-[6px] outline-none ${tone.dot} ${
                    i === 0 ? "rounded-l-full" : "rounded-l-[3px]"
                  } ${i === segments.length - 1 ? "rounded-r-full" : "rounded-r-[3px]"} transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[rgb(var(--d2-surface))] before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']`}
                >
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute bottom-full z-10 mb-3 ${tipAt} whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-left opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-slate-700`}
                  >
                    <span className="block text-[13px] font-bold text-white">{fmtNum(s.value)} · {fmtPct(pct(s.value))}</span>
                    <span className="block text-[11px] font-medium text-white/60">{s.label}</span>
                  </span>
                </Tag>
              );
            })
          )}
        </motion.div>

        {/* legend + figures, same order as the bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {items.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key} type="button" onClick={() => open(s.key)} style={toneVars(s.color)}
                className="group flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-slate-200/80 p-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.03] sm:p-3"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.soft} ${tone.icon}`}>
                  <Icon size={15} />
                </span>
                <span className="w-full min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-slate-500 dark:text-slate-400 sm:text-[12.5px]">{s.label}</span>
                  <span className="block truncate text-[18px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-[22px]">
                    <Num value={s.value} />
                  </span>
                  <span className="block truncate text-[11.5px] font-medium text-slate-400 dark:text-slate-500 sm:text-[12px]">{fmtPct(pct(s.value))} of trips</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
