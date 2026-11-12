import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  X, MapPin, Flag, Loader2, Layers, Car, User, Phone, Clock, Plus, AlertTriangle, Maximize2, Minimize2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "../../config/AuthContext";
import SearchSelect from "../../components/SearchSelect";
import {
  EP, postJson, splitErrors, useVehicleTypes, useVehicles, toLocalInput, fromLocalInput,
} from "./tripApi";

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

// Pickup pin (blue) and drop pin (red)
const blueIcon = new L.Icon.Default();
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: markerShadow,
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

// Where the maps open before a point is chosen (Hyderabad)
const DEFAULT_CENTER = [17.385, 78.4867];

const NOMINATIM = "https://nominatim.openstreetmap.org";
const SEARCH_DELAY_MS = 450; // Nominatim allows about one request a second

/* =========================================================================
   THEME
   ========================================================================= */
const card =
  "rounded-2xl border border-slate-200 dark:border-white/[0.08] " +
  "bg-white/80 dark:bg-slate-900/60 shadow-sm shadow-slate-200/60 dark:shadow-black/30";

const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-white/[0.08] " +
  "bg-white dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-medium " +
  "text-slate-700 dark:text-slate-100 outline-none transition-colors duration-200 " +
  "placeholder:text-slate-400 placeholder:font-normal " +
  "focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 " +
  "hover:border-slate-300 dark:hover:border-white/20 [color-scheme:light] dark:[color-scheme:dark]";

const errorInput = "!border-rose-300 dark:!border-rose-400/40";

const labelCls = "px-0.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300";

