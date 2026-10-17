import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../config/AuthContext";

/* All dashboard data comes from one call: GET /TripDashboard/ on the new
   backend. Cards each read their own object out of the response. */
const EP = "/TripDashboard/";
const REFRESH_MS = 60 * 1000;

export default function useDashboardData() {
  const { apiFetch } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await apiFetch(EP, { method: "GET" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.message || json?.detail || `HTTP ${res.status}`);
      if (!alive.current) return;
      setData(json);
      setError("");
    } catch (e) {
      // apiFetch has already logged the user out on a 401
      if (!alive.current || e?.message === "Session expired") return;
      console.error("dashboard load failed:", e);
      setError("Couldn't load the dashboard. Please try again.");
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, [apiFetch]);

  // Initial load + quiet refresh every minute while the tab is visible
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { data, loading, refreshing, error, reload: load };
}
