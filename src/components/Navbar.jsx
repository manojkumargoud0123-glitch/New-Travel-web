import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import {
  ChevronDown,
  Menu,
  X,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { nav } from "../data/nav";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../config/AuthContext";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

const isGroupActive = (section, pathname) =>
  section.children?.some((c) => c.to === pathname);

/* ------------------------------------------------------------------ */
/* desktop dropdown (mega-menu)                                       */
/* ------------------------------------------------------------------ */

function DesktopItem({ section, openKey, setOpenKey, alignRight }) {
  const location = useLocation();
  const Icon = section.icon;
  const closeTimer = useRef(null);

  // single link (no children)
  if (!section.children) {
    return (
      <NavLink
        to={section.to}
        className={({ isActive }) =>
          `relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors ${isActive
            ? "text-brand-600 dark:text-brand-300"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              size={16}
              className={isActive ? "text-brand-500" : "text-slate-400"}
            />
            {section.label}
            {isActive && (
              <motion.span
                layoutId="nav-underline"
                className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-brand-500"
              />
            )}
          </>
        )}
      </NavLink>
    );
  }

  const open = openKey === section.label;
  const active = isGroupActive(section, location.pathname);

  const onEnter = () => {
    clearTimeout(closeTimer.current);
    setOpenKey(section.label);
  };
  const onLeave = () => {
    closeTimer.current = setTimeout(
      () => setOpenKey((k) => (k === section.label ? null : k)),
      120,
    );
  };

  const twoCols = section.children.length > 4; // switch to 2 columns past 4 items
  const mid = Math.ceil(section.children.length / 2);
  const columns = twoCols
    ? [section.children.slice(0, mid), section.children.slice(mid)]
    : [section.children];

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        onClick={() => setOpenKey(open ? null : section.label)}
        className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors ${active || open
          ? "text-brand-600 dark:text-brand-300"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
      >
        <Icon
          size={16}
          className={active || open ? "text-brand-500" : "text-slate-400"}
        />
        {section.label}
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
        {active && (
          <motion.span
            layoutId="nav-underline"
            className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-brand-500"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={alignRight ? { right: 0 } : { left: 0 }}
            className="absolute top-[calc(100%+14px)] z-50"
          >
            {/* little arrow — centered under the trigger label */}
            <span
              className="absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white dark:border-white/10 dark:bg-ink-900"
              style={alignRight ? { right: "2.5rem" } : { left: "2.5rem" }}
            />
            <div
              className={`${twoCols ? "w-[460px]" : "w-[300px]"} max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-300/40 backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/95 dark:shadow-black/50`}
            >
              <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Browse
              </p>
              <div className={twoCols ? "grid grid-cols-2 gap-1" : "flex flex-col"}>
                {columns.map((col, ci) => (
                  <div key={ci} className="flex flex-col">
                    {col.map((child) => {
                      const CIcon = child.icon;
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => setOpenKey(null)}
                          className={({ isActive }) =>
                            `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${isActive
                              ? "bg-brand-500/10"
                              : "hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive
                                  ? "bg-brand-500 text-white"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-brand-500/15 group-hover:text-brand-500 dark:bg-white/[0.06] dark:text-slate-300"
                                  }`}
                              >
                                {CIcon && <CIcon size={17} />}
                              </span>
                              <span
                                className={`min-w-0 truncate text-[13.5px] font-semibold ${isActive
                                  ? "text-brand-600 dark:text-brand-300"
                                  : "text-slate-700 dark:text-slate-200"
                                  }`}
                              >
                                {child.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* account dropdown                                                   */
/* ------------------------------------------------------------------ */

function AccountMenu() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();          // <-- add `user`
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ref = useRef(null);

  // derive a display name + email with safe fallbacks
  const displayName =
    user?.name || user?.username || user?.fullName || "User";
  const displayEmail = user?.email || "-";

  useEffect(() => {
    const onDoc = (e) =>
      ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 py-1.5 pl-2 pr-2.5 transition-colors hover:border-brand-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white">
          <User size={15} />
        </span>
        <span className="hidden text-[14px] font-semibold text-slate-800 dark:text-white sm:block">
          {displayName}
        </span>
        <ChevronDown
          size={15}
          className={`text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="menu"
            className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-300/40 backdrop-blur-xl dark:border-white/[0.08] dark:bg-ink-900/95 dark:shadow-black/40"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2 dark:border-white/[0.06]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                <User size={18} />
              </div>
              {/* dropdown header */}
              <div className="min-w-0">

                <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">
                  {displayName}
                </p>

              </div>
            </div>
            <div className="p-1.5">
              {/* Profile / Settings buttons stay commented out as before */}
              <div className="my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
              >
                <LogOut size={17} /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* confirmation modal — portaled to body so fixed positioning is viewport-relative */}
      {createPortal(
        <AnimatePresence>
          {confirmOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmOpen(false)}
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              />
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-ink-900"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                    <LogOut size={22} />
                  </div>
                  <h3 className="font-display text-[18px] font-extrabold text-slate-900 dark:text-white">
                    Log out?
                  </h3>
                  <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">
                    You'll need to sign in again to access your dashboard.
                  </p>
                  <div className="mt-5 flex justify-end gap-2.5">
                    <button
                      onClick={() => setConfirmOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => logout()}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-rose-600"
                    >
                      Logout
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* mobile menu                                                        */
/* ------------------------------------------------------------------ */

function MobileGroup({ section, onNavigate }) {
  const location = useLocation();
  const [open, setOpen] = useState(isGroupActive(section, location.pathname));
  const Icon = section.icon;

  if (!section.children) {
    return (
      <NavLink
        to={section.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${isActive
            ? "bg-brand-500/10 text-brand-600 dark:text-brand-300"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
          }`
        }
      >
        <Icon size={18} className="text-slate-400" /> {section.label}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-3">
          <Icon size={18} className="text-slate-400" /> {section.label}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-[26px] mt-1 flex flex-col gap-0.5 border-l border-slate-200 pl-3 dark:border-white/[0.06]">
              {section.children.map((child) => {
                const CIcon = child.icon;
                return (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${isActive
                        ? "bg-brand-500/10 font-semibold text-brand-500 dark:text-brand-300"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.03]"
                      }`
                    }
                  >
                    {CIcon && (
                      <CIcon size={15} className="shrink-0 opacity-70" />
                    )}
                    <span className="truncate">{child.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main navbar                                                        */
/* ------------------------------------------------------------------ */

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const [openKey, setOpenKey] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".nb-item", {
        y: -16,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
        stagger: 0.05,
        clearProps: "opacity,transform",
      });
    }, barRef);
    return () => ctx.revert();
  }, []);

  // frosted blur intensifies on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={barRef} className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      {/* frosted blur covering the gap above the bar — always on, stronger on scroll */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{
          backdropFilter: `blur(${scrolled ? 16 : 10}px)`,
          WebkitBackdropFilter: `blur(${scrolled ? 16 : 10}px)`,
          maskImage: "linear-gradient(to bottom, black 78%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent)",
          transition: "backdrop-filter 0.3s ease",
        }}
      />
      <header
        className={`mx-auto flex max-w-[1500px] 2xl:max-w-none items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-4 ${scrolled
          ? "border-[#e6d500] bg-[#FFED00]/90 shadow-xl shadow-[#FAEA0C]/30 dark:border-[#FFED00]/30 dark:bg-[#FFED00]/15 dark:shadow-black/40"
          : "border-[#FFED00] bg-[#FFED00]/80 shadow-lg shadow-[#FAEA0C]/40 dark:border-[#FFED00]/20 dark:bg-[#FFED00]/10 dark:shadow-black/30"
          }`}
      >
        {/* logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="nb-item flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-white/90 dark:ring-white/10">
              <img
                src="/logo.png"
                alt="Srilalitha"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="hidden font-display text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white sm:block">
              AP <span className="text-gradient">102</span>
            </span>
          </div>
        </Link>

        {/* center nav (desktop) */}
        <nav className="nb-item hidden min-w-0 items-center gap-0.5 xl:flex">
          {nav.map((section, i) => (
            <DesktopItem
              key={section.label}
              section={section}
              openKey={openKey}
              setOpenKey={setOpenKey}
              alignRight={i >= nav.length - 2}
            />
          ))}
        </nav>

        {/* right actions */}
        <div className="nb-item flex shrink-0 items-center gap-1.5">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </motion.span>
          </button>

          <div className="mx-0.5 hidden h-6 w-px bg-slate-200 dark:bg-white/[0.08] sm:block" />

          <AccountMenu />

          {/* mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.05] xl:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden"
            />
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 right-0 z-50 flex w-[300px] flex-col border-l border-slate-200 bg-white dark:border-white/[0.06] dark:bg-ink-900 xl:hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-white/90 dark:ring-white/10">
                    <img
                      src="/lalitha-logo.png"
                      alt="Srilalitha"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="font-display text-[16px] font-extrabold text-slate-900 dark:text-white">
                    Srilalitha <span className="text-gradient">Rice Mill</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-slate-400"
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3">
                {nav.map((section) => (
                  <MobileGroup
                    key={section.label}
                    section={section}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}