/* ------------------------------ UI primitives ----------------------------- */
function Field({ label, htmlFor, required, hint, error, children }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelCls}>
        {label} {required && <span className="text-primary-500">*</span>}
      </label>
      <div className="relative w-full">{children}</div>
      {error ? (
        <p className="px-0.5 text-[12px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        hint && <p className="px-0.5 text-[12px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}

// Text input with a leading icon
function IconInput({ icon: Icon, invalid, className = "", ...props }) {
  return (
    <>
      <Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
      <input className={`${inputCls} pl-10 ${invalid ? errorInput : ""} ${className}`} {...props} />
    </>
  );
}

/* ------------------------- map sync components ---------------------------- */
function ResizeMapObserver({ trigger }) {
  const mapInstance = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => mapInstance.invalidateSize(), 150);
    const t2 = setTimeout(() => mapInstance.invalidateSize(), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [trigger, mapInstance]);
  return null;
}

// Pans to the point whenever it changes (search result or click)
function FollowPoint({ point }) {
  const mapInstance = useMap();
  useEffect(() => {
    if (point) mapInstance.setView([point.lat, point.lng], Math.max(mapInstance.getZoom(), 14), { animate: true });
  }, [point, mapInstance]);
  return null;
}

function MapClickEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function LocationMap({ point, icon, onMapClick, resizeTrigger, popupText }) {
  return (
    <MapContainer
      center={point ? [point.lat, point.lng] : DEFAULT_CENTER}
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
      <FollowPoint point={point} />
      {point && (
        <Marker position={[point.lat, point.lng]} icon={icon}>
          <Popup><span className="text-xs font-semibold">{popupText}</span></Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

/* Wraps children; when `active`, renders them fullscreen via a body portal
   so `fixed` truly escapes any transformed/scrolling ancestor. */
function MapCardShell({ active, children }) {
  if (active) {
    return createPortal(
      <div className="fixed inset-4 z-[99999] flex flex-col gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        {children}
      </div>,
      document.body,
    );
  }
  return (
    <div className="relative flex h-[300px] flex-col gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/40">
      {children}
    </div>
  );
}

/* ------------------------------ place picker ------------------------------ */
const fixed6 = (n) => Number(n).toFixed(6);

/* Address box with OpenStreetMap search, plus a map to drop the exact point.
   The point (lat / lng) is optional; the address is what the API requires. */
function PlacePicker({ id, label, icon: Icon, iconTone, markerIcon: pin, place, onChange, error, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const timer = useRef(null);
  const latest = useRef(0); // newest search / reverse lookup wins
  const wrapRef = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Clicking outside closes the suggestions
  useEffect(() => {
    const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setSuggestions([]);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const search = (q) => {
    clearTimeout(timer.current);
    const seq = ++latest.current;
    if (q.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ format: "json", q: q.trim(), limit: "5" });
        const res = await fetch(`${NOMINATIM}/search?${qs}`);
        const list = res.ok ? await res.json() : [];
        if (seq === latest.current) setSuggestions(Array.isArray(list) ? list : []);
      } catch {
        if (seq === latest.current) setSuggestions([]);
      } finally {
        if (seq === latest.current) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
  };

  const onType = (e) => {
    onChange({ ...place, address: e.target.value });
    search(e.target.value);
  };

  const pick = (item) => {
    ++latest.current;
    clearTimeout(timer.current);
    setSuggestions([]);
    setSearching(false);
    onChange({ address: item.display_name, point: { lat: Number(item.lat), lng: Number(item.lon) } });
  };

  // Map click: set the point now, fill the address from a reverse lookup
  const onMapClick = async (lat, lng) => {
    const seq = ++latest.current;
    clearTimeout(timer.current);
    setSuggestions([]);
    setSearching(true);
    const point = { lat, lng };
    onChange({ ...place, point });
    try {
      const qs = new URLSearchParams({ format: "json", lat: String(lat), lon: String(lng), zoom: "18" });
      const res = await fetch(`${NOMINATIM}/reverse?${qs}`);
      const data = res.ok ? await res.json() : null;
      if (seq === latest.current) onChange({ address: data?.display_name || `${fixed6(lat)}, ${fixed6(lng)}`, point });
    } catch {
      if (seq === latest.current) onChange({ address: `${fixed6(lat)}, ${fixed6(lng)}`, point });
    } finally {
      if (seq === latest.current) setSearching(false);
    }
  };

  const clear = () => {
    ++latest.current;
    clearTimeout(timer.current);
    setSuggestions([]);
    setSearching(false);
    onChange({ address: "", point: null });
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={wrapRef} className="relative z-20">
        <Field label={label} htmlFor={id} required error={error}>
          <IconInput
            id={id}
            icon={Icon}
            value={place.address}
            onChange={onType}
            maxLength={500}
            placeholder={placeholder}
            autoComplete="off"
            invalid={!!error}
            className="pr-10"
          />
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
            {searching ? (
              <Loader2 size={15} className="animate-spin text-slate-400" />
            ) : (
              (place.address || place.point) && (
                <button
                  type="button"
                  onClick={clear}
                  title="Clear"
                  aria-label={`Clear ${label.toLowerCase()}`}
                  className="cursor-pointer rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
                >
                  <X size={15} />
                </button>
              )
            )}
          </span>
        </Field>
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-[13px] shadow-xl dark:border-white/10 dark:bg-ink-900"
            >
              {suggestions.map((item) => (
                <li key={item.place_id ?? `${item.lat},${item.lon}`}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <Icon size={13} className={`mt-[3px] shrink-0 ${iconTone}`} />
                    <span className="line-clamp-2">{item.display_name}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <MapCardShell active={fullscreen}>
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            {place.point ? (
              <span className="font-mono text-slate-600 dark:text-slate-300">
                {fixed6(place.point.lat)}, {fixed6(place.point.lng)}
              </span>
            ) : (
              "Click the map to drop the exact point (optional)"
            )}
          </p>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit full screen" : "Full screen"}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            className="cursor-pointer rounded-lg border border-slate-200 p-1 text-slate-400 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
        {/* isolate: keeps Leaflet's own z-indexes below the suggestion list */}
        <div className="trip-creation-map relative isolate min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
          <LocationMap
            point={place.point}
            icon={pin}
            onMapClick={onMapClick}
            resizeTrigger={fullscreen}
            popupText={label}
          />
        </div>
      </MapCardShell>
    </div>
  );
}

/* --------------------------------- form ----------------------------------- */
const FORM_FIELDS = [
  "vehicle_type", "vehicle", "person_name", "person_number",
  "pickup_location", "pickup_lat", "pickup_long",
  "drop_location", "drop_lat", "drop_long", "trip_start_time",
];

const emptyPlace = { address: "", point: null };

const initialForm = () => ({
  typeName: "",
  vehicleName: "",
  personName: "",
  personNumber: "",
  start: toLocalInput(new Date()),
  pickup: emptyPlace,
  drop: emptyPlace,
});

function validate(f, typeId, vehicleId) {
  const e = {};
  if (typeId == null) e.vehicle_type = "Choose a vehicle type.";
  if (vehicleId == null) e.vehicle = "Choose a vehicle.";
  if (!f.personName.trim()) e.person_name = "Enter the person's name.";
  if (!f.personNumber) e.person_number = "Enter a phone number.";
  else if (f.personNumber.length < 10) e.person_number = "Enter at least 10 digits.";
  if (!fromLocalInput(f.start)) e.trip_start_time = "Enter when the trip starts.";
  if (!f.pickup.address.trim()) e.pickup_location = "Enter the pickup address.";
  if (!f.drop.address.trim()) e.drop_location = "Enter the drop address.";
  return e;
}

const omit = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// Lat / long errors from the API belong to the address field above the map
const placeError = (errors, prefix) =>
  errors[`${prefix}_location`] || errors[`${prefix}_lat`] || errors[`${prefix}_long`];

/* Create Trip — POST /TripCreate/. Calls onCreated(message) once the API
   accepts the trip; onCancel closes without saving. */
export default function TripCreation({ onCreated, onCancel }) {
  const { apiFetch } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const { types, loading: typesLoading, error: typesError } = useVehicleTypes();
  const typeId = useMemo(() => types.find((t) => t.name === form.typeName)?.id ?? null, [types, form.typeName]);

  // Only vehicles of the chosen type: the API rejects any other
  const { vehicles, loading: vehiclesLoading, error: vehiclesError } = useVehicles(typeId, { skip: typeId == null });
  const vehicleId = useMemo(
    () => vehicles.find((v) => v.name === form.vehicleName)?.id ?? null,
    [vehicles, form.vehicleName],
  );

  // Change one value and drop the errors (API field names) it answers
  const update = (key, value, ...errorKeys) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (errorKeys.some((k) => e[k]) ? omit(e, errorKeys) : e));
  };

  const onTypeChange = (name) => {
    setForm((f) => (f.typeName === name ? f : { ...f, typeName: name, vehicleName: "" }));
    setErrors((e) => omit(e, ["vehicle_type", "vehicle"]));
  };

  const submit = async (e) => {
    e.preventDefault();
    const invalid = validate(form, typeId, vehicleId);
    setErrors(invalid);
    setBanner("");
    if (Object.keys(invalid).length) return;

    setBusy(true);
    const { pickup, drop } = form;
    const r = await postJson(apiFetch, EP.create, {
      vehicle_type: Number(typeId),
      vehicle: Number(vehicleId),
      person_name: form.personName.trim(),
      person_number: form.personNumber,
      pickup_location: pickup.address.trim(),
      pickup_lat: pickup.point ? fixed6(pickup.point.lat) : null,
      pickup_long: pickup.point ? fixed6(pickup.point.lng) : null,
      drop_location: drop.address.trim(),
      drop_lat: drop.point ? fixed6(drop.point.lat) : null,
      drop_long: drop.point ? fixed6(drop.point.lng) : null,
      trip_start_time: fromLocalInput(form.start),
    });
    if (r.ok) {
      const no = r.data?.trip_no ?? r.data?.data?.trip_no;
      onCreated(no ? `Trip ${no} created for ${form.vehicleName}.` : `Trip created for ${form.vehicleName}.`);
      return;
    }
    const { inline, banner: text } = splitErrors(r, FORM_FIELDS);
    setErrors(inline);
    setBanner(text);
    setBusy(false);
  };

  const vehiclePlaceholder =
    typeId == null
      ? "Choose a vehicle type first"
      : vehiclesLoading
        ? "Loading vehicles…"
        : vehiclesError
          ? "Couldn't load vehicles"
          : vehicles.length
            ? `Choose vehicle (${vehicles.length})`
            : "No vehicles of this type";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 px-4 py-5 sm:px-6">
      <style>{`
        /* Layer switcher styling (matches Trip Details) */
        .trip-creation-map .leaflet-control-attribution { display: none !important; }
        .trip-creation-map .leaflet-control-layers-toggle { width: 30px !important; height: 30px !important; background-size: 16px 16px !important; border-radius: 8px !important; }
        .trip-creation-map .leaflet-control-layers { border: none !important; border-radius: 10px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important; overflow: hidden; }
        .trip-creation-map .leaflet-control-layers-expanded { padding: 8px 10px !important; background: #fff !important; color: #334155 !important; font-family: system-ui, sans-serif !important; font-size: 13px !important; font-weight: 600 !important; min-width: 130px; }
        .trip-creation-map .leaflet-control-layers-base label { display: flex !important; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 7px; cursor: pointer; margin: 0; }
        .trip-creation-map .leaflet-control-layers-base label:hover { background: #f1f5f9 !important; }
        .trip-creation-map .leaflet-control-layers-selector { margin-right: 2px; accent-color: #6366f1; }
        .trip-creation-map .leaflet-control-layers-separator { display: none; }
      `}</style>

      {/* vehicle, person, time */}
      <div className={`relative z-30 grid grid-cols-1 gap-x-5 gap-y-4 p-5 md:grid-cols-2 xl:grid-cols-3 ${card}`}>
        <Field label="Vehicle Type" required error={errors.vehicle_type}>
          <SearchSelect
            options={types.map((t) => t.name)}
            value={form.typeName}
            onChange={onTypeChange}
            disabled={busy}
            placeholder={
              typesLoading ? "Loading types…" : typesError ? "Couldn't load types" : types.length ? "Choose vehicle type" : "No vehicle types yet"
            }
            icon={Layers}
          />
        </Field>
        <Field label="Vehicle" required error={errors.vehicle}>
          <SearchSelect
            options={vehicles.map((v) => v.name)}
            value={form.vehicleName}
            onChange={(v) => update("vehicleName", v, "vehicle")}
            disabled={busy || typeId == null || vehiclesLoading}
            placeholder={vehiclePlaceholder}
            icon={Car}
          />
        </Field>
        <Field label="Start Time" htmlFor="tcr-start" required error={errors.trip_start_time}>
          <IconInput
            id="tcr-start"
            icon={Clock}
            type="datetime-local"
            value={form.start}
            onChange={(e) => update("start", e.target.value, "trip_start_time")}
            invalid={!!errors.trip_start_time}
          />
        </Field>
        <Field label="Person Name" htmlFor="tcr-name" required error={errors.person_name}>
          <IconInput
            id="tcr-name"
            icon={User}
            value={form.personName}
            onChange={(e) => update("personName", e.target.value, "person_name")}
            maxLength={255}
            placeholder="Who is travelling"
            invalid={!!errors.person_name}
          />
        </Field>
        <Field label="Person Number" htmlFor="tcr-phone" required error={errors.person_number} hint="Digits only">
          <IconInput
            id="tcr-phone"
            icon={Phone}
            type="tel"
            inputMode="numeric"
            value={form.personNumber}
            onChange={(e) => update("personNumber", e.target.value.replace(/\D/g, "").slice(0, 15), "person_number")}
            placeholder="10-digit mobile number"
            invalid={!!errors.person_number}
          />
        </Field>
      </div>

      {/* pickup + drop */}
      <div className={`grid grid-cols-1 gap-5 p-5 lg:grid-cols-2 ${card}`}>
        <PlacePicker
          id="tcr-pickup"
          label="Pickup Location"
          icon={MapPin}
          iconTone="text-emerald-500"
          markerIcon={blueIcon}
          place={form.pickup}
          onChange={(p) => update("pickup", p, "pickup_location", "pickup_lat", "pickup_long")}
          error={placeError(errors, "pickup")}
          placeholder="Search an address, or click the map"
        />
        <PlacePicker
          id="tcr-drop"
          label="Drop Location"
          icon={Flag}
          iconTone="text-rose-500"
          markerIcon={redIcon}
          place={form.drop}
          onChange={(p) => update("drop", p, "drop_location", "drop_lat", "drop_long")}
          error={placeError(errors, "drop")}
          placeholder="Search an address, or click the map"
        />
      </div>

      {banner && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="flex-1 text-[13px] font-medium leading-relaxed text-rose-600 dark:text-rose-400">{banner}</p>
          <button
            type="button"
            onClick={() => setBanner("")}
            title="Dismiss"
            className="shrink-0 cursor-pointer rounded-md p-0.5 text-rose-400 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCancel}
          disabled={busy}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          Cancel
        </motion.button>
        <motion.button
          type="submit"
          whileHover={{ scale: busy ? 1 : 1.03 }}
          whileTap={{ scale: busy ? 1 : 0.97 }}
          disabled={busy}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-70 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Create Trip
        </motion.button>
      </div>
    </form>
  );
}
