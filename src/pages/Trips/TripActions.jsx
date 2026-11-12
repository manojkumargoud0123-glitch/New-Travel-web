import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Ban, CheckCircle2, X, Loader2, Car, MapPin, Flag, Crosshair, AlertTriangle } from "lucide-react";
import { useAuth } from "../../config/AuthContext";
import SearchSelect from "../../components/SearchSelect";
import { EP, postJson, splitErrors, useVehicles, toLocalInput, fromLocalInput } from "./tripApi";

/* Cancel (optionally reassigning to another vehicle) and manual Close, for one
   trip row from Trip Details. Each dialog calls onDone(message) once the API
   accepts the change; the page then reloads the list. */

/* =========================================================================
   THEME
   ========================================================================= */
const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-white/[0.08] " +
  "bg-white dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-medium " +
  "text-slate-700 dark:text-slate-100 outline-none transition-colors duration-200 " +
  "placeholder:text-slate-400 placeholder:font-normal " +
  "focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 " +
  "hover:border-slate-300 dark:hover:border-white/20 [color-scheme:light] dark:[color-scheme:dark]";

const errorInput = "!border-rose-300 dark:!border-rose-400/40";

const labelCls = "px-0.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300";

const tones = {
  rose: {
    badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    btn: "bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600",
  },
  primary: {
    badge: "bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
    btn: "bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600",
  },
};

/* --------------------------------- pieces --------------------------------- */
function Field({ label, htmlFor, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelCls}>
        {label} {required && <span className="text-primary-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="px-0.5 text-[12px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        hint && <p className="px-0.5 text-[12px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function Banner({ text, onDismiss }) {
  if (!text) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
      <p className="flex-1 text-[13px] font-medium leading-relaxed text-rose-600 dark:text-rose-400">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        title="Dismiss"
        className="shrink-0 cursor-pointer rounded-md p-0.5 text-rose-400 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20"
      >
        <X size={15} />
      </button>
    </div>
  );
}

// Which trip the dialog acts on
function TripSummary({ trip: r }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-display text-[14px] font-extrabold tracking-wide text-rose-500">{r.trip_no}</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-bold text-primary-600 dark:text-primary-400">
          <Car size={13} /> {r.vehicle_unit_name || r.vehicle_registration || "—"}
        </span>
        {r.person_name && (
          <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{r.person_name}</span>
        )}
      </div>
      <div className="mt-1.5 grid gap-1 text-[12.5px] font-medium text-slate-500 dark:text-slate-400 sm:grid-cols-2">
        <span className="flex min-w-0 items-start gap-1.5">
          <MapPin size={12} className="mt-[3px] shrink-0 text-emerald-500" />
          <span className="line-clamp-1" title={r.pickup_location}>{r.pickup_location || "—"}</span>
        </span>
        <span className="flex min-w-0 items-start gap-1.5">
          <Flag size={12} className="mt-[3px] shrink-0 text-rose-500" />
          <span className="line-clamp-1" title={r.drop_location}>{r.drop_location || "—"}</span>
        </span>
      </div>
    </div>
  );
}

/* Modal shell: backdrop, header, scrolling body, footer with the two buttons.
   Escape and the backdrop close it, except while saving. */
function Dialog({ title, subtitle, icon: Icon, tone, busy, submitLabel, submitIcon: SubmitIcon, onClose, onSubmit, children }) {
  const t = tones[tone];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
      />
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        noValidate
        onSubmit={onSubmit}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl shadow-slate-400/30 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-slate-900/90 dark:shadow-black/60"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:px-6">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.badge}`}>
              <Icon size={20} />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-bold text-slate-900 dark:text-white">{title}</h2>
              {subtitle && <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02] sm:px-6">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            disabled={busy}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          >
            Back
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: busy ? 1 : 1.03 }}
            whileTap={{ scale: busy ? 1 : 0.97 }}
            disabled={busy}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors disabled:opacity-70 ${t.btn}`}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <SubmitIcon size={16} />}
            {submitLabel}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}

/* ------------------------------- Cancel trip ------------------------------ */
const CANCEL_FIELDS = ["cancel_reason", "reassign_vehicle"];

