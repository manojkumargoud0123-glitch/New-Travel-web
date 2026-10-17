import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Navigation, XCircle, Circle } from "lucide-react";
import { prettyLabel, parseLocal } from "../dashboard/ui.jsx";

export const EASE = [0.22, 1, 0.36, 1];

/* ===== Trip statuses =====
   Order is the stacked-bar order (see dashboard2.css). `color` names the
   token; toneVars() points --s at it so one class list fits every status. */
export const STATUSES = [
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "--d2-completed", field: "completed_trips" },
  { key: "active", label: "In progress", icon: Navigation, color: "--d2-active", field: "active_trips" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "--d2-cancelled", field: "cancelled_trips" },
];

export const statusOf = (raw) => {
  const key = String(raw || "").toLowerCase();
  return (
    STATUSES.find((s) => s.key === key) || {
      key, label: prettyLabel(key) || "Unknown", icon: Circle, color: "--d2-other",
    }
  );
};

export const toneVars = (color) => ({ "--s": `var(${color})` });

export const tone = {
  dot: "bg-[rgb(var(--s))]",
  soft: "bg-[rgb(var(--s)/0.12)]",
  icon: "text-[rgb(var(--s))]",
};

/* ===== Numbers ===== */
export const fmtNum = (n) => (Number(n) || 0).toLocaleString("en-IN");

export const fmtPct = (p) => (p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`);

// Axis ticks: 950 / 1.2K / 15K
export const compact = (n) => {
  const v = Number(n) || 0;
  return Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}K` : String(v);
};

/* "12m ago" relative to the server's clock (the response timestamp), so a
   skewed browser clock can't make trips look like they're from the future */
export const ago = (s, now) => {
  const d = parseLocal(s);
  if (!d || !now) return "";
  const min = Math.floor((now - d) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/* Count-up number. Animates from the previous value on refresh. */
export function Num({ value, format = fmtNum }) {
  const reduce = useReducedMotion();
  const n = Number(value) || 0;
  const mv = useMotionValue(0);
  const [text, setText] = useState(() => format(reduce ? n : 0));
  useEffect(() => {
    if (reduce) {
      mv.set(n);
      setText(format(n));
      return undefined;
    }
    const controls = animate(mv, n, { duration: 1, ease: EASE, onUpdate: (v) => setText(format(v)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, reduce, mv]);
  return <>{text}</>;
}

/* ===== Panel shell ===== */
const PANEL =
  "rounded-[20px] border border-slate-200/80 bg-[rgb(var(--d2-surface))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-18px_rgba(15,23,42,0.14)] dark:border-white/[0.07] dark:shadow-none";

export function Panel({ title, subtitle, right, to, toLabel, children, className = "" }) {
  return (
    <section className={`flex h-full min-w-0 flex-col p-4 sm:p-5 ${PANEL} ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15.5px] font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12.5px] font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          {to && (
            <Link
              to={to}
              aria-label={toLabel || `Open ${title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
            >
              <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export const Badge = ({ children }) => (
  <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
    {children}
  </span>
);

/* ===== Loading skeleton (first load only — refreshes keep the page) ===== */
const Bone = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-white/[0.06] ${className}`} />
);

const PanelBones = ({ className = "", rows = 3 }) => (
  <div className={`flex flex-col gap-3.5 p-5 ${PANEL} ${className}`}>
    <Bone className="h-4 w-36" />
    <Bone className="h-3 w-52" />
    {Array.from({ length: rows }, (_, i) => <Bone key={i} className="h-10 w-full" />)}
  </div>
);

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="grid gap-5 rounded-[24px] bg-[#0d0f22] p-5 ring-1 ring-white/10 sm:p-6 lg:grid-cols-[5fr_7fr]">
        <div className="flex flex-col gap-3.5">
          <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-6 w-60 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-14 w-36 animate-pulse rounded-xl bg-white/10" />
          <div className="mt-3 h-16 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
        </div>
        <div className="h-[250px] animate-pulse rounded-[18px] bg-white/[0.05]" />
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
        <PanelBones className="lg:col-span-7" />
        <PanelBones className="lg:col-span-5" />
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
        <PanelBones className="lg:col-span-8" rows={5} />
        <PanelBones className="lg:col-span-4" rows={4} />
      </div>
    </div>
  );
}
