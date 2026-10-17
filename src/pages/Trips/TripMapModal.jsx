import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Check, Clock, Map, Maximize2, Minimize2, Play, X,
} from "lucide-react";

/* Route map for one trip: pickup and drop markers on a choice of base maps,
   with playback controls for a GPS trail. Opened from the Trip Details table.

   `trip` fields: id, tripCode, vehicle, vehicleId, customer, from, to,
   fromTime, toTime, distance, duration, hasCoords, sourceLat, sourceLng,
   destLat, destLng, tripCreationDatetime, actualEndDatetime. */

/* ─── MAP TILE LAYERS ────────────────────────────────────────────────────── */
const MAP_TILES = [
  { key: "street", label: "Street", emoji: "🗺️", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 },
  { key: "google", label: "Google", emoji: "🌐", url: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "© Google", maxZoom: 20 },
  { key: "google-hybrid", label: "Google Hybrid", emoji: "🛰️", url: "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}", subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "© Google", maxZoom: 20 },
  { key: "satellite", label: "Satellite", emoji: "🛰️", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri, Maxar, Earthstar Geographics", maxZoom: 19 },
  { key: "terrain", label: "Terrain", emoji: "⛰️", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>', maxZoom: 17 },
];

/* ─── UNIFIED TRIP MAP MODAL ─────────────────────────────────────────────── */
export default function TripMapModal({ trip, onClose }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const routeLayersRef = useRef([]);
  const trailLayersRef = useRef([]);
  const modalCardRef = useRef(null);
const [isFullscreen, setIsFullscreen] = useState(false);

  const [isLoading,   setIsLoading]   = useState(true);
  const [mapError,    setMapError]    = useState(null);
  const [routeInfo,   setRouteInfo]   = useState(null);
  const [gpsData,     setGpsData]     = useState(null);
  const [allPoints,   setAllPoints]   = useState([]);
  const [isOnTrip,    setIsOnTrip]    = useState(false);
  const [tripStarted, setTripStarted] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── playback state ──
const [playIndex, setPlayIndex]   = useState(0);      // current point shown (index into sortedAsc)
const [isPlaying, setIsPlaying]   = useState(false);
const [playSpeed, setPlaySpeed]   = useState(1);      // 1x / 2x / 4x
const [isLive, setIsLive]         = useState(true);   // true = marker follows latest; false = scrubbing/replaying
const [pointCount, setPointCount] = useState(0);

const sortedAscRef  = useRef([]);   // GPS points oldest→newest (playback order)
const trailDotsRef  = useRef([]);   // dot markers per ping
const isLiveRef     = useRef(true); // mirror of isLive for use inside interval closure
const playTimerRef  = useRef(null);

  const tripActive = trip.actualEndDatetime === null;
  const tripStart  = trip.tripCreationDatetime ? new Date(trip.tripCreationDatetime) : null;

  const loadLeaflet = () =>
    new Promise((res, rej) => {
      if (window.L) return res(window.L);
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(link);
      }
      if (document.getElementById("leaflet-js")) {
        const t = setInterval(() => { if (window.L) { clearInterval(t); res(window.L); } }, 50);
        return;
      }
      const s = document.createElement("script");
      s.id = "leaflet-js";
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      s.onload = () => res(window.L); s.onerror = rej;
      document.head.appendChild(s);
    });

  // Route line and GPS trail came from the old backend; the Travel
  // API has no equivalent yet, so the map shows pickup/drop only.
  const fetchRouteCoords = async () => null;

const fetchGPS = useCallback(async () => [], []);

useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const init = async () => {
      try {
        const [L, routeData] = await Promise.all([loadLeaflet(), fetchRouteCoords()]);
        if (cancelled || !mapRef.current) return;

        if (routeData) {
          setRouteInfo({ distance: `${routeData.distance} KM`, duration: `${Math.round(routeData.duration * 60)} min` });
        }

        let centerLat = trip.sourceLat ?? 17.385;
        let centerLng = trip.sourceLng ?? 78.4867;
        if (trip.hasCoords) {
          centerLat = (trip.sourceLat + trip.destLat) / 2;
          centerLng = (trip.sourceLng + trip.destLng) / 2;
        }

        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: 12,
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        const baseLayers = {};
      MAP_TILES.forEach((t, i) => {
  const layer = L.tileLayer(t.url, {
    attribution: t.attribution,
    maxZoom: t.maxZoom,
    ...(t.subdomains ? { subdomains: t.subdomains } : {}),
  });
  baseLayers[`${t.emoji} ${t.label}`] = layer;
  if (i === 0) layer.addTo(map);
});
        L.control.layers(baseLayers, null, { position: "topright", collapsed: true }).addTo(map);

        if (routeData?.coords?.length > 1) {
          const shadow = L.polyline(routeData.coords, { color: "#6366f1", weight: 8, opacity: 0.18, lineCap: "round", lineJoin: "round" }).addTo(map);
          const main   = L.polyline(routeData.coords, { color: "#6366f1", weight: 4, opacity: 0.92, lineCap: "round", lineJoin: "round" }).addTo(map);
          routeLayersRef.current = [shadow, main];
          map.fitBounds(main.getBounds(), { padding: [60, 60], maxZoom: 12 });

          if (routeData.coords.length > 5) {
            const waypointIcon = L.divIcon({ className: "", html: `<div style="width:8px;height:8px;border-radius:50%;background:#6366f1;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
            const step = Math.max(1, Math.floor(routeData.coords.length / 12));
            routeData.coords.forEach((pt, i) => {
              if (i === 0 || i === routeData.coords.length - 1) return;
              if (i % step === 0) L.marker(pt, { icon: waypointIcon }).addTo(map);
            });
          }
        } else if (trip.hasCoords) {
          map.fitBounds(L.latLngBounds([[trip.sourceLat, trip.sourceLng], [trip.destLat, trip.destLng]]), { padding: [60, 60], maxZoom: 12 });
        }

        if (trip.hasCoords) {
          const mkIcon = (bg, emoji) => L.divIcon({
            className: "",
            html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${bg};border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.26);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);font-size:14px">${emoji}</div></div>`,
            iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36],
          });
          L.marker([trip.sourceLat, trip.sourceLng], { icon: mkIcon("#10b981", "📍") }).addTo(map)
            .bindPopup(`<div style="font-family:system-ui;min-width:180px;line-height:1.6"><b style="color:#059669;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">📍 Pickup</b><p style="font-size:12px;margin:4px 0 2px;font-weight:600;color:#1e293b">${trip.from}</p><p style="font-size:11px;color:#64748b">${trip.fromTime}</p></div>`);
          L.marker([trip.destLat, trip.destLng], { icon: mkIcon("#ef4444", "🏁") }).addTo(map)
            .bindPopup(`<div style="font-family:system-ui;min-width:180px;line-height:1.6"><b style="color:#dc2626;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">🏁 Destination</b><p style="font-size:12px;margin:4px 0 2px;font-weight:600;color:#1e293b">${trip.to}</p><p style="font-size:11px;color:#64748b">${trip.toTime}</p></div>`);
        }

        // const vehicleIcon = L.divIcon({
        //   className: "",
        //   html: `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:3px solid #fff;box-shadow:0 4px 16px rgba(99,102,241,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;animation:vehiclePulse 2s infinite;">🚑</div>
        //   <style>@keyframes vehiclePulse{0%,100%{box-shadow:0 4px 16px rgba(99,102,241,0.5),0 0 0 0 rgba(99,102,241,0.4)}50%{box-shadow:0 4px 16px rgba(99,102,241,0.5),0 0 0 12px rgba(99,102,241,0)}}</style>`,
        //   iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -24],
        // });

        const vehicleIcon = L.divIcon({
  className: "vehicle-marker",
  html: `
    <div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
      <svg width="44" height="34" viewBox="0 0 44 34" xmlns="http://www.w3.org/2000/svg">
        <!-- roof beacon -->
        <rect x="12" y="3" width="7" height="3.5" rx="1.2" fill="#2563eb"/>
        <!-- body (white) -->
        <rect x="2" y="6.5" width="26" height="15" rx="2.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
        <!-- cab (white) -->
        <path d="M28 10 h5.5 l6.5 6.5 v5 h-12 z" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
        <!-- windshield -->
        <path d="M29.5 11.5 h3.6 l4.6 4.6 h-8.2 z" fill="#93c5fd"/>
        <!-- green side stripe -->
        <rect x="2" y="16.5" width="26" height="3" fill="#16a34a"/>
        <!-- red cross -->
        <rect x="8.4" y="9" width="2.6" height="6.4" rx="0.5" fill="#dc2626"/>
        <rect x="6.5" y="10.9" width="6.4" height="2.6" rx="0.5" fill="#dc2626"/>
        <!-- wheels -->
        <circle cx="10.5" cy="23.5" r="4" fill="#1e293b"/>
        <circle cx="10.5" cy="23.5" r="1.6" fill="#94a3b8"/>
        <circle cx="31.5" cy="23.5" r="4" fill="#1e293b"/>
        <circle cx="31.5" cy="23.5" r="1.6" fill="#94a3b8"/>
      </svg>
    </div>`,
  iconSize: [44, 34],
  iconAnchor: [22, 17],
  popupAnchor: [0, -18],
});

   // helper to (re)bind the vehicle popup for a given point
const bindVehiclePopup = (point, onTrip) => {
  if (!vehicleMarkerRef.current) return;
  vehicleMarkerRef.current.bindPopup(`
    <div style="font-family:system-ui;min-width:200px;line-height:1.7">
      <b style="color:#6366f1;font-size:13px">🚑 ${trip.vehicle}</b>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0"/>
      <div style="font-size:11.5px;color:#334155">
        <div><b>Speed:</b> ${point.speed ?? "—"} km/h</div>
        <div><b>Direction:</b> ${point.direction ?? "—"}°</div>
        <div><b>Ignition:</b> <span style="color:${point.ignition === 'ON' ? '#059669' : '#dc2626'}">${point.ignition ?? "—"}</span></div>
        <div><b>Time:</b> ${new Date(point.created_at).toLocaleString()}</div>
        <div><b>Status:</b> <span style="color:${onTrip ? '#059669' : '#64748b'}">${onTrip ? '🟢 On Trip' : '⚪ Trip Ended'}</span></div>
      </div>
    </div>`);
};

const doGpsFetch = async () => {
  if (cancelled) return;
  const entries = await fetchGPS();
  if (cancelled) return;
  setLastRefresh(new Date());

  if (!entries.length) {
    if (trip.hasCoords && !vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([trip.sourceLat, trip.sourceLng], { icon: vehicleIcon })
        .addTo(map)
        .bindPopup(`<div style="font-family:system-ui;min-width:180px"><b style="color:#6366f1">🚑 ${trip.vehicle}</b><p style="font-size:11px;color:#64748b;margin:4px 0 0">No GPS signal yet — showing pickup location</p></div>`);
    }
    return;
  }

  // Ascending order = playback order (oldest → newest)
  const asc = [...entries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  sortedAscRef.current = asc;
  setAllPoints(asc);
  setPointCount(asc.length);

  const onTrip = trip.actualEndDatetime === null;
  setIsOnTrip(onTrip);
  setTripStarted(tripStart ? tripStart.toLocaleString() : null);

  // ── Redraw trail: solid line + a dot at each ping ──
  trailLayersRef.current.forEach((l) => map.removeLayer(l));
  trailDotsRef.current.forEach((l) => map.removeLayer(l));
  trailLayersRef.current = [];
  trailDotsRef.current = [];

if (asc.length > 1) {
  const trailCoords = asc.map((e) => [e.lat, e.lng]);
  const tShadow = L.polyline(trailCoords, { color: "#1e3a8a", weight: 10, opacity: 0.18, lineCap: "round", lineJoin: "round" }).addTo(map);
  const tMain   = L.polyline(trailCoords, { color: "#1d4ed8", weight: 6,  opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(map);
  trailLayersRef.current = [tShadow, tMain];

// AFTER — dot only at start point and live (latest) point
const startDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#10b981;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
  iconSize: [10, 10], iconAnchor: [5, 5],
});
const liveDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#6366f1;border:2px solid #fff;box-shadow:0 1px 4px rgba(99,102,241,0.5)"></div>`,
  iconSize: [10, 10], iconAnchor: [5, 5],
});

// Start point dot (first GPS ping)
trailDotsRef.current.push(
  L.marker([asc[0].lat, asc[0].lng], { icon: startDotIcon, interactive: false }).addTo(map)
);

// Live point dot (latest GPS ping) — only add if there's more than one point
if (asc.length > 1) {
  const latest = asc[asc.length - 1];
  trailDotsRef.current.push(
    L.marker([latest.lat, latest.lng], { icon: liveDotIcon, interactive: false }).addTo(map)
  );
}
}

  // ── Marker placement ──
  // If LIVE, jump marker to newest point and pin the scrubber to the end.
  // If the user is scrubbing/replaying, DON'T move the marker — just let the
  // timeline grow (live-on-the-side behaviour).
  if (isLiveRef.current) {
    const latest = asc[asc.length - 1];
    setGpsData(latest);
    setPlayIndex(asc.length - 1);
    if (vehicleMarkerRef.current) vehicleMarkerRef.current.setLatLng([latest.lat, latest.lng]);
    else vehicleMarkerRef.current = L.marker([latest.lat, latest.lng], { icon: vehicleIcon }).addTo(map);
    bindVehiclePopup(latest, onTrip);
  } else if (!vehicleMarkerRef.current) {
    // first load but user somehow not live — still create a marker
    const p = asc[Math.min(playIndex, asc.length - 1)];
    vehicleMarkerRef.current = L.marker([p.lat, p.lng], { icon: vehicleIcon }).addTo(map);
    bindVehiclePopup(p, onTrip);
  }
};
await doGpsFetch();
setIsLoading(false);
setTimeout(() => { if (!cancelled) mapInstanceRef.current?.invalidateSize(); }, 250);
if (tripActive) intervalId = setInterval(doGpsFetch, 10000);
      } catch {
        if (!cancelled) { setIsLoading(false); setMapError("Failed to load map. Check your internet connection."); }
      }
    };

    init();
   return () => {
  cancelled = true;
  if (intervalId) clearInterval(intervalId);
  if (playTimerRef.current) clearInterval(playTimerRef.current);
  trailDotsRef.current = [];
  if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);
  // Move the marker whenever the playback index changes (scrub or auto-play)
useEffect(() => {
  if (isLiveRef.current) return;            // live fetch handles the marker; don't fight it
  const asc = sortedAscRef.current;
  if (!asc.length || !vehicleMarkerRef.current) return;
  const pt = asc[Math.min(playIndex, asc.length - 1)];
  if (pt) {
    vehicleMarkerRef.current.setLatLng([pt.lat, pt.lng]);
    setGpsData(pt);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [playIndex]);

// Auto-advance timer while playing
useEffect(() => {
  if (!isPlaying) {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    return;
  }
  const stepMs = 600 / playSpeed; // base 600ms per ping
  playTimerRef.current = setInterval(() => {
    setPlayIndex((i) => {
      const max = sortedAscRef.current.length - 1;
      if (i >= max) {
        setIsPlaying(false);
        setIsLive(true);            // reached the end → snap back to live
        return max;
      }
      return i + 1;
    });
  }, stepMs);
  return () => clearInterval(playTimerRef.current);
}, [isPlaying, playSpeed]);
useEffect(() => {
  const onFsChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 120);
  };
  document.addEventListener("fullscreenchange", onFsChange);
  return () => document.removeEventListener("fullscreenchange", onFsChange);
}, []);

const handlePlayPause = () => {
  const max = sortedAscRef.current.length - 1;
  if (!isPlaying) {
    setIsLive(false);                        // detach from live while replaying
    if (playIndex >= max) setPlayIndex(0);   // restart if sitting at the end
  }
  setIsPlaying((p) => !p);
};

const handleScrub = (idx) => {
  setIsPlaying(false);
  const max = sortedAscRef.current.length - 1;
  setIsLive(idx >= max);                      // dragging to the very end re-attaches live
  setPlayIndex(idx);
};

const goLive = () => {
  const max = sortedAscRef.current.length - 1;
  setIsPlaying(false);
  setIsLive(true);
  setPlayIndex(max < 0 ? 0 : max);
};

const cycleSpeed = () => setPlaySpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));

