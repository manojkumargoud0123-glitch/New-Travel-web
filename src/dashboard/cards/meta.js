import { Route as RouteIcon, Truck, BarChart3, Hexagon, CalendarClock } from "lucide-react";

/* Title, icon and default ("Auto") width of each card, shared by the cards
   themselves and the Customize panel. `auto` is in grid units — 6 per column,
   24 for a full row on a wide screen (see ../layout.js). */
export const CARD_META = {
  tripOverview: { title: "Trip Overview", icon: RouteIcon, auto: 12, source: "top_cards" },
  fleetOverview: { title: "Fleet Overview", icon: Truck, auto: 7, source: "vehicles_card" },
  geofences: { title: "Geofences", icon: Hexagon, auto: 5, source: "geofence_card" },
  tripTrend: { title: "Trip Trend", icon: BarChart3, auto: 12, source: "trip_trend" },
  recentTrips: { title: "Recent Trips", icon: CalendarClock, auto: 12, source: "recent_trips" },
};
