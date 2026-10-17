import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ChevronDown, X, MapPin, Search, Check, Maximize2, Minimize2,
} from "lucide-react";
import { createPortal } from "react-dom";

// Fix default Leaflet marker icons for modern build pipelines
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* ─── MAP TILE LAYERS (same set as Trip Details) ─── */
const MAP_TILES = [
  { key: "street", label: "Street", emoji: "🗺️", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '© OpenStreetMap', maxZoom: 19 },
  { key: "google", label: "Google", emoji: "🌐", url: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "© Google", maxZoom: 20 },
  { key: "google-hybrid", label: "Google Hybrid", emoji: "🛰️", url: "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}", subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "© Google", maxZoom: 20 },
  { key: "satellite", label: "Satellite", emoji: "🛰️", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri", maxZoom: 19 },
  { key: "terrain", label: "Terrain", emoji: "⛰️", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: '© OpenTopoMap', maxZoom: 17 },
];

/* ------------------------------ UI primitives ----------------------------- */

function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="px-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="w-full relative">{children}</div>
      {hint && <p className="px-0.5 text-[12px] text-slate-500">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-4 py-3 text-[14px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-500 placeholder:font-normal focus:border-brand-400/60 focus:ring-4 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-white/20 [color-scheme:light] dark:[color-scheme:dark]";

function TextInput(props) {
  return <input className={inputCls} {...props} />;
}

function Select({ options = [], placeholder = "Select...", value = "", onChange, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const openDropdown = () => {
    const rect = wrapRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
    setOpen(true);
  };

  const filtered = options.filter((o) => {
    if (!searchable) return true;
    const stringVal = typeof o === "object" ? (o.label || o.value || "") : o;
    return stringVal.toLowerCase().includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    const onDoc = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        !e.target.closest("[data-select-portal]")
      ) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e) => {
      if (e.target.closest && e.target.closest("[data-select-portal]")) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  const choose = (item) => {
    onChange?.(item);
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    const match = options.find(o => typeof o === "object" ? String(o.value) === String(value) : String(o) === String(value));
    if (match && typeof match === "object") return match.label;
    return value;
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white/70 px-4 py-3 text-left text-[14px] font-medium outline-none transition-all dark:bg-white/[0.03] ${
          open ? "border-brand-400/60 ring-4 ring-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-white/[0.08]"
        }`}
      >
        <span className={value ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
          {getDisplayValue()}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={17} className="text-slate-400" />
        </motion.span>
      </button>

      {open && coords && createPortal(
        <motion.div
          data-select-portal
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{ position: "fixed", top: coords.top + 8, left: coords.left, width: coords.width }}
          className="z-[99999] max-h-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 text-left"
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-white/[0.05]">
                <Search size={15} className="shrink-0 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  placeholder="Search..."
                  className="w-full bg-transparent text-[14px] font-medium text-slate-700 outline-none dark:text-slate-200"
                />
              </div>
            </div>
          )}
          <div ref={listRef} className="max-h-44 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-slate-400">No results found</p>
            ) : (
              filtered.map((o, i) => {
                const itemLabel = typeof o === "object" ? o.label : o;
                const itemVal = typeof o === "object" ? o.value : o;
                const isSelected = String(itemVal) === String(value);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => choose(itemVal)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[14px] ${
                      i === active ? "bg-brand-500/10 text-brand-600" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <span className="truncate">{itemLabel}</span>
                    {isSelected && <Check size={16} className="text-brand-500" />}
                  </button>
                );
              })
            )}
          </div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}

/* ------------------ Dynamic Map Sync Components ------------------ */

function ResizeMapObserver({ trigger }) {
  const mapInstance = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => mapInstance.invalidateSize(), 150);
    const t2 = setTimeout(() => mapInstance.invalidateSize(), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [trigger, mapInstance]);
  return null;
}

function ChangeMapCenter({ coordinates }) {
  const mapInstance = useMap();
  useEffect(() => {
    if (coordinates && coordinates[0] && coordinates[1]) {
      mapInstance.setView(coordinates, mapInstance.getZoom(), { animate: true });
    }
  }, [coordinates, mapInstance]);
  return null;
}

function MapClickEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* ------------------ Reusable location map ------------------ */

function LocationMap({ center, marker, onMapClick, resizeTrigger, popupText }) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
      style={{ position: "absolute", inset: 0 }}
    >
      <LayersControl position="topright">
        {MAP_TILES.map((t, i) => (
          <LayersControl.BaseLayer key={t.key} checked={i === 0} name={`${t.emoji} ${t.label}`}>
            <TileLayer
              url={t.url}
              maxZoom={t.maxZoom}
              {...(t.subdomains ? { subdomains: t.subdomains } : {})}
            />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>
      <ZoomControl position="topleft" />
      <ResizeMapObserver trigger={resizeTrigger} />
      <MapClickEvents onMapClick={onMapClick} />
      <ChangeMapCenter coordinates={center} />
      <Marker position={marker} icon={redIcon}>
        <Popup><span className="text-xs font-semibold">{popupText}</span></Popup>
      </Marker>
    </MapContainer>
  );
}

/* Wraps children; when `active`, renders them fullscreen via a body portal
   so `fixed` truly escapes any transformed/scrolling ancestor. */
function MapCardShell({ active, children, className }) {
  if (active) {
    return createPortal(
      <div className="fixed inset-4 z-[99999] flex flex-col gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900 shadow-2xl">
        {children}
      </div>,
      document.body
    );
  }
  return (
    <div className={`relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/40 glass h-[380px] ${className || ""}`}>
      {children}
    </div>
  );
}



/* --------------------------------- Main Component ---------------------------------- */

export default function TripCreation() {
  const rootRef = useRef(null);

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  const [isPickupFullscreen, setIsPickupFullscreen] = useState(false);
  const [isDestFullscreen, setIsDestFullscreen] = useState(false);

  const [formData, setFormData] = useState({
    trip_id: "TRIP-2026-8849",
    vehicle_id: "",
    driver_id: "",
    driver_name: "",
    patient_name: "",
    age: "",
    gender: "",
    patient_no: "",
    beneficiary_name: "",
    beneficiary_no: "",
    pickup_address: "",
    pickup_district_id: "",
    destination_address: "",
    destination_district_id: "",
    source_lat: 17.3850,
    source_lng: 78.4867,
    destination_lat: 17.3850,
    destination_lng: 78.4867,
    trip_type: "current",
    scheduled_datetime: new Date().toISOString().slice(0, 16),
    case_type: "Pregnancy",
    estimated_duration: 0,
    estimated_kilometers: 0,
    estimated_arrival_time: new Date().toISOString().slice(0, 16),
  });

  const caseTypes = [
    { label: "Pregnancy", value: "Pregnancy" },
    { label: "Delivery", value: "Delivery" },
    { label: "Post Delivery", value: "Post Delivery" },
    { label: "Newborn", value: "Newborn" },
    { label: "Child Care", value: "Child Care" },
    { label: "Referral", value: "Referral" },
  ];

  const tripTypes = [
    { label: "Current (Now)", value: "current" },
    { label: "Scheduling (Future Plan)", value: "scheduling" },
  ];

  const genderOptions = [
    { label: "Female", value: "Female" },
    { label: "Male", value: "Male" },
    { label: "Other", value: "Other" },
  ];

  // Vehicle / driver / district options came from the old backend; the Travel
  // API equivalents (VehiclesDropdownByType, VehicleTypeNewFilter) aren't
  // wired in yet, so these dropdowns start empty.

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneInputChange = (name, rawValue) => {
    const digits = rawValue.replace(/[^\d]/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, [name]: digits }));
  };

  const handleOSMQuery = async (query, target) => {
    if (!query || query.trim().length < 2) {
      if (target === "pickup") setPickupSuggestions([]);
      else setDestSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const list = res.ok ? await res.json() : [];
      if (target === "pickup") setPickupSuggestions(list);
      else setDestSuggestions(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAddress = (item, target) => {
    if (target === "pickup") {
      setFormData(prev => ({ ...prev, pickup_address: item.display_name, source_lat: parseFloat(item.lat), source_lng: parseFloat(item.lon) }));
      setPickupSuggestions([]);
    } else {
      setFormData(prev => ({ ...prev, destination_address: item.display_name, destination_lat: parseFloat(item.lat), destination_lng: parseFloat(item.lon) }));
      setDestSuggestions([]);
    }
  };

  const handleMapClick = async (lat, lng, target) => {
    if (target === "pickup") {
      setFormData(prev => ({ ...prev, source_lat: lat, source_lng: lng, pickup_address: "Locating..." }));
    } else {
      setFormData(prev => ({ ...prev, destination_lat: lat, destination_lng: lng, destination_address: "Locating..." }));
    }

    try {
      const qs = new URLSearchParams({ format: "json", lat, lon: lng, zoom: 18, addressdetails: 1 });
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${qs}`);
      const data = res.ok ? await res.json() : null;
      const addr = data?.display_name || "Selected Coordinate";
      if (target === "pickup") {
        setFormData(prev => ({ ...prev, pickup_address: addr }));
      } else {
        setFormData(prev => ({ ...prev, destination_address: addr }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Creating trips used the old backend. The Travel API has
  // POST /TripCreate/ — until it's wired in, nothing is sent.
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    alert("Trip creation isn't connected to the new API yet.");
  };

  return (
    <div ref={rootRef} className="mx-auto max-w-[1500px] 2xl:max-w-none px-4 py-6 sm:px-6">
      <style>{`
        .trip-creation-map .leaflet-container { z-index: 0 !important; }
        .trip-creation-map .leaflet-pane { z-index: 0 !important; }
        .trip-creation-map .leaflet-control-container { z-index: 1 !important; }
        .leaflet-pane, .leaflet-top, .leaflet-bottom, .leaflet-control, .leaflet-container { z-index: 1 !important; }
        /* Hide the Leaflet attribution flag */
        .leaflet-control-attribution { display: none !important; }
        /* Layer switcher styling (matches Trip Details) */
        .leaflet-control-layers-toggle { width: 30px !important; height: 30px !important; background-size: 16px 16px !important; border-radius: 8px !important; }
        .leaflet-control-layers { border: none !important; border-radius: 10px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important; overflow: hidden; }
        .leaflet-control-layers-expanded { padding: 8px 10px !important; background: #fff !important; color: #334155 !important; font-family: system-ui, sans-serif !important; font-size: 13px !important; font-weight: 600 !important; min-width: 130px; }
        .leaflet-control-layers-base label { display: flex !important; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 7px; cursor: pointer; margin: 0; }
        .leaflet-control-layers-base label:hover { background: #f1f5f9 !important; }
        .leaflet-control-layers-selector { margin-right: 2px; accent-color: #6366f1; }
        .leaflet-control-layers-separator { display: none; }
      `}</style>

      {/* Title Header */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500">DISPATCH OPERATIONS</p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Trip Creation Profile</h1>
      </div>

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">

        {/* Main Parameters Grid */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/[0.07] dark:bg-slate-900/40 glass shadow-md">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">

            <Field label="Trip ID Reference">
              <input type="text" className={`${inputCls} bg-slate-100/50 dark:bg-white/[0.01] cursor-not-allowed text-slate-400 font-bold`} value={formData.trip_id} readOnly />
            </Field>

            <Field label="Patient Full Name">
              <TextInput placeholder="Enter Patient Full Name..." value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} required />
            </Field>

            <Field label="Patient Age">
              <input type="text" className={inputCls} placeholder="Enter Age..." value={formData.age} onChange={(e) => handlePhoneInputChange("age", e.target.value)} required />
            </Field>

            <Field label="Patient Gender">
              <Select options={genderOptions} value={formData.gender} onChange={(val) => handleInputChange("gender", val)} searchable={false} />
            </Field>

            <Field label="Patient Contact Number">
              <input type="text" className={inputCls} placeholder="Numbers only (No special symbols)" value={formData.patient_no} onChange={(e) => handlePhoneInputChange("patient_no", e.target.value)} required />
            </Field>

            <Field label="Beneficiary Name">
              <TextInput placeholder="Enter Beneficiary Name..." value={formData.beneficiary_name} onChange={(e) => handleInputChange("beneficiary_name", e.target.value)} required />
            </Field>

            <Field label="Beneficiary Contact Number">
              <input type="text" className={inputCls} placeholder="Numbers only (No special symbols)" value={formData.beneficiary_no} onChange={(e) => handlePhoneInputChange("beneficiary_no", e.target.value)} required />
            </Field>

            <Field label="Medical Case Classification">
              <Select options={caseTypes} value={formData.case_type} onChange={(val) => handleInputChange("case_type", val)} searchable={false} />
            </Field>

            <Field label="Assign Vehicle ID">
              <Select options={vehicles} placeholder="Choose Vehicle..." value={formData.vehicle_id} onChange={(val) => handleInputChange("vehicle_id", val)} />
            </Field>

            <Field label="Driver Assignment Full Name">
              <Select options={drivers} value={formData.driver_id} onChange={(val) => handleInputChange("driver_id", val)} />
            </Field>

            <Field label="Trip Category Dispatch Mode">
              <Select options={tripTypes} value={formData.trip_type} onChange={(val) => handleInputChange("trip_type", val)} searchable={false} />
            </Field>

            <Field label="Configure Execution Time">
              <input type="datetime-local" className={inputCls} value={formData.scheduled_datetime} onChange={(e) => handleInputChange("scheduled_datetime", e.target.value)} required />
            </Field>

          </div>

          {/* Address Lookup Grid */}
          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-slate-100 pt-5 dark:border-white/[0.05] md:grid-cols-2 relative z-[200]">
            {/* Pickup Address */}
            <div className="relative">
              <Field label="Pickup Location Address String Lookup">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={formData.pickup_address}
                    onChange={(e) => { handleInputChange("pickup_address", e.target.value); handleOSMQuery(e.target.value, "pickup"); }}
                    placeholder="Type keywords (e.g. hyd) to lookup addresses..."
                    className={`${inputCls} pr-10`}
                    required
                  />
                  {formData.pickup_address && (
                    <button type="button" onClick={() => { handleInputChange("pickup_address", ""); setPickupSuggestions([]); }} className="absolute right-3 p-1 text-slate-400">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </Field>
              <AnimatePresence>
                {pickupSuggestions.length > 0 && (
                  <motion.ul initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-800 text-[13px]">
                    {pickupSuggestions.map((item, i) => (
                      <li key={i} onClick={() => handleSelectAddress(item, "pickup")} className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 truncate font-medium">
                        {item.display_name}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
              <div className="mt-3">
                <Field label="Pickup District ID Selection">
                  <Select options={districts} placeholder="Select click-only district ID..." value={formData.pickup_district_id} onChange={(val) => handleInputChange("pickup_district_id", val)} searchable={true} />
                </Field>
              </div>
            </div>

            {/* Destination Address */}
            <div className="relative">
              <Field label="Destination Location Address String Lookup">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={formData.destination_address}
                    onChange={(e) => { handleInputChange("destination_address", e.target.value); handleOSMQuery(e.target.value, "destination"); }}
                    placeholder="Type keywords (e.g. hospital) to lookup addresses..."
                    className={`${inputCls} pr-10`}
                    required
                  />
                  {formData.destination_address && (
                    <button type="button" onClick={() => { handleInputChange("destination_address", ""); setDestSuggestions([]); }} className="absolute right-3 p-1 text-slate-400">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </Field>
              <AnimatePresence>
                {destSuggestions.length > 0 && (
                  <motion.ul initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-800 text-[13px]">
                    {destSuggestions.map((item, i) => (
                      <li key={i} onClick={() => handleSelectAddress(item, "destination")} className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 truncate font-medium">
                        {item.display_name}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
              <div className="mt-3">
                <Field label="Destination District ID Selection">
                  <Select options={districts} placeholder="Select click-only district ID..." value={formData.destination_district_id} onChange={(val) => handleInputChange("destination_district_id", val)} searchable={true} />
                </Field>
              </div>
            </div>

          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="w-full flex items-center justify-center rounded-xl bg-blue-600 py-3.5 text-[15px] font-bold text-white shadow-md hover:bg-blue-700 transition-colors">
          Dispatch
        </button>

        {/* Maps */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

     {/* Pickup Tracker */}
<MapCardShell active={isPickupFullscreen}>
  <div className="flex items-center justify-between mb-2 shrink-0 relative z-[10]">
    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
      <MapPin size={14} className="text-blue-500" /> Source Location Map Tracking (Click map to choose)
    </h3>
    <button type="button" onClick={() => setIsPickupFullscreen(!isPickupFullscreen)} className="p-1 rounded-lg border hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
      {isPickupFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
    </button>
  </div>
  <div className="trip-creation-map relative flex-1 min-h-0 w-full overflow-hidden rounded-xl border">
    <LocationMap
      center={[formData.source_lat, formData.source_lng]}
      marker={[formData.source_lat, formData.source_lng]}
      onMapClick={(lat, lng) => handleMapClick(lat, lng, "pickup")}
      resizeTrigger={isPickupFullscreen}
      popupText="Pickup Location Set"
    />
  </div>
</MapCardShell>

      {/* Destination Tracker */}
<MapCardShell active={isDestFullscreen}>
  <div className="flex items-center justify-between mb-2 shrink-0 relative z-[10]">
    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
      <MapPin size={14} className="text-rose-500" /> Destination Location Map Tracking (Click map to choose)
    </h3>
    <button type="button" onClick={() => setIsDestFullscreen(!isDestFullscreen)} className="p-1 rounded-lg border hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
      {isDestFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
    </button>
  </div>
  <div className="trip-creation-map relative flex-1 min-h-0 w-full overflow-hidden rounded-xl border">
    <LocationMap
      center={[formData.destination_lat, formData.destination_lng]}
      marker={[formData.destination_lat, formData.destination_lng]}
      onMapClick={(lat, lng) => handleMapClick(lat, lng, "destination")}
      resizeTrigger={isDestFullscreen}
      popupText="Destination Location Set"
    />
  </div>
</MapCardShell>

        </div>

      </form>
    </div>
  );
}