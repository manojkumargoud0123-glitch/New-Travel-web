import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { LogOut, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../config/AuthContext";

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const cardRef = useRef(null);
  const iconWrapRef = useRef(null);
  const iconRef = useRef(null);
  const ringRef = useRef(null);
  const [leaving, setLeaving] = useState(false);

  const confirmLogout = () => {
    if (leaving) return;
    setLeaving(true);

    const tl = gsap.timeline({
      onComplete: () => {
        logout();
        navigate("/login", { replace: true });
      },
    });

    // 1) pulse the ring outward
    tl.fromTo(
      ringRef.current,
      { scale: 0.6, opacity: 0.6 },
      { scale: 1.8, opacity: 0, duration: 0.7, ease: "power2.out" },
      0,
    );
    // 2) spin + lift the logout icon
    tl.to(
      iconRef.current,
      { rotate: -360, y: -6, duration: 0.7, ease: "back.in(1.6)" },
      0,
    );
    // 3) the door-swing: icon wrapper tips and fades
    tl.to(
      iconWrapRef.current,
      { rotateY: 90, opacity: 0, duration: 0.45, ease: "power2.in" },
      0.45,
    );
    // 4) whole card lifts away and fades
    tl.to(
      cardRef.current,
      { y: -28, scale: 0.94, opacity: 0, duration: 0.5, ease: "power3.in" },
      0.4,
    );
  };

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-[1400px] items-center justify-center px-4">
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-rose-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-brand-500/15 blur-[130px]" />

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-white/70 dark:bg-ink-900/50 glass p-8 text-center shadow-xl shadow-slate-200/40 dark:shadow-black/30"
        style={{ perspective: "1000px" }}
      >
        {/* icon with pulsing ring */}
        <div
          className="relative mx-auto mb-6 h-16 w-16"
          style={{ perspective: "600px" }}
        >
          <span
            ref={ringRef}
            className="absolute inset-0 rounded-2xl ring-2 ring-rose-400/50"
          />
          <div
            ref={iconWrapRef}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400/20 to-rose-600/20 text-rose-400 ring-1 ring-rose-400/20"
            style={{ transformStyle: "preserve-3d" }}
          >
            <span ref={iconRef} className="inline-flex">
              <LogOut size={28} />
            </span>
          </div>
        </div>

        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {leaving ? "Signing you out…" : "Log out of Srilalita?"}
        </h1>
        <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">
          {leaving
            ? "See you again soon."
            : "You'll need to sign in again to access your workspace."}
        </p>

        <AnimatePresence mode="wait">
          {!leaving && (
            <motion.div
              key="actions"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-7 flex flex-col gap-2.5 sm:flex-row"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/dashboard")}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-medium text-slate-600 dark:text-slate-300 transition-colors hover:border-brand-400/50"
              >
                <ArrowLeft size={16} /> Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmLogout}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-rose-500/30"
              >
                <LogOut size={16} /> Log out
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {leaving && (
          <div className="mt-7 flex items-center justify-center gap-2 text-[14px] font-semibold text-rose-500">
            <Loader2 size={16} className="animate-spin" /> Logging out
          </div>
        )}
      </motion.div>
    </div>
  );
}
