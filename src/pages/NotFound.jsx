import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-[1400px] items-center justify-center px-4 text-center">
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-sky-500/10 blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 text-brand-400 ring-1 ring-brand-400/20">
          <Compass size={30} />
        </div>
        <h1 className="font-display text-6xl font-extrabold text-gradient">404</h1>
        <p className="mt-3 text-[16px] text-slate-500 dark:text-slate-400">
          We couldn't find the page you were looking for.
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/dashboard")}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-brand-500/30"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </motion.button>
      </motion.div>
    </div>
  );
}
