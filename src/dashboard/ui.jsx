import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { ArrowUpRight, Inbox } from "lucide-react";
import { COLORS, colorVars, accentColors } from "./palettes.js";
import { DEFAULT_COLORS } from "./settings.js";

export const EASE = [0.22, 1, 0.36, 1];

export const ROUTES = {
  fleet: "/masters/vehicle-data",
  trips: "/trips/trip-details",
  geofences: "/masters/geofences",
};

/* ===== Colour classes =====
   `tint` reads the --c-* variables set by colorVars() on an ancestor, `acc`
   reads the --acc-* accent variables set on the dashboard root. */
export const tint = {
  text: "text-[rgb(var(--c-600))] dark:text-[rgb(var(--c-400))]",
  soft: "bg-[rgb(var(--c-500)/0.08)]",
  border: "border-[rgb(var(--c-500)/0.22)]",
  grad: "bg-gradient-to-br from-[rgb(var(--c-400))] to-[rgb(var(--c-600))]",
  bar: "bg-gradient-to-r from-[rgb(var(--c-400))] to-[rgb(var(--c-600))]",
  dot: "bg-[rgb(var(--c-500))]",
};

export const acc = {
  text: "text-[rgb(var(--acc-600))] dark:text-[rgb(var(--acc-400))]",
  soft: "bg-[rgb(var(--acc-500)/0.08)]",
  softHover: "hover:bg-[rgb(var(--acc-500)/0.16)]",
  border: "border-[rgb(var(--acc-500)/0.22)]",
  grad: "bg-gradient-to-br from-[rgb(var(--acc-500))] to-[rgb(var(--acc2-600))]",
  bar: "bg-gradient-to-r from-[rgb(var(--acc-500))] to-[rgb(var(--acc2-500))]",
  gradText:
    "bg-gradient-to-r from-[rgb(var(--acc-600))] to-[rgb(var(--acc2-600))] dark:from-[rgb(var(--acc-400))] dark:to-[rgb(var(--acc2-400))] bg-clip-text text-transparent",
  ring: "ring-[rgb(var(--acc-500))]",
};

/* ===== Appearance → class names ===== */
const CARD_STYLE = {
  solid:
    "border border-slate-200 bg-white shadow-sm shadow-slate-200/60 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/20",
  glass:
    "border border-white/70 bg-white/70 shadow-lg shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-900/55 dark:shadow-black/30 dark:ring-0",
  outlined:
    "border-2 border-slate-300 bg-transparent dark:border-white/[0.14]",
};

const CORNERS = {
  sharp: { card: "rounded-md", tile: "rounded", chip: "rounded" },
  default: { card: "rounded-2xl", tile: "rounded-xl", chip: "rounded-lg" },
  round: { card: "rounded-[26px]", tile: "rounded-2xl", chip: "rounded-xl" },
};

/* Card sizes in one place. The Spacing setting picks gap / padding. */
const SIZE = {
  gap: { compact: 16, comfortable: 20 },
  pad: { compact: "p-[18px]", comfortable: "p-6" },
  head: { compact: "mb-3.5", comfortable: "mb-4" },
  headIcon: "h-10 w-10", headIconPx: 18, title: "text-[15.5px]", subtitle: "text-[12px]",
  donut: 128, donutNum: "text-[28px]", donutLabel: "text-[10.5px]",
  row: "gap-3 py-[7px]", rowIcon: "h-7 w-7", rowIconPx: 14, rowLabel: "text-[14px]", rowPct: "text-[11.5px]", rowNum: "text-[19px]",
  stat: "px-4 py-3.5", statIcon: "h-9 w-9", statIconPx: 16, statLabel: "text-[11px]", statNum: "text-[29px]", statHint: "text-[12.5px]",
  geoTile: "px-3.5 py-3", geoNum: "text-[24px]",
  chipBox: "gap-2 px-3.5 py-2", chipIconPx: 14, chipLabel: "text-[12.5px]", chipNum: "text-[14.5px]",
  axisPx: 12, barLabelPx: 13, chartFixed: "h-[240px]",
  cell: "px-3.5 py-3", cellHead: "px-3.5 py-2.5 text-[11px]", cellMain: "text-[13.5px]", cellSub: "text-[11.5px]",
  // Recent Trips' scrolling list on desktop — sized so the card matches Trip Trend beside it
  listMin: "min-h-[280px]",
};

const TILE = "border border-slate-200/80 bg-slate-50/70 dark:border-white/[0.06] dark:bg-white/[0.03]";

