import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTheme } from "../context/ThemeContext";
import { withUserContext, userContextFromLogin, saveUserContext } from "./userContext";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// The one backend this app talks to (Travel API) — login, logout and every
// apiFetch() call. Requests carry `Authorization: Token <token>` (the `token`
// returned by /Login/) plus the caller's username / role_id / role_name
// (see ./userContext.js).
export const API_ORIGIN = "https://49.206.196.35:8030";

// Browsers won't let the live HTTPS site call the API directly: its
// certificate is self-signed, so they don't trust it. So on HTTPS pages calls
// go to /api on the same domain, where public/api/index.php forwards them to
// API_ORIGIN. Plain-HTTP pages (localhost, port 8008) call the API directly,
// which works only once that browser has accepted the certificate.
export const API_BASE =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? "/api"
    : API_ORIGIN;

const TOKEN_KEY = "auth_token";

const TAB_INACTIVE_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours hidden → logout

const authHeader = (token) => (token ? { Authorization: `Token ${token}` } : {});

// localStorage keys that survive logout: per-user dashboard settings ("dash."),
// light/dark choices ("theme", "theme.<username>") and the browser-local
// master lists ("masters.", Vehicle Type / Geofences have no API yet).
const KEEP_ON_LOGOUT = ["dash.", "theme", "masters."];
const THEME_USER_PREFIX = "theme.";

const clearSessionStorage = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => !KEEP_ON_LOGOUT.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    try { localStorage.clear(); } catch { /* storage unavailable */ }
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme() || {};

  // Logout handler (declared early so effects/apiFetch can call it).
  // Stable identity so consumers' useCallback/useEffect deps don't churn.
  const logout = useCallback(async () => {
    // Read before clearSessionStorage() below — the logout call needs the
    // still-valid token to identify which session to end.
    const token = localStorage.getItem(TOKEN_KEY);

    try {
      if (token) {
        const { url, init } = withUserContext(`${API_BASE}/Logout/`, { method: "POST" });
        await fetch(url, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            ...authHeader(token),
          },
        });
      }
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      setUser(null);
      clearSessionStorage();
      window.location.href = "/";
    }
  }, []);

  // Theme memory: each user's light/dark choice is saved under their name and
  // re-applied when they log in, instead of inheriting whatever was last used.
  const themeAppliedFor = useRef(null);
  useEffect(() => {
    const name = user?.username;
    if (!name || !setTheme) {
      themeAppliedFor.current = null;
      return;
    }
    const key = `${THEME_USER_PREFIX}${name}`;
    if (themeAppliedFor.current !== name) {
      themeAppliedFor.current = name;
      let saved = null;
      try { saved = localStorage.getItem(key); } catch { /* storage unavailable */ }
      if ((saved === "light" || saved === "dark") && saved !== theme) {
        setTheme(saved); // the next run (theme changed) stores it
        return;
      }
    }
    try { localStorage.setItem(key, theme); } catch { /* storage unavailable */ }
  }, [user?.username, theme, setTheme]);

  // Auto-logout when tab stays hidden too long
  useEffect(() => {
    if (!user?.authenticated) return;

    const isExpired = () => {
      const hiddenAt = parseInt(localStorage.getItem("tab_hidden_at") || "0", 10);
      return hiddenAt && Date.now() - hiddenAt > TAB_INACTIVE_LIMIT_MS;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        localStorage.setItem("tab_hidden_at", Date.now().toString());
      } else {
        if (isExpired()) {
          sessionStorage.setItem("session_expired", "1");
          localStorage.removeItem("tab_hidden_at");
          logout();
          return;
        }
        localStorage.removeItem("tab_hidden_at");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    if (document.visibilityState === "hidden") {
      localStorage.setItem("tab_hidden_at", Date.now().toString());
    }

    const interval = setInterval(() => {
      if (isExpired()) {
        sessionStorage.setItem("session_expired", "1");
        localStorage.removeItem("tab_hidden_at");
        logout();
      }
    }, 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userData = localStorage.getItem("user");

    if (token && userData) {
      setUser(JSON.parse(userData));
    } else {
      setUser(null);
    }

    setLoading(false);
  }, []);

  // Login handler — POST /Login/ on the new backend
  const login = useCallback(async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/Login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.token) {
        let message = "Invalid username or password";

        if (typeof data?.message === "string") {
          message = data.message;
        } else if (typeof data?.detail === "string") {
          message = data.detail;
        } else if (typeof data?.error === "string") {
          message = data.error;
        } else if (Array.isArray(data?.detail)) {
          message = data.detail.map((e) => e.msg).join(", ");
        }

        return {
          ok: false,
          error: message,
        };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.access_token) localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      if (data.device_id) localStorage.setItem("device_id", data.device_id);
      if (data.session_id) localStorage.setItem("session_id", data.session_id);

      const u = data.user || {};
      const role = u.user_role || { role_id: u.role_id, role_name: u.role_name };
      const userData = {
        authenticated: true,
        id: u.employee_id,
        employeeId: u.employee_id,
        username: u.username,
        name: u.name,
        email: u.email,
        phoneNumber: u.phone_number,
        address: u.address,
        roleId: role.role_id,
        roleName: role.role_name,
        roles: role.role_id != null ? [{ id: role.role_id, name: role.role_name }] : [],
        firstLogin: false,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      // username / role_id / role_name, exactly as the login returned them —
      // apiFetch sends these with every request
      saveUserContext(userContextFromLogin(u));
      localStorage.setItem("show_tour", "1");

      return { ok: true, firstLogin: userData.firstLogin };
    } catch (error) {
      console.error("Login API failed:", error);
      return { ok: false, error: "Network error. Please try again." };
    }
  }, []);

  // Fetch helper for the API — prefixes API_BASE, attaches
  // `Authorization: Token <token>`, and logs out on 401.
  // Stable identity (only depends on the stable `logout`) so pages that wrap
  // their loaders in useCallback([apiFetch, ...]) don't refetch on every
  // provider re-render.
  //
  // Every call also carries username / role_id / role_name (query string for
  // GET, merged into the body otherwise) — see ./userContext.js. `body` may be
  // a plain object; it's sent as JSON. Pass { withUser: false } to opt out.
  const apiFetch = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const { url, init } = withUserContext(`${API_BASE}${path}`, options);

    // FormData / URLSearchParams set their own Content-Type (with boundary)
    const ownType =
      init.body instanceof FormData || init.body instanceof URLSearchParams;

    const headers = {
      accept: "application/json",
      ...authHeader(token),
      ...(ownType ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    };

    const res = await fetch(url, { ...init, headers });

    if (res.status === 401) {
      sessionStorage.setItem("session_expired", "1");
      logout();
      throw new Error("Session expired");
    }
    return res;
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user?.authenticated,
      loading,
      login,
      logout,
      API_BASE,
      apiFetch,
    }),
    [user, loading, login, logout, apiFetch],
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