const toggleFullscreen = () => {
  const el = modalCardRef.current;
  if (!el) return;
  if (!document.fullscreenElement) {
    el.requestFullscreen?.().then(() => {
      setIsFullscreen(true);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 120);
    }).catch(() => {});
  } else {
    document.exitFullscreen?.().then(() => {
      setIsFullscreen(false);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 120);
    }).catch(() => {});
  }
};

  const displayDistance = routeInfo?.distance ?? trip.distance;
  const displayDuration = routeInfo?.duration ?? trip.duration;

  return (
    <AnimatePresence>
      <style>{`
        .leaflet-control-layers-toggle { width: 30px !important; height: 30px !important; background-size: 16px 16px !important; border-radius: 8px !important; }
        .leaflet-control-layers { border: none !important; border-radius: 10px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important; overflow: hidden; }
        .leaflet-control-layers-expanded { padding: 8px 10px !important; background: #ffffff !important; color: #334155 !important; font-family: system-ui, -apple-system, sans-serif !important; font-size: 13px !important; font-weight: 600 !important; min-width: 130px; }
        .leaflet-control-layers-base label { display: flex !important; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 7px; cursor: pointer; transition: background 0.15s; margin: 0; }
        .leaflet-control-layers-base label:hover { background: #f1f5f9 !important; }
        .leaflet-control-layers-selector { margin-right: 2px; accent-color: #6366f1; }
        .leaflet-control-layers-separator { display: none; }
        .dark .leaflet-control-layers-expanded { background: #1e293b !important; color: #e2e8f0 !important; }
        .dark .leaflet-control-layers-base label:hover { background: rgba(255,255,255,0.06) !important; }
        .dark .leaflet-control-layers-toggle { background-color: #1e293b !important; }
      `}</style>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <motion.div
  ref={modalCardRef}
  initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }}
  transition={{ type: "spring", stiffness: 300, damping: 26 }}
  className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/60 dark:border-white/[0.08] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
  style={isFullscreen ? { height: "100vh", maxHeight: "100vh", maxWidth: "100vw" } : { height: "90vh", maxHeight: 780 }}
