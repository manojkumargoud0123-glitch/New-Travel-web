import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../config/AuthContext";

/* =========================================================================
   TRAVEL API — shared by Trip Details, the Create Trip form, the
   Cancel / Close dialogs and the Vehicle Type master (all through apiFetch:
   token + username / role_id / role_name).

   GET  /VehicleTypeNewFilter/          → { units: [{ id, vehicle_type_name }] }
   POST /VehicleTypeADD/ { add_vehicle_type }
   POST /VehicleTypeEDIT/ { vehicle_type_id, add_vehicle_type }
        (there is no delete)
   GET  /VehiclesDropdownByType/?vehicle_type_new=<type id>
                                        → { results: [{ unit_id, unit_name }] }
        (without the param it lists every vehicle)
   POST /TripList/ { vehicle_type, vehicle_number, from_date, to_date }
                                        → { results: [trip, …] }
        One row per trip: the latest leg of its reassign chain, earlier legs
        under previous_trips. The API has no paging, search or sort, so all
        three happen in the browser (TanStack Table).
   POST /TripCreate/ { vehicle_type, vehicle (unit_id), person_name,
        person_number, pickup_location, pickup_lat?, pickup_long?,
        drop_location, drop_lat?, drop_long?, trip_start_time }
        The vehicle must belong to the vehicle type.
   POST /TripCancel/ { trip_no, cancel_reason, reassign_vehicle? (unit_id) }
        With reassign_vehicle the trip carries on as a new leg on that vehicle.
   POST /TripClose/ { trip_no, trip_end_time, close_reason?, end_latitude?,
        end_longitude?, end_odometer? }

   Failures: { status: "error", errors: { <field>: ["message", …] } }
   ========================================================================= */
export const EP = {
  types: "/VehicleTypeNewFilter/",
  typeAdd: "/VehicleTypeADD/",
  typeEdit: "/VehicleTypeEDIT/",
  vehicles:"/VehiclesDropdownByType/",
  trips: "/TripList/",
  create: "/TripCreate/",
  cancel: "/TripCancel/",
  close: "/TripClose/",
};

export const listOf = (data, key) =>
  Array.isArray(data?.[key]) ? data[key] : Array.isArray(data) ? data : [];

export const naturalSort = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

// { field: "message message" } from the API's `errors` object
export function fieldErrors(data) {
  const errors = data?.errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};
  const out = {};
  for (const [k, v] of Object.entries(errors)) {
    const text = (Array.isArray(v) ? v : [v]).filter((m) => typeof m === "string").join(" ");
    if (text) out[k] = text;
  }
  return out;
}

export const apiError = (res, data) =>
  (typeof data?.message === "string" && data.message) ||
  (typeof data?.detail === "string" && data.detail) ||
  (typeof data?.error === "string" && data.error) ||
  Object.values(fieldErrors(data)).join(" ") ||
  `Request failed (${res.status})`;

const networkError = (e) =>
  e instanceof TypeError
    ? "Couldn't reach the server. Check your connection and try again."
    : e.message || "Something went wrong. Please try again.";

/* POST a JSON body. Resolves to { ok, data } or { ok: false, error, fields };
   never throws. */
export async function postJson(apiFetch, path, body) {
  try {
    const res = await apiFetch(path, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.status !== "error" && data?.success !== false) return { ok: true, data };
    return { ok: false, error: apiError(res, data), fields: fieldErrors(data) };
  } catch (e) {
    return { ok: false, error: networkError(e), fields: {} };
  }
}

/* A failed postJson() result → messages for the form's own fields, plus one
   banner message for everything else (e.g. trip_no, server errors). */
export function splitErrors({ error, fields = {} }, formFields) {
  const inline = {};
  const rest = [];
  for (const [k, v] of Object.entries(fields)) {
    if (formFields.includes(k)) inline[k] = v;
    else rest.push(v);
  }
  const banner = rest.length
    ? rest.join(" ")
    : Object.keys(inline).length
      ? "Please fix the highlighted fields."
      : error;
  return { inline, banner };
}

/* Vehicle types: { types: [{ id, name }], loading, error, reload }.
   reload() fetches again; the current list stays until the new one arrives. */
export function useVehicleTypes() {
  const { apiFetch } = useAuth();
  const [state, setState] = useState({ types: [], loading: true, error: false });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    setState((s) => (s.loading ? s : { ...s, loading: true }));
    (async () => {
      try {
        const res = await apiFetch(EP.types);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiError(res, data));
        if (!alive) return;
        const types = listOf(data, "units")
          .map((u) => ({ id: u.id, name: u.vehicle_type_name }))
          .filter((t) => t.id != null && t.name);
        setState({ types, loading: false, error: false });
      } catch {
        if (alive) setState({ types: [], loading: false, error: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiFetch, version]);

  return { ...state, reload };
}

/* Vehicles of one type, every vehicle when typeId is null, none while
   `skip`: { vehicles: [{ id: unit_id, name: unit_name }], loading, error },
   sorted by name. */
export function useVehicles(typeId, { skip = false } = {}) {
  const { apiFetch } = useAuth();
  const [state, setState] = useState({ vehicles: [], loading: !skip, error: false });

  useEffect(() => {
    if (skip) {
      setState({ vehicles: [], loading: false, error: false });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const qs = typeId != null ? `?vehicle_type_new=${encodeURIComponent(typeId)}` : "";
        const res = await apiFetch(`${EP.vehicles}${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiError(res, data));
        if (!alive) return;
        const seen = new Set();
        const vehicles = listOf(data, "results")
          .map((v) => ({ id: v.unit_id, name: v.unit_name }))
          .filter((v) => v.id != null && v.name && !seen.has(v.name) && seen.add(v.name))
          .sort((a, b) => naturalSort(a.name, b.name));
        setState({ vehicles, loading: false, error: false });
      } catch {
        if (alive) setState({ vehicles: [], loading: false, error: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiFetch, typeId, skip]);

  return state;
}

/* ------------------------------- date helpers ------------------------------ */
// Date → "yyyy-mm-ddThh:mm" in local time, for <input type="datetime-local">
export const toLocalInput = (d) => {
  const t = d instanceof Date ? d.getTime() : Date.parse(d);
  if (Number.isNaN(t)) return "";
  const local = new Date(t - new Date(t).getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

// <input type="datetime-local"> value (local time) → ISO string in UTC
export const fromLocalInput = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};
