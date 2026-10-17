import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { User, Lock, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "../config/AuthContext";

/* shared input shell ------------------------------------------------------- */
function FieldInput({
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  trailing,
}) {
  return (
    <div className="group relative">
      {/* focus glow ring */}
      <div className="pointer-events-none absolute -inset-[1.5px] rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-teal-400 opacity-0 blur-[5px] transition-opacity duration-300 group-focus-within:opacity-50" />
      <Icon
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-indigo-600"
      />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="relative w-full rounded-xl border border-white/80 bg-white py-3.5 pl-10 pr-10 text-[14px] font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-300"
      />
      {trailing}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const cardRef = useRef(null);
  const rootRef = useRef(null);
  const [showPwd, setShowPwd] = useState(false);

  const [loginForm, setLoginForm] = useState({ name: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shake = () =>
    gsap.fromTo(
      cardRef.current,
      { x: -10 },
      { x: 0, duration: 0.5, ease: "elastic.out(1, 0.35)" },
    );

  /* entrance + ambient animations */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lg-bg", { scale: 1.12, duration: 1.8, ease: "power2.out" });
      gsap.from(".lg-card", {
        y: 44,
        opacity: 0,
        scale: 0.95,
        duration: 0.85,
        ease: "power3.out",
      });
      gsap.from(".lg-stagger", {
        y: 16,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.07,
        delay: 0.4,
      });
      gsap.to(".lg-aurora-1", {
        x: 26,
        y: -18,
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      gsap.to(".lg-aurora-2", {
        x: -22,
        y: 18,
        duration: 9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      /* rotating ring behind the logo (clockwise) */
      gsap.to(".lg-ring", {
        rotate: 360,
        duration: 8,
        ease: "none",
        repeat: -1,
      });
      /* second ring spinning the other way, slower */
      gsap.to(".lg-ring-2", {
        rotate: -360,
        duration: 14,
        ease: "none",
        repeat: -1,
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginForm.name.trim()) {
      setError("Please enter your username.");
      shake();
      return;
    }

    if (!loginForm.password.trim()) {
      setError("Please enter your password.");
      shake();
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    const res = await login(loginForm.name, loginForm.password);

    setSubmitting(false);

    if (res.ok) {
      setError("");
      navigate("/dashboard", { replace: true });
    } else {
      setError(res.error);
      shake();
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative min-h-[100dvh] w-full overflow-hidden bg-slate-900"
    >
      {/* keyframes for animated button gradient + glow pulse */}
      <style>{`
        @keyframes lgGradientFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes lgGlowPulse {
          0%, 100% { box-shadow: 0 10px 26px -8px rgba(99,102,241,0.55); }
          50%      { box-shadow: 0 16px 40px -6px rgba(45,212,191,0.75); }
        }
        .lg-login-btn {
          background-size: 220% 220%;
          animation: lgGradientFlow 5s ease infinite, lgGlowPulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* JSSK ambulance background image */}
      <div
        className="lg-bg absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/jssk-bg.png)" }}
      />
      {/* tint + vignette so the glass card always reads */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/45 to-slate-900/15 sm:to-transparent" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-indigo-500/30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-teal-400/20 blur-[120px]" />

      {/* content — a little right of left edge, not centered */}
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:justify-start sm:px-8 lg:pl-24 xl:pl-60">
        <div className="lg-card w-full max-w-[400px]">
          {/* gradient border wrapper */}
          <div className="relative rounded-[28px] bg-gradient-to-br from-white/80 via-white/30 to-white/10 p-[1.5px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)]">
            <div
              ref={cardRef}
              className="relative flex w-full flex-col overflow-hidden rounded-[27px] bg-white/15 p-7 backdrop-blur-2xl backdrop-saturate-150 sm:p-8"
            >
              {/* aurora glow blobs inside card */}
              <div className="lg-aurora-1 pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/25 blur-3xl" />
              <div className="lg-aurora-2 pointer-events-none absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-teal-400/25 blur-3xl" />
              {/* top sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

              <Brand />

              <div className="lg-stagger relative mb-1 text-center">
                <h1 className="font-display text-[24px] font-extrabold tracking-tight text-white drop-shadow">
                  Welcome back 
                </h1>
                <p className="mt-1.5 text-[12.5px] font-medium text-white/65">
                  Sign in to continue to your dashboard
                </p>
              </div>

              {/* gradient divider */}
              <div className="lg-stagger relative mx-auto mt-4 h-px w-2/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <form
                onSubmit={handleLogin}
                className="relative mt-4 flex flex-1 flex-col gap-3.5"
              >
                <div className="lg-stagger flex flex-col gap-1.5">
                  <label className="px-0.5 text-[12px] font-bold uppercase tracking-wider text-white/75">
                    User Id
                  </label>
                  <FieldInput
                    icon={User}
                    placeholder="Enter your UserName / E-mail / Phone No."
                    value={loginForm.name}
                    onChange={(e) =>
                      setLoginForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="lg-stagger flex flex-col gap-1.5">
                  <label className="px-0.5 text-[12px] font-bold uppercase tracking-wider text-white/75">
                    Password
                  </label>
                  <FieldInput
                    icon={Lock}
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((f) => ({ ...f, password: e.target.value }))
                    }
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-indigo-600"
                      >
                        {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    }
                  />
                </div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.2, ease: "easeOut" },
                      }}
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                      className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-600"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="lg-login-btn group lg-stagger relative mt-4 flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-teal-500 py-3.5 text-[15px] font-bold text-white transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {/* shimmer sweep on hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <LogIn size={18} />
                  {submitting ? "Logging in..." : "Login"}
                </motion.button>

                <div className="lg-stagger mt-1 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-white/55">
                  <ShieldCheck size={13} className="text-teal-300" />
                  Secured  login
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* brand header ------------------------------------------------------------ */
function Brand() {
  return (
    <div className="relative mb-3 flex flex-col items-center">
      <div className="relative h-[72px] w-[72px]">
        {/* rotating gradient ring (clockwise) */}
        <div className="lg-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent,#6366f1,#a855f7,#2dd4bf,transparent)] opacity-90 blur-[1px]" />
        {/* second rotating dashed ring (counter-clockwise) */}
        <div className="lg-ring-2 absolute -inset-1.5 rounded-full border-2 border-dashed border-white/35" />
        {/* mask ring center so only the rim shows */}
        <div className="absolute inset-[3px] rounded-full bg-transparent" />
        {/* soft glow halo */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-indigo-500/40 to-teal-400/40 blur-md" />
        {/* logo plate */}
        <div className="absolute inset-[6px] flex items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg shadow-black/25 ring-1 ring-white/80">
          <img
            src="/logo.png"
            alt="AP 102"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}