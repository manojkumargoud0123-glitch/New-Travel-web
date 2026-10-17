import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Wifi, WifiOff, Power } from "lucide-react";
import { ROUTES } from "../dashboard/ui.jsx";
import { Panel, Badge, Num, fmtNum, fmtPct, EASE } from "./kit.jsx";

const ARC = "M 16 100 A 84 84 0 0 1 184 100";

/* Connected share as a half-circle meter. The unfilled track is a lighter
   step of the same green, so "not connected" reads as the remainder. */
function Gauge({ ratio }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-[210px]">
      <svg viewBox="0 0 200 108" className="block w-full" aria-hidden="true">
        <path d={ARC} fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-[rgb(var(--d2-online)/0.16)]" />
        {ratio > 0 && (
          <motion.path
            d={ARC} fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-[rgb(var(--d2-online))]"
            initial={{ pathLength: reduce ? ratio : 0 }} animate={{ pathLength: ratio }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <p className="text-[32px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
          <Num value={ratio * 100} format={(v) => `${Math.round(v)}%`} />
        </p>
        <p className="mt-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400">connected</p>
      </div>
    </div>
  );
}

const Row = ({ icon: Icon, label, value, share, swatch }) => (
  <li className="flex items-center gap-3 py-2">
    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${swatch}`} />
    <Icon size={15} className="shrink-0 text-slate-400" />
    <span className="flex-1 text-[13.5px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
    <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">{share}</span>
    <span className="min-w-[3ch] text-right text-[16px] font-bold tabular-nums text-slate-900 dark:text-white">
      <Num value={value} />
    </span>
  </li>
);

/* vehicles_card — "active" overlaps connected + disconnected, so it sits
   apart from the meter instead of being added into it */
export default function FleetHealth({ data }) {
  const fleet = data?.vehicles_card || {};
  const connected = Number(fleet.connected_vehicles) || 0;
  const disconnected = Number(fleet.disconnected) || 0;
  const active = Number(fleet.active_vehicles) || 0;
  const total = Math.max(Number(fleet.total_vehicles) || 0, connected + disconnected);
  const share = (v) => (total > 0 ? (v / total) * 100 : 0);
  const ratio = total > 0 ? Math.min(1, connected / total) : 0;

  return (
    <Panel
      title="Fleet health" subtitle="Live connectivity across vehicles" to={ROUTES.fleet} toLabel="Open vehicle data"
      right={<Badge>{fmtNum(total)} vehicles</Badge>}
    >
      {/* gauge beside the numbers when there's room, stacked on phones */}
      <div className="flex flex-1 flex-col justify-center gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="w-full shrink-0 sm:w-[42%] sm:max-w-[210px]">
          <Gauge ratio={ratio} />
        </div>
        <div className="min-w-0 flex-1">
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            <Row icon={Wifi} label="Connected" value={connected} share={fmtPct(share(connected))} swatch="bg-[rgb(var(--d2-online))]" />
            <Row icon={WifiOff} label="Disconnected" value={disconnected} share={fmtPct(share(disconnected))} swatch="bg-[rgb(var(--d2-online)/0.22)]" />
          </ul>
          <div className="mt-2 rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
                <Power size={15} />
              </span>
              <span className="flex-1 text-[13.5px] font-semibold text-slate-600 dark:text-slate-300">Active vehicles</span>
              <span className="text-[16px] font-bold tabular-nums text-slate-900 dark:text-white"><Num value={active} /></span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-950">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${share(active)}%` }} transition={{ duration: 0.9, ease: EASE }}
                className="h-full rounded-full bg-primary-500"
              />
            </div>
            <p className="mt-1.5 text-[11.5px] font-medium text-slate-400 dark:text-slate-500">{fmtPct(share(active))} of the fleet</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