export function CancelTripModal({ trip, onClose, onDone }) {
  const { apiFetch } = useAuth();
  const typeId = trip.vehicle_type ?? null;
  const { vehicles, loading, error: vehiclesError } = useVehicles(typeId);

  const [reason, setReason] = useState("");
  const [reassign, setReassign] = useState(""); // vehicle name
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [errors, setErrors] = useState({});

  // Same type as the trip, minus the vehicle it's on now
  const options = useMemo(
    () =>
      vehicles.filter(
        (v) => String(v.id) !== String(trip.vehicle) && v.name !== trip.vehicle_unit_name,
      ),
    [vehicles, trip.vehicle, trip.vehicle_unit_name],
  );
  const target = options.find((v) => v.name === reassign) || null;

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrors({ cancel_reason: "Enter why the trip is being cancelled." });
      setBanner("");
      return;
    }
    setBusy(true);
    setBanner("");
    setErrors({});
    const r = await postJson(apiFetch, EP.cancel, {
      trip_no: trip.trip_no,
      cancel_reason: reason.trim(),
      reassign_vehicle: target ? Number(target.id) : null,
    });
    if (r.ok) {
      onDone(
        target
          ? `Trip ${trip.trip_no} cancelled and reassigned to ${target.name}.`
          : `Trip ${trip.trip_no} cancelled.`,
      );
      return;
    }
    const { inline, banner: text } = splitErrors(r, CANCEL_FIELDS);
    setErrors(inline);
    setBanner(text);
    setBusy(false);
  };

  const scope = typeId != null && trip.vehicle_type_name ? `${trip.vehicle_type_name} vehicles` : "vehicles";

  return (
    <Dialog
      title="Cancel Trip"
      subtitle="Cancel it, or hand it over to another vehicle."
      icon={Ban}
      tone="rose"
      busy={busy}
      submitLabel={target ? "Cancel & Reassign" : "Cancel Trip"}
      submitIcon={Ban}
      onClose={onClose}
      onSubmit={submit}
    >
      <TripSummary trip={trip} />

      <Field label="Reason" htmlFor="tc-reason" required error={errors.cancel_reason}>
        <textarea
          id="tc-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Vehicle broke down, customer cancelled…"
          className={`${inputCls} resize-y ${errors.cancel_reason ? errorInput : ""}`}
          autoFocus
        />
      </Field>

      <Field
        label="Reassign to vehicle (optional)"
        error={errors.reassign_vehicle}
        hint={
          vehiclesError
            ? "Couldn't load vehicles, so the trip can only be cancelled."
            : `Leave empty to just cancel. Lists ${scope} other than the current one.`
        }
      >
        <SearchSelect
          options={options.map((v) => v.name)}
          value={reassign}
          onChange={setReassign}
          disabled={loading || vehiclesError || busy}
          placeholder={
            loading
              ? "Loading vehicles…"
              : vehiclesError
                ? "Couldn't load vehicles"
                : options.length
                  ? `Don't reassign (${options.length} available)`
                  : `No other ${scope}`
          }
          icon={Car}
        />
      </Field>

      <Banner text={banner} onDismiss={() => setBanner("")} />
    </Dialog>
  );
}

/* -------------------------------- Close trip ------------------------------ */
const CLOSE_FIELDS = ["trip_end_time", "close_reason", "end_latitude", "end_longitude", "end_odometer"];

const isNumber = (s) => s.trim() !== "" && Number.isFinite(Number(s));

// Trip start rounded down to the minute: the end-time input has no seconds
const startMinute = (iso) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : Math.floor(t / 60000) * 60000;
};

function validateClose({ end, lat, lng, odo }, trip) {
  const errors = {};
  const endAt = end ? new Date(end).getTime() : NaN;
  const start = startMinute(trip.trip_start_time);
  if (Number.isNaN(endAt)) errors.trip_end_time = "Enter when the trip ended.";
  else if (start !== null && endAt < start) errors.trip_end_time = "End time can't be before the trip started.";
  else if (endAt > Date.now() + 60000) errors.trip_end_time = "End time can't be in the future.";

  const hasLat = lat.trim() !== "";
  const hasLng = lng.trim() !== "";
  if (hasLat && (!isNumber(lat) || Math.abs(Number(lat)) > 90)) errors.end_latitude = "Latitude is a number from -90 to 90.";
  if (hasLng && (!isNumber(lng) || Math.abs(Number(lng)) > 180)) errors.end_longitude = "Longitude is a number from -180 to 180.";
  if (hasLat !== hasLng) errors[hasLat ? "end_longitude" : "end_latitude"] ??= "Enter both latitude and longitude, or neither.";

  if (odo.trim() !== "" && (!isNumber(odo) || Number(odo) < 0)) errors.end_odometer = "Odometer is a number of km, 0 or more.";
  return errors;
}