export function buildUI(appearance) {
  const corners = CORNERS[appearance.corners] || CORNERS.default;
  const sz = SIZE;
  const sp = appearance.spacing === "comfortable" ? "comfortable" : "compact";
  const mono = appearance.numbers === "mono";
  return {
    anim: appearance.animations !== false,
    mono,
    corners,
    sz,
    gap: sz.gap[sp],
    spacing: { card: sz.pad[sp], head: sz.head[sp] },
    card: `${CARD_STYLE[appearance.cardStyle] || CARD_STYLE.glass} ${corners.card}`,
    tile: `${TILE} ${corners.tile}`,
    chip: corners.chip,
    accent: accentColors(appearance.accent),
    color: (group, key) => appearance.colors?.[group]?.[key] || DEFAULT_COLORS[group]?.[key] || "sky",
    // number colour for a value tied to a status/accent colour
    num: (cls = tint.text) => (mono ? "text-slate-900 dark:text-white" : cls),
  };
}

export const DashUIContext = createContext(buildUI({}));
export const useDashUI = () => useContext(DashUIContext);

/* ===== Small helpers ===== */
export const prettyLabel = (k) =>
  String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const pad = (n) => String(n).padStart(2, "0");
export const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* The API sends naive server-local timestamps ("2026-10-16T15:34:16.504183")
   and plain dates ("2026-10-02"). Parse both as local time — new Date() would
   read a bare date as UTC midnight and shift it a day in some time zones. */
export const parseLocal = (s) => {
  if (!s) return null;
  const str = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(str.replace(/(\.\d{3})\d+/, "$1"));
  return Number.isNaN(d.getTime()) ? null : d;
};

export const fmtDateTime = (s) => {
  const d = parseLocal(s);
  return d
    ? d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })
    : "—";
};

export const fmtTime = (d) =>
  d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

/* Click + keyboard handlers for a nested clickable element inside a clickable card */
export const pressable = (fn) =>
  fn
    ? {
        role: "button",
        tabIndex: 0,
        onClick: (e) => { e.stopPropagation(); fn(); },
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); fn(); }
        },
      }
    : {};

export function useMediaQuery(query) {
  const get = () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setMatch(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [query]);
  return match;
}


/* Width of an element, kept current with a ResizeObserver — lets a card pick
   its layout from its own width (cards can be resized), not the viewport's. */
export function useElementWidth(ref, deps = []) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]); // deps: re-attach when the measured element is swapped
  return width;
}

/* ===== Animated count-up ===== */
export const Counter = ({ value }) => {
  const { anim } = useDashUI();
  const n = Number(value) || 0;
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => (anim ? "0" : n.toLocaleString()));
  useEffect(() => {
    if (!anim) {
      mv.set(n);
      setDisplay(n.toLocaleString());
      return undefined;
    }
    const controls = animate(mv, n, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => controls.stop();
  }, [n, anim, mv]);
  return <span>{display}</span>;
};

/* ===== Card shell ===== */
export function DashCard({ icon: Icon, title, subtitle, right, to, children }) {
  const ui = useDashUI();
  const navigate = useNavigate();
  const go = to ? () => navigate(to) : null;

  return (
    <section
      onClick={go || undefined}
      role={go ? "button" : undefined}
      tabIndex={go ? 0 : undefined}
      onKeyDown={go ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } } : undefined}
      className={`group relative flex h-full flex-col overflow-hidden ${ui.card} ${ui.spacing.card} ${
        go ? "cursor-pointer transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg" : ""
      }`}
    >
      {/* soft accent glow in the corner */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[rgb(var(--acc-500)/0.07)] blur-3xl" />

      <header className={`relative flex items-center justify-between gap-3 ${ui.spacing.head}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex ${ui.sz.headIcon} shrink-0 items-center justify-center ${ui.chip} ${acc.grad} text-white shadow-md shadow-[rgb(var(--acc-500)/0.3)]`}>
            <Icon size={ui.sz.headIconPx} />
          </span>
          <div className="min-w-0">
            <h2 className={`truncate font-display ${ui.sz.title} font-bold tracking-tight text-slate-800 dark:text-white`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`truncate ${ui.sz.subtitle} font-medium text-slate-400 dark:text-slate-500`}>{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          {go && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-slate-100 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:bg-white/10 dark:group-hover:text-slate-200">
              <ArrowUpRight size={15} />
            </span>
          )}
        </div>
      </header>
      {/* body is centred vertically so a card sharing a row with a taller one still looks balanced */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-center">{children}</div>
    </section>
  );
}

export const Pill = ({ children }) => {
  const ui = useDashUI();
  return (
    <span className={`whitespace-nowrap border px-2 py-0.5 text-[10.5px] font-bold ${ui.chip} ${acc.border} ${acc.soft} ${acc.text}`}>
      {children}
    </span>
  );
};

export const Empty = ({ icon: Icon = Inbox, text }) => (
  <div className="flex flex-1 flex-col items-center justify-center py-6 text-center text-slate-400">
    <Icon size={24} className="mb-2" />
    <span className="text-[13px] font-medium">{text}</span>
  </div>
);

