import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Clock, RefreshCw, AlertTriangle, SlidersHorizontal, LayoutGrid } from "lucide-react";
import { useAuth } from "../config/AuthContext";
import useDashboardData from "../dashboard/useDashboardData";
import { CARDS } from "../dashboard/cards";
import {
  DashUIContext, buildUI, acc, fmtTime, parseLocal, SkeletonCard, useMediaQuery,
} from "../dashboard/ui";
import CardGrid from "../dashboard/CardGrid";
import { WIDTH_UNITS } from "../dashboard/layout";
import { accentVars } from "../dashboard/palettes";
import { loadSettings, saveSettings, defaultSettings, sanitize } from "../dashboard/settings";
import CustomizePanel from "../dashboard/CustomizePanel";

// Width in grid units: S / M / L / Full when the user picked one, else the card's designed width
const unitsFor = (id, widths) => WIDTH_UNITS[widths[id]] ?? CARDS[id].auto;

const Dashboard = () => {
  const { user } = useAuth();
  const userKey = user?.username || (user?.id != null ? String(user.id) : "default");
  const { data, loading, refreshing, error, reload } = useDashboardData();

  // `saved` is what's stored; `draft` is the live preview while Customize is open
  const [saved, setSaved] = useState(() => loadSettings(userKey));
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    setSaved(loadSettings(userKey));
    setDraft(null);
  }, [userKey]);

  const settings = draft || saved;

  // Desktop: Recent Trips matches the height of the card beside it and
  // scrolls inside; on phones it simply lists every trip
  const contained = useMediaQuery("(min-width: 1024px)");

  const ui = useMemo(
    () => ({ ...buildUI(settings.appearance), contained }),
    [settings.appearance, contained]
  );
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);

  const openCustomize = () => setDraft(saved);
  const cancel = useCallback(() => setDraft(null), []);
  const reset = () => setDraft(defaultSettings());
  const save = () => {
    const clean = sanitize(draft);
    saveSettings(userKey, clean); // if storage is blocked it still applies for this visit
    setSaved(clean);
    setDraft(null);
  };

  const stamp = parseLocal(data?.timestamp);
  const customizing = !!draft;

  return (
    <DashUIContext.Provider value={ui}>
      <MotionConfig reducedMotion={ui.anim ? "user" : "always"}>
        <div
          style={accentVars(settings.appearance.accent)}
          className={`relative mx-auto max-w-[1440px] px-3 py-4 transition-[padding] duration-300 sm:px-5 lg:px-6 ${
            customizing ? "xl:pr-[404px]" : ""
          }`}
        >
          {/* Ambient background */}
          <div className="pointer-events-none fixed -left-60 top-0 h-[500px] w-[500px] rounded-full bg-[rgb(var(--acc-500)/0.05)] blur-[160px] dark:bg-[rgb(var(--acc-500)/0.08)]" />
          <div className="pointer-events-none fixed right-0 top-32 h-[400px] w-[400px] rounded-full bg-[rgb(var(--acc2-500)/0.04)] blur-[150px] dark:bg-[rgb(var(--acc2-500)/0.07)]" />

          {/* ── HEADER ── */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-baseline gap-3">
              <h1 className="font-display text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-[22px]">
                Fleet <span className={acc.gradText}>Command Center</span>
              </h1>
              <p className="hidden truncate text-[12px] font-medium text-slate-400 md:block">
                Trips, fleet and geofences at a glance
              </p>
            </div>

            <div className={`flex items-center gap-2.5 px-3 py-1.5 ${ui.card}`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                <Clock size={13} className="text-slate-400" />
                Updated <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtTime(stamp)}</span>
              </span>
              <span className="h-4 w-px bg-slate-200 dark:bg-white/[0.08]" />
              <button
                onClick={() => reload()}
                disabled={refreshing}
                className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11.5px] font-bold transition-colors disabled:opacity-60 ${ui.chip} ${acc.border} ${acc.soft} ${acc.text} ${acc.softHover}`}
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-rose-200/70 bg-rose-50/80 px-4 py-2.5 dark:border-rose-500/20 dark:bg-rose-500/10">
              <AlertTriangle size={15} className="shrink-0 text-rose-500" />
              <p className="flex-1 text-[12.5px] font-medium text-rose-600 dark:text-rose-300">
                {error}{data ? " Showing the last loaded data." : ""}
              </p>
              <button
                onClick={() => reload()}
                className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── CARDS ── */}
          {settings.order.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 px-6 py-16 text-center dark:border-white/15">
              <LayoutGrid size={26} className="text-slate-400" />
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                All cards are hidden. Open Customize to add them back.
              </p>
            </div>
          ) : (data || loading) ? (
            // While customizing, cards don't navigate on click — the page still scrolls
            <CardGrid
              gap={ui.gap}
              anim={ui.anim}
              className={customizing ? "pointer-events-none select-none" : ""}
              items={settings.order.map((id) => {
                const { Component } = CARDS[id];
                return {
                  id,
                  units: unitsFor(id, settings.widths),
                  node: data ? <Component data={data} /> : <SkeletonCard />,
                };
              })}
            />
          ) : null}

          {/* Customize */}
          {!customizing && (
            <button
              onClick={openCustomize}
              className={`fixed bottom-4 right-4 z-[45] inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold text-white shadow-lg shadow-black/25 ring-1 ring-white/20 transition hover:brightness-110 active:scale-95 ${acc.grad}`}
            >
              <SlidersHorizontal size={14} />
              Customize
            </button>
          )}

          <CustomizePanel
            open={customizing}
            draft={draft}
            setDraft={setDraft}
            dirty={dirty}
            onSave={save}
            onCancel={cancel}
            onReset={reset}
          />
        </div>
      </MotionConfig>
    </DashUIContext.Provider>
  );
};

export default Dashboard;