export function CloseTripModal({ trip, onClose, onDone }) {
  const { apiFetch } = useAuth();
  const [form, setForm] = useState(() => ({
    end: toLocalInput(new Date()),
    reason: "",
    lat: "",
    lng: "",
    odo: "",
  }));
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const hasDrop = trip.dropLat !== null && trip.dropLng !== null;
  const useDropPoint = () => {
    setForm((f) => ({ ...f, lat: String(trip.dropLat), lng: String(trip.dropLng) }));
    setErrors(({ end_latitude, end_longitude, ...rest }) => rest);
  };

  const submit = async (e) => {
    e.preventDefault();
    const invalid = validateClose(form, trip);
    setBanner("");
    setErrors(invalid);
    if (Object.keys(invalid).length) return;

    setBusy(true);
    const r = await postJson(apiFetch, EP.close, {
      trip_no: trip.trip_no,
      trip_end_time: fromLocalInput(form.end),
      close_reason: form.reason.trim() || null,
      end_latitude: form.lat.trim() || null,
      end_longitude: form.lng.trim() || null,
      end_odometer: form.odo.trim() || null,
    });
    if (r.ok) {
      onDone(`Trip ${trip.trip_no} closed.`);
      return;
    }
    const { inline, banner: text } = splitErrors(r, CLOSE_FIELDS);
    setErrors(inline);
    setBanner(text);
    setBusy(false);
  };

  return (
    <Dialog
      title="Close Trip"
      subtitle="Mark the trip as finished."
      icon={CheckCircle2}
      tone="primary"
      busy={busy}
      submitLabel="Close Trip"
      submitIcon={CheckCircle2}
      onClose={onClose}
      onSubmit={submit}
    >
      <TripSummary trip={trip} />

      <Field label="End Time" htmlFor="tcl-end" required error={errors.trip_end_time} hint={trip.startLabel && `Started ${trip.startLabel}`}>
        <input
          id="tcl-end"
          type="datetime-local"
          value={form.end}
          min={toLocalInput(trip.trip_start_time) || undefined}
          max={toLocalInput(new Date())}
          onChange={set("end")}
          className={`${inputCls} ${errors.trip_end_time ? errorInput : ""}`}
        />
      </Field>

      <Field label="Reason (optional)" htmlFor="tcl-reason" error={errors.close_reason}>
        <textarea
          id="tcl-reason"
          rows={2}
          value={form.reason}
          onChange={set("reason")}
          placeholder="e.g. Reached drop, closed manually"
          className={`${inputCls} resize-y ${errors.close_reason ? errorInput : ""}`}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className={labelCls}>End Location (optional)</span>
          {hasDrop && (
            <button
              type="button"
              onClick={useDropPoint}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
            >
              <Crosshair size={13} /> Use drop point
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Latitude" htmlFor="tcl-lat" error={errors.end_latitude}>
            <input
              id="tcl-lat"
              inputMode="decimal"
              maxLength={50}
              value={form.lat}
              onChange={set("lat")}
              placeholder="17.385044"
              className={`${inputCls} font-mono ${errors.end_latitude ? errorInput : ""}`}
            />
          </Field>
          <Field label="Longitude" htmlFor="tcl-lng" error={errors.end_longitude}>
            <input
              id="tcl-lng"
              inputMode="decimal"
              maxLength={50}
              value={form.lng}
              onChange={set("lng")}
              placeholder="78.486671"
              className={`${inputCls} font-mono ${errors.end_longitude ? errorInput : ""}`}
            />
          </Field>
        </div>
      </div>

      <Field label="End Odometer (optional)" htmlFor="tcl-odo" error={errors.end_odometer}>
        <input
          id="tcl-odo"
          inputMode="decimal"
          maxLength={50}
          value={form.odo}
          onChange={set("odo")}
          placeholder="Reading in km"
          className={`${inputCls} ${errors.end_odometer ? errorInput : ""}`}
        />
      </Field>

      <Banner text={banner} onDismiss={() => setBanner("")} />
    </Dialog>
  );
}
