import React from "react";
import { motion } from "framer-motion";
import { Factory, MapPin } from "lucide-react";
import { DashCard, Counter, useDashUI, tint, ROUTES, EASE } from "../ui.jsx";
import { colorVars } from "../palettes.js";
import { CARD_META } from "./meta.js";

const META = CARD_META.geofences;

const ITEMS = [
  { key: "plants", field: "total_plants", label: "Plants", icon: Factory },
  { key: "sites", field: "total_sites", label: "Sites", icon: MapPin },
];

/* geofence_card — plants and sites (routes intentionally not shown) */
export default function GeofencesCard({ data }) {
  const ui = useDashUI();
  const { sz } = ui;
  const geo = data?.geofence_card || {};
  const items = ITEMS.map((m) => ({ ...m, value: Number(geo[m.field]) || 0, color: ui.color("geofences", m.key) }));
  const total = items.reduce((s, m) => s + m.value, 0);

  return (
    <DashCard
      icon={META.icon} title={META.title} to={ROUTES.geofences}
      subtitle={`${total.toLocaleString()} plants & sites`}
    >
      <div className="mx-auto grid w-full max-w-[440px] grid-cols-2 gap-2">
        {items.map((m) => {
          const Icon = m.icon;
          const pct = total > 0 ? Math.round((m.value / total) * 100) : 0;
          return (
            <div
              key={m.key}
              style={colorVars(m.color)}
              className={`relative min-w-0 overflow-hidden border ${sz.geoTile} ${ui.corners.tile} ${tint.border} ${tint.soft}`}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[rgb(var(--c-500)/0.16)] blur-2xl" />
              <div className="relative flex items-center justify-between gap-2">
                <span className={`flex ${sz.statIcon} shrink-0 items-center justify-center ${ui.chip} ${tint.grad} text-white shadow-sm`}>
                  <Icon size={sz.statIconPx} />
                </span>
                <span className={`font-display ${sz.rowPct} font-extrabold tabular-nums ${tint.text}`}>{pct}%</span>
              </div>
              <p className={`relative mt-2 ${sz.statLabel} font-bold uppercase tracking-widest text-slate-400`}>{m.label}</p>
              <p className={`relative truncate font-display ${sz.geoNum} font-black leading-tight tabular-nums ${ui.num()}`}>
                <Counter value={m.value} />
              </p>
              <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-white/70 dark:bg-white/[0.07]">
                <motion.div
                  initial={ui.anim ? { width: 0 } : false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: EASE }}
                  className={`h-full rounded-full ${tint.bar}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashCard>
  );
}
