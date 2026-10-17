import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import AuthProvider from "./config/AuthContext";
import { useAuth } from "./config/AuthContext";
import Layout from "./components/Layout";
import PageLoader from "./components/PageLoader";
// Auth
const Login = lazy(() => import("./pages/Login"));
// Trips
const TripDetails = lazy(() => import("./pages/Trips/TripDetails"));
// Masters
const VehicleData = lazy(() => import("./pages/Masters/VehicleData"));
const VehicleType = lazy(() => import("./pages/Masters/VehicleType"));
const Geofences = lazy(() => import("./pages/Masters/Geofences"));
// Reports
const VehicleBaseDistance = lazy(() => import("./pages/Reports/VehicleBaseDistance"));

// Standalone
const Logout = lazy(() => import("./pages/Logout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Dashboard2 = lazy(() => import("./pages/Dashboard2"));

/* Guards ------------------------------------------------------------------ */
// Wraps the whole app shell: if not authed, bounce to /login
function RequireAuth({ children }) {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

// Login route: if already authed, skip straight to the dashboard
function PublicOnly({ children }) {
  const { isAuthed } = useAuth();
  if (isAuthed) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public auth route (no navbar) */}
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />

        {/* Everything else is gated behind auth and rendered inside the Layout */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard-2" element={<Dashboard2 />} />

          {/* Trips */}
          <Route path="/trips/trip-details" element={<TripDetails />} />

          {/* Masters */}
          <Route path="/masters/vehicle-data" element={<VehicleData />} />
          <Route path="/masters/vehicle-type" element={<VehicleType />} />
          <Route path="/masters/geofences" element={<Geofences />} />

          {/* Reports */}
          <Route
            path="/reports/vehicle-wise-report"
            element={<VehicleBaseDistance />}
          />

          {/* Logout */}
          <Route path="/logout" element={<Logout />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
