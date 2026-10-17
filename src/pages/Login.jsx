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
      <div className="pointer-events-none absolute -inset-[1.5px] rounded-xl bg-gradient-to-r from-[#f7d98b] via-[#e8b04f] to-[#d4882c] opacity-0 blur-[6px] transition-opacity duration-300 group-focus-within:opacity-30" />
      <Icon
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-white/40 transition-colors duration-300 group-focus-within:text-[#f0c66e]"
      />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="lg-input relative w-full rounded-xl border border-white/[0.12] bg-white/[0.06] py-3.5 pl-10 pr-10 text-[14px] font-medium text-white outline-none transition-all duration-300 placeholder:font-normal placeholder:text-white/35 hover:border-white/20 focus:border-[#e8b04f]/60 focus:bg-white/[0.09]"
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
          0%, 100% { box-shadow: 0 10px 26px -10px rgba(232,176,79,0.40); }
          50%      { box-shadow: 0 16px 38px -8px rgba(232,176,79,0.55); }
        }
        .lg-login-btn {
          background-size: 220% 220%;
          animation: lgGradientFlow 5s ease infinite, lgGlowPulse 3s ease-in-out infinite;
        }
        /* browser autofill would paint the fields white */
        .lg-input:-webkit-autofill,
        .lg-input:-webkit-autofill:hover,
        .lg-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff;
          caret-color: #fff;
          -webkit-box-shadow: 0 0 0 1000px rgba(28, 30, 36, 0.92) inset;
          transition: background-color 9999s ease-out;
        }
      `}</style>

      {/* background image */}
      <div
        className="lg-bg absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/loginimg.png)" }}
      />
      {/* shading: darker on the card side so it reads, the car stays vivid */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/30 sm:via-black/25 sm:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />

      {/* content — a little right of left edge, not centered */}
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:justify-start sm:px-8 lg:pl-16 xl:pl-40">
        <div className="lg-card w-full max-w-[400px]">
          {/* gradient border wrapper */}
          <div className="relative rounded-[28px] bg-gradient-to-br from-amber-100/40 via-white/[0.12] to-white/[0.05] p-px shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85)]">
            <div
              ref={cardRef}
              className="relative flex w-full flex-col overflow-hidden rounded-[27px] bg-[linear-gradient(160deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04)_45%,rgba(10,12,18,0.38))] p-7 backdrop-blur-2xl sm:p-8"
            >
              {/* warm + cool glow inside the card, echoing the photo's lights */}
              <div className="lg-aurora-1 pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-amber-300/[0.08] blur-3xl" />
              <div className="lg-aurora-2 pointer-events-none absolute -bottom-14 -right-12 h-44 w-44 rounded-full bg-sky-400/[0.10] blur-3xl" />
              {/* top sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/60 to-transparent" />

              <Brand />

              <div className="lg-stagger relative mb-1 text-center">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#f0c66e]/85">
                  TGG Travel
                </p>
                <h1 className="font-display text-[24px] font-extrabold tracking-tight text-white drop-shadow">
                  Welcome back 
                </h1>
                <p className="mt-1.5 text-[12.5px] font-medium text-white/60">
                  Sign in to continue to your dashboard
                </p>
              </div>

              {/* gradient divider */}
              <div className="lg-stagger relative mx-auto mt-4 h-px w-2/3 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent" />

              <form
                onSubmit={handleLogin}
                className="relative mt-4 flex flex-1 flex-col gap-3.5"
              >
                <div className="lg-stagger flex flex-col gap-1.5">
                  <label className="px-0.5 text-[11.5px] font-bold uppercase tracking-wider text-white/65">
                    User Id
                  </label>
                  <FieldInput
                    icon={User}
                    placeholder="Username, e-mail or phone"
                    value={loginForm.name}
                    onChange={(e) =>
                      setLoginForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="lg-stagger flex flex-col gap-1.5">
                  <label className="px-0.5 text-[11.5px] font-bold uppercase tracking-wider text-white/65">
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
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-white/45 transition-colors hover:text-amber-200"
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
                      className="rounded-xl border border-rose-400/35 bg-rose-500/15 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-100"
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
                  className="lg-login-btn group lg-stagger relative mt-4 flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#f7d98b] via-[#e8b04f] to-[#d4882c] py-3.5 text-[15px] font-bold text-[#1c1305] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {/* shimmer sweep on hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <LogIn size={18} />
                  {submitting ? "Logging in..." : "Login"}
                </motion.button>

                <div className="lg-stagger mt-1 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-white/50">
                  <ShieldCheck size={13} className="text-amber-300/90" />
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
        <div className="lg-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent,#fde68a,#f59e0b,transparent_70%)] opacity-90 blur-[1px]" />
        {/* second rotating dashed ring (counter-clockwise) */}
        <div className="lg-ring-2 absolute -inset-1.5 rounded-full border border-dashed border-amber-100/30" />
        {/* soft glow halo */}
        <div className="absolute inset-1 rounded-full bg-amber-300/20 blur-md" />
        {/* logo plate */}
        <div className="absolute inset-[4px] flex items-center justify-center overflow-hidden rounded-full bg-[#14161c] p-[3px] shadow-lg shadow-black/40 ring-1 ring-white/10">
          <img
            src="/logo.png"
            alt="TGG Travel"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}