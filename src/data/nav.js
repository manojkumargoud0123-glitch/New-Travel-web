import {
  LayoutDashboard,
  Gauge,
  Route as RouteIcon,
  Database,
  FileBarChart,
  FileText,
  Truck,
  Layers,
  Hexagon,
  MapPin,
} from "lucide-react";

// Single source of truth for both Sidebar + App routes
export const nav = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/dashboard",
  },
  {
    label: "Dashboard 2",
    icon: Gauge,
    to: "/dashboard-2",
  },
  {
    label: "Trips",
    icon: RouteIcon,
    defaultOpen: true,
    children: [
      { label: "Trip Details", to: "/trips/trip-details", icon: FileText },
    ],
  },
  {
    label: "Masters",
    icon: Database,
    children: [
      { label: "Vehicle Data", to: "/masters/vehicle-data", icon: Truck },
      { label: "Vehicle Type", to: "/masters/vehicle-type", icon: Layers },
      { label: "Geofences", to: "/masters/geofences", icon: Hexagon },
    ],
  },
  {
    label: "Reports",
    icon: FileBarChart,
    children: [
      {
        label: "Vehicle Wise Report",
        to: "/reports/vehicle-wise-report",
        icon: MapPin,
      },
    ],
  },
];