>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] px-5 py-3 shrink-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600"><Map size={17} /></div>
              <div>
                <h2 className="text-[14px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {trip.tripCode ?? `Trip #${trip.id}`} — Route &amp; Live Tracking
                  {isOnTrip && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-400/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> LIVE
                    </span>
                  )}
                </h2>
                <p className="text-[11.5px] text-slate-400">{trip.vehicle} · {trip.customer}</p>
              </div>
            </div>
        <div className="flex items-center gap-1.5">
  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={toggleFullscreen}
    title={isFullscreen ? "Exit full screen" : "Full screen"}
    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400 transition-colors">
    {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
  </motion.button>
  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:bg-rose-100 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
    <X size={16} />
  </motion.button>
</div>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-slate-100 dark:border-white/[0.05] shrink-0 bg-slate-50/60 dark:bg-white/[0.01]">
            {tripStarted && (
              <div className="flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-400/30 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-violet-700 dark:text-violet-300">
                <Clock size={12} /> Trip started: {tripStarted}
              </div>
            )}
            <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold ${
              isOnTrip ? "border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.03] text-slate-500"
            }`}>
              <span className={`h-2 w-2 rounded-full inline-block ${isOnTrip ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {isOnTrip ? "Vehicle on trip" : "Trip ended"}
            </div>
            {routeInfo && (
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="h-3 w-3 rounded-sm bg-indigo-500 inline-block opacity-80" /> Route: {routeInfo.distance} · ~{routeInfo.duration}
              </span>
            )}
            {lastRefresh && (
              <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
                {tripActive && <span className="ml-1 text-emerald-500">(auto-refreshes every 10s)</span>}
              </span>
            )}
          </div>

          {gpsData && !isLoading && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-slate-100 dark:border-white/[0.05] bg-indigo-50/60 dark:bg-indigo-500/[0.06] shrink-0">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Speed:</span><span className="text-indigo-700 dark:text-indigo-300 font-bold">{gpsData.speed ?? "—"} km/h</span></div>
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Direction:</span><span className="font-bold">{gpsData.direction ?? "—"}°</span></div>
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Ignition:</span><span className={`font-bold ${gpsData.ignition === "ON" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>{gpsData.ignition ?? "—"}</span></div>
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><span className="text-slate-400 font-normal">Coords:</span><span className="font-mono font-bold text-[11px]">{gpsData.lat?.toFixed(5)}, {gpsData.lng?.toFixed(5)}</span></div>
            </div>
          )}

          <div className="relative flex-1 min-h-0">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                <p className="text-[13px] font-semibold text-slate-500">Loading route &amp; live tracking…</p>
              </div>
            )}
            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10">
                <div className="flex flex-col items-center gap-2"><AlertTriangle size={24} className="text-rose-400" /><p className="text-rose-500 font-semibold">{mapError}</p></div>
              </div>
            )}
            <div ref={mapRef} className="h-full w-full" />

            {!isLoading && pointCount > 0 && (
  <div className="absolute bottom-4 left-1/2 z-[500] w-[92%] max-w-3xl -translate-x-1/2">
    <div className="flex items-center gap-3 rounded-2xl bg-slate-900/85 px-4 py-2.5 backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
      <button onClick={handlePlayPause}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
        {isPlaying
          ? <span className="flex gap-[3px]"><span className="h-3.5 w-[3px] rounded-sm bg-white" /><span className="h-3.5 w-[3px] rounded-sm bg-white" /></span>
          : <Play size={18} className="ml-0.5" fill="currentColor" />}
      </button>

      <input
        type="range" min={0} max={Math.max(0, pointCount - 1)} value={playIndex}
        onChange={(e) => handleScrub(Number(e.target.value))}
        className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400
                   [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
        style={{ background: `linear-gradient(to right, #818cf8 ${(playIndex / Math.max(1, pointCount - 1)) * 100}%, rgba(255,255,255,0.2) ${(playIndex / Math.max(1, pointCount - 1)) * 100}%)` }}
      />

      <button onClick={cycleSpeed}
        className="shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-bold text-white hover:bg-white/10 transition-colors">
        {playSpeed}x
      </button>

      <span className="h-5 w-px bg-white/15" />

      <span className="shrink-0 font-mono text-[12px] font-semibold text-white/90 tabular-nums">
        {sortedAscRef.current[playIndex]?.created_at
          ? new Date(sortedAscRef.current[playIndex].created_at).toLocaleTimeString()
          : "--:--:--"}
      </span>

      <button onClick={goLive}
        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
          isLive ? "bg-emerald-500/20 text-emerald-300" : "text-white/50 hover:bg-white/10"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
        LIVE
      </button>
    </div>
  </div>
)}
          </div>

          <div className="flex items-center justify-center flex-wrap gap-5 py-2 border-t border-slate-200 dark:border-white/[0.06] bg-white/90 dark:bg-slate-900/90 shrink-0 px-4">
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-violet-600"><span className="text-base">🚑</span> Vehicle (ID: {trip.vehicleId})</span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Pickup</span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-rose-600"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" /> Destination</span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600"><span className="h-3 w-5 rounded bg-indigo-500 inline-block opacity-80" /> Planned route</span>
{allPoints.length > 0 && (
  <>
    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600">
      <span className="h-1 w-5 rounded bg-indigo-500 inline-block" /> GPS trail ({allPoints.length})
    </span>
    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Trail start
    </span>
    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600">
      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" /> Live position
    </span>
  </>
)}
            <span className="text-[11.5px] text-slate-400">{displayDistance} · {displayDuration}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
