import { CARD_META } from "./meta.js";
import TripOverviewCard from "./TripOverviewCard.jsx";
import FleetOverviewCard from "./FleetOverviewCard.jsx";
import TripTrendCard from "./TripTrendCard.jsx";
import GeofencesCard from "./GeofencesCard.jsx";
import RecentTripsCard from "./RecentTripsCard.jsx";

const COMPONENTS = {
  tripOverview: TripOverviewCard,
  fleetOverview: FleetOverviewCard,
  tripTrend: TripTrendCard,
  geofences: GeofencesCard,
  recentTrips: RecentTripsCard,
};

/* Every dashboard card: { title, icon, auto, source, Component }.
   Keys must match CARD_IDS in ../settings.js. */
export const CARDS = Object.fromEntries(
  Object.entries(CARD_META).map(([id, meta]) => [id, { ...meta, Component: COMPONENTS[id] }])
);