export function SkeletonCard() {
  const ui = useDashUI();
  return (
    <div className={`h-full min-h-[160px] ${ui.card} ${ui.spacing.card}`}>
      <div className="flex animate-pulse flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-7 w-7 ${ui.chip} bg-slate-200 dark:bg-white/10`} />
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-3 w-3/5 rounded bg-slate-100 dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}

/* ===== Donut =====
   segments: [{ label, value, color }] where color is a COLORS key. */
const EMPTY_RING = "rgba(148,163,184,0.18)";

export function Donut({ total, label, segments, size: sizeProp }) {
  const ui = useDashUI();
  const size = sizeProp ?? ui.sz.donut;
  const filled = segments.filter((s) => s.value > 0);
  const empty = filled.length === 0;
  const ring = empty
    ? [{ name: "empty", value: 1, fill: EMPTY_RING }]
    : filled.map((s) => ({ name: s.label, value: s.value, fill: (COLORS[s.color] || COLORS.sky)[500] }));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* fixed size, so no ResponsiveContainer measuring */}
      <PieChart width={size} height={size}>
        <Pie
          data={ring} dataKey="value" nameKey="name"
          innerRadius={size * 0.36} outerRadius={size * 0.48}
          paddingAngle={ring.length > 1 ? 3 : 0} cornerRadius={ring.length > 1 ? 4 : 0}
          stroke="none" startAngle={90} endAngle={-270} isAnimationActive={ui.anim}
        >
          {ring.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        {!empty && (
          <Tooltip
            contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 12, padding: "5px 10px" }}
            itemStyle={{ color: "#fff" }}
          />
        )}
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display ${ui.sz.donutNum} font-black leading-none tabular-nums text-slate-900 dark:text-white`}>
          <Counter value={total} />
        </span>
        <span className={`mt-0.5 ${ui.sz.donutLabel} font-bold uppercase tracking-widest text-slate-400`}>{label}</span>
      </div>
    </div>
  );
}

/* ===== Breakdown row: label + count on top, bar + % underneath =====
   (the % sits beside the bar so long labels like "Disconnected" keep room) */
export function MetricRow({ icon: Icon, label, value, total, color, onClick }) {
  const ui = useDashUI();
  const v = Number(value) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((v / total) * 100)) : 0;

  return (
    <div
      style={colorVars(color)}
      {...pressable(onClick)}
      className={`flex items-center ${ui.sz.row} ${ui.chip} px-1.5 transition-colors ${
        onClick ? "cursor-pointer hover:bg-slate-100/80 dark:hover:bg-white/[0.04]" : ""
      }`}
    >
      <span className={`flex ${ui.sz.rowIcon} shrink-0 items-center justify-center ${ui.chip} ${tint.grad} text-white shadow-sm`}>
        <Icon size={ui.sz.rowIconPx} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`min-w-0 flex-1 truncate ${ui.sz.rowLabel} font-semibold text-slate-600 dark:text-slate-300`}>{label}</span>
          <span className={`min-w-[1.5rem] shrink-0 text-right font-display ${ui.sz.rowNum} font-extrabold leading-none tabular-nums ${ui.num()}`}>
            <Counter value={v} />
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <motion.div
              initial={ui.anim ? { width: 0 } : false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: EASE }}
              className={`h-full rounded-full ${tint.bar}`}
            />
          </div>
          <span className={`w-8 shrink-0 text-right ${ui.sz.rowPct} font-bold leading-none tabular-nums text-slate-400`}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

/* ===== Accent stat tile (Today / This Month) ===== */
export function AccentStat({ icon: Icon, label, value, hint, onClick }) {
  const ui = useDashUI();
  return (
    <div
      {...pressable(onClick)}
      className={`group/stat relative min-w-0 overflow-hidden border ${ui.sz.stat} ${ui.corners.tile} ${acc.border} ${acc.soft} ${
        onClick ? `cursor-pointer transition-colors ${acc.softHover}` : ""
      }`}
    >
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-[rgb(var(--acc-500)/0.14)] blur-2xl" />
      <div className="relative flex items-center justify-between gap-2">
        <span className={`flex ${ui.sz.statIcon} shrink-0 items-center justify-center ${ui.chip} ${acc.grad} text-white shadow-sm`}>
          <Icon size={ui.sz.statIconPx} />
        </span>
        {onClick && (
          <ArrowUpRight size={14} className="text-slate-300 transition-colors group-hover/stat:text-slate-500 dark:text-slate-600 dark:group-hover/stat:text-slate-300" />
        )}
      </div>
      <p className={`relative mt-2 ${ui.sz.statLabel} font-bold uppercase tracking-widest text-slate-400`}>{label}</p>
      <p className={`relative font-display ${ui.sz.statNum} font-black leading-tight tabular-nums ${ui.num(acc.text)}`}>
        <Counter value={value} />
      </p>
      {hint && <p className={`relative truncate ${ui.sz.statHint} font-medium text-slate-500 dark:text-slate-400`}>{hint}</p>}
    </div>
  );
}
