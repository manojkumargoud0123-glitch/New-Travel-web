import React from "react";
import { motion, MotionConfig } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../config/AuthContext";
import useDashboardData from "../dashboard/useDashboardData";
import { DashboardSkeleton, EASE } from "../dashboard2/kit";
import Hero from "../dashboard2/Hero";
import TripOutcomes from "../dashboard2/TripOutcomes";
import FleetHealth from "../dashboard2/FleetHealth";
import TripFeed from "../dashboard2/TripFeed";
import Geofences from "../dashboard2/Geofences";
import Shortcuts from "../dashboard2/Shortcuts";
import "../dashboard2/dashboard2.css";

// Sections rise in one after another on first load
const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* Dashboard 2 — same /TripDashboard/ data as the classic dashboard, laid out
   as a hero (today + trend) over outcome, fleet, activity and shortcut panels. */
const Dashboard2 = () => {
  const { user } = useAuth();
  const { data, loading, refreshing, error, reload } = useDashboardData();

  return (
    <MotionConfig reducedMotion="user">
      <div className="d2 relative mx-auto max-w-[1440px] px-3 py-4 sm:px-5 lg:px-6">
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-2.5 dark:border-rose-500/20 dark:bg-rose-500/10">
            <AlertTriangle size={15} className="shrink-0 text-rose-500" />
            <p className="flex-1 text-[12.5px] font-medium text-rose-600 dark:text-rose-300">
              {error}{data ? " Showing the last loaded data." : ""}
            </p>
            <button
              onClick={() => reload()}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        )}

        {data ? (
          // a manual refresh dims the page instead of swapping in skeletons
          <motion.div
            initial="hidden" animate="show" variants={stagger}
            className={`flex flex-col gap-3 transition-opacity duration-300 sm:gap-4 ${refreshing ? "opacity-70" : ""}`}
          >
            <motion.div variants={rise}>
              <Hero data={data} user={user} refreshing={refreshing} onRefresh={reload} />
            </motion.div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
              <motion.div variants={rise} className="min-w-0 lg:col-span-7">
                <TripOutcomes data={data} />
              </motion.div>
              <motion.div variants={rise} className="min-w-0 lg:col-span-5">
                <FleetHealth data={data} />
              </motion.div>
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
              <motion.div variants={rise} className="min-w-0 lg:col-span-8">
                <TripFeed data={data} />
              </motion.div>
              <motion.div variants={rise} className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:col-span-4">
                <Geofences data={data} />
                <div className="flex-1"><Shortcuts /></div>
              </motion.div>
            </div>
          </motion.div>
        ) : loading ? (
          <DashboardSkeleton />
        ) : null}
      </div>
    </MotionConfig>
  );
};

export default Dashboard2;
