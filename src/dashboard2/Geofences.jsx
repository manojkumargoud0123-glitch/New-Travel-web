import React from "react";
import { Factory, MapPin } from "lucide-react";
import { ROUTES } from "../dashboard/ui.jsx";
import { Panel, Num, fmtNum } from "./kit.jsx";

const ITEMS = [
  { key: "plants", field: "total_plants", label: "Plants", icon: Factory },
  { key: "sites", field: "total_sites", label: "Sites", icon: MapPin },
];

/* geofence_card — plants and sites (routes intentionally not shown) */
export default function Geofences({ data }) {
  const geo = data?.geofence_card || {};
  const items = ITEMS.map((m) => ({ ...m, value: Number(geo[m.field]) || 0 }));
  const total = items.reduce((s, m) => s + m.value, 0);

  return (
    <Panel title="Geofences" subtitle={`${fmtNum(total)} locations mapped`} to={ROUTES.geofences}>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(({ key, label, icon: Icon, value }) => (
          <div key={key} className="min-w-0 rounded-2xl bg-slate-50 p-3.5 dark:bg-white/[0.03]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/[0.06] dark:text-primary-300 dark:shadow-none dark:ring-white/[0.06]">
              <Icon size={16} />
            </span>
            <p className="mt-2 text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            <p className="truncate text-[22px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
              <Num value={value} />
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
