import React from "react";
import { Power, Wifi, WifiOff } from "lucide-react";
import { DashCard, Donut, MetricRow, useDashUI, ROUTES } from "../ui.jsx";
import { CARD_META } from "./meta.js";

const META = CARD_META.fleetOverview;

// "Active" overlaps both connected and disconnected, so it gets a row but
// stays out of the donut — otherwise vehicles would be counted twice.
const ROWS = [
  { key: "active", field: "active_vehicles", label: "Active", icon: Power, inDonut: false },
  { key: "connected", field: "connected_vehicles", label: "Connected", icon: Wifi },
  { key: "disconnected", field: "disconnected", label: "Disconnected", icon: WifiOff },
];

/* vehicles_card */
export default function FleetOverviewCard({ data }) {
  const ui = useDashUI();
  const fleet = data?.vehicles_card || {};
  const total = Number(fleet.total_vehicles) || 0;
  const rows = ROWS.map((r) => ({ ...r, value: Number(fleet[r.field]) || 0, color: ui.color("fleet", r.key) }));

  return (
    <DashCard icon={META.icon} title={META.title} subtitle="Vehicle activity and connectivity" to={ROUTES.fleet}>
      <div className="mx-auto flex w-full max-w-[440px] items-center gap-3.5">
        <Donut total={total} label="Vehicles" segments={rows.filter((r) => r.inDonut !== false)} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {rows.map((r) => (
            <MetricRow key={r.key} icon={r.icon} label={r.label} value={r.value} total={total} color={r.color} />
          ))}
        </div>
      </div>
    </DashCard>
  );
}
