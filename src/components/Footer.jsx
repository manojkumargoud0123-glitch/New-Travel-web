import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { Heart, ExternalLink } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();
  const rootRef = useRef(null);

  // Fade in when the footer actually comes into view. (A scroll trigger only
  // fired on scrolling, so on a page that fits the screen — like the
  // dashboard — the footer stayed invisible.)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    let tl;
    const ctx = gsap.context(() => {
      tl = gsap.timeline({ paused: true })
        .from(".ft-inner", { y: 26, opacity: 0, duration: 0.7, ease: "power3.out" })
        .from(".ft-item", { y: 14, opacity: 0, duration: 0.5, ease: "power2.out", stagger: 0.12 }, 0.1);
    }, rootRef);

    if (typeof IntersectionObserver === "undefined") {
      tl.play();
      return () => ctx.revert();
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tl.play();
          io.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);
  return (
    <div>
      <footer ref={rootRef} className="relative mt-8 px-4 pb-5 sm:px-6 lg:px-10">
      {/* faded glow behind the glass bar */}
      <div className="pointer-events-none absolute inset-x-10 bottom-0 h-32 bg-gradient-to-r from-primary-500/20 via-violet-500/15 to-secondary-400/20 blur-3xl" />

<div className="ft-inner relative mx-auto max-w-[1500px] 2xl:max-w-none overflow-hidden rounded-2xl border border-[#FFC107] bg-[#FFED00]/100 shadow-lg shadow-[#FAEA0C]/40 backdrop-blur-xl backdrop-saturate-150 dark:border-[#FFED00]/20 dark:bg-[#FFED00]/10 dark:shadow-black/30">        {/* faded gradient wash inside the glass */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-secondary-500/10" />
<div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl" />
<div className="pointer-events-none absolute -bottom-20 right-10 h-44 w-44 rounded-full bg-secondary-400/15 blur-3xl" />

        <div className="relative flex flex-col items-center justify-between gap-3 px-5 py-4 text-center sm:flex-row sm:gap-4 sm:px-7 sm:text-left">
          {/* left: brand */}
          <div className="ft-item flex items-center gap-2.5">
            {/* <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-white/90 dark:ring-white/10">
              <img
                src="/logo.png"
                alt="Srilalitha"
                className="h-full w-full object-contain"
              />
            </span> */}
            <p className="text-[13px] font-bold tracking-tight text-slate-700 dark:text-slate-200">
              © {year} AP 102. All rights reserved.
            </p>
          </div>

          {/* right: credit */}
          <p className="ft-item flex flex-wrap items-center justify-center gap-1.5 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              Designed and Developed 
              by
            </span>
            <a
              href="https://transglobalgeomatics.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 font-bold text-transparent transition-opacity hover:opacity-80"
            >
              <span className="bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                Trans Global Geomatics Pvt Ltd
              </span>
              <ExternalLink
                size={12}
                className="text-primary-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </p>
        </div>
      </div>
    </footer>
    </div>
  )
}

export default Footer