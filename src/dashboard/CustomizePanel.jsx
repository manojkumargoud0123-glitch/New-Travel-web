import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { X, GripVertical, EyeOff, Plus, RotateCcw, Check, LayoutGrid, Palette } from "lucide-react";
import { CARDS } from "./cards";
import { COLORS, ACCENTS } from "./palettes.js";
import {
  COLOR_GROUPS, WIDTHS, hideCard, showCard, moveCard, setWidth, setAppearance, setGroupColor,
} from "./settings.js";
import { acc, useMediaQuery } from "./ui.jsx";

const WIDTH_LABEL = { auto: "Auto", s: "S", m: "M", l: "L", full: "Full" };
const WIDTH_OPTIONS = WIDTHS.map((w) => ({ value: w, label: WIDTH_LABEL[w] }));

const Segmented = ({ options, value, onChange, size = "md", label }) => (
  <div role="group" aria-label={label} className="flex w-full rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.06]">
    {options.map((o) => {
      const active = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={active}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 font-bold transition-colors ${
            size === "sm" ? "py-0.5 text-[10.5px]" : "py-1.5 text-[12px]"
          } ${
            active
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {o.icon && <o.icon size={13} />}
          {o.label}
        </button>
      );
    })}
  </div>
);

const Section = ({ title, hint, children }) => (
  <section className="mb-5 last:mb-0">
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
      {hint && <span className="truncate text-[11px] font-medium text-slate-400">{hint}</span>}
    </div>
    {children}
  </section>
);

/* ===== Layout tab ===== */
function LayoutRow({ id, width, onWidth, onHide, onMove }) {
  const controls = useDragControls();
  const card = CARDS[id];
  const Icon = card.icon;

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: "0 16px 32px -14px rgba(15,23,42,0.5)" }}
      className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-1.5 py-2 dark:border-white/10 dark:bg-slate-800"
    >
      <button
        type="button"
        aria-label={`Move ${card.title} (drag, or use the arrow keys)`}
        title="Drag to reorder"
        onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); onMove(-1); }
          if (e.key === "ArrowDown") { e.preventDefault(); onMove(1); }
        }}
        className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-white/10 dark:hover:text-slate-200"
      >
        <GripVertical size={16} />
      </button>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${acc.grad} text-white`}>
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 truncate text-[12.5px] font-bold text-slate-700 dark:text-slate-100">{card.title}</p>
        <Segmented size="sm" label={`${card.title} width`} options={WIDTH_OPTIONS} value={width} onChange={onWidth} />
      </div>
      <button
        type="button"
        onClick={onHide}
        title={`Hide ${card.title}`}
        aria-label={`Hide ${card.title}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
      >
        <EyeOff size={15} />
      </button>
    </Reorder.Item>
  );
}

function LayoutTab({ draft, update }) {
  return (
    <>
      <p className="mb-3 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
        Drag <GripVertical size={12} className="inline -mt-0.5" /> to reorder. S, M and L take 1, 2 and 3 columns; Full takes the whole row.
        The last card in a row widens to fill it. Up to 4 columns fit on wide screens and phones show one card per row.
      </p>

      {draft.order.length === 0 ? (
        <p className="mb-5 rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-[12px] text-slate-400 dark:border-white/15">
          Every card is hidden. Add one back below.
        </p>
      ) : (
        <Reorder.Group
          axis="y"
          values={draft.order}
          onReorder={(order) => update((d) => ({ ...d, order }))}
          className="mb-5 flex flex-col gap-2"
        >
          {draft.order.map((id) => (
            <LayoutRow
              key={id}
              id={id}
              width={draft.widths[id] || "auto"}
              onWidth={(w) => update((d) => setWidth(d, id, w))}
              onHide={() => update((d) => hideCard(d, id))}
              onMove={(dir) => update((d) => moveCard(d, id, dir))}
            />
          ))}
        </Reorder.Group>
      )}

      {draft.hidden.length > 0 && (
        <Section title="Hidden cards">
          <div className="flex flex-col gap-2">
            {draft.hidden.map((id) => {
              const card = CARDS[id];
              const Icon = card.icon;
              return (
                <div key={id} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-2.5 py-2 dark:border-white/15">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/[0.06]">
                    <Icon size={13} />
                  </span>
                  <span className="flex-1 truncate text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">{card.title}</span>
                  <button
                    type="button"
                    onClick={() => update((d) => showCard(d, id))}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${acc.border} ${acc.soft} ${acc.text} ${acc.softHover}`}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}

/* ===== Appearance tab ===== */
function AppearanceTab({ draft, update }) {
  const ap = draft.appearance;
  const set = (patch) => update((d) => setAppearance(d, patch));
  const ring = "ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-slate-900";

  return (
    <>
      <Section title="Accent" hint={ACCENTS[ap.accent]?.label}>
        <div className="grid grid-cols-8 gap-2">
          {Object.entries(ACCENTS).map(([key, a]) => {
            const selected = ap.accent === key;
            return (
              <button
                key={key}
                type="button"
                title={a.label}
                aria-label={`${a.label} accent`}
                aria-pressed={selected}
                onClick={() => set({ accent: key })}
                className={`flex aspect-square items-center justify-center rounded-full transition-transform hover:scale-110 ${selected ? ring : ""}`}
                style={{ background: `linear-gradient(135deg, ${COLORS[a.from][500]}, ${COLORS[a.to][600]})` }}
              >
                {selected && <Check size={14} className="text-white" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Status colors" hint="Picking a used color swaps them">
        <div className="flex flex-col gap-2">
          {Object.entries(COLOR_GROUPS).map(([group, g]) => (
            <div key={group} className="rounded-xl border border-slate-200 px-2.5 py-2 dark:border-white/10">
              <p className="mb-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">{g.label}</p>
              {Object.entries(g.keys).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 py-1">
                  <span className="w-[80px] shrink-0 truncate text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
                  <div className="flex flex-1 flex-wrap gap-[5px]">
                    {Object.entries(COLORS).map(([c, col]) => {
                      const selected = ap.colors[group][key] === c;
                      const usedBy = !selected && Object.keys(ap.colors[group]).find((k) => ap.colors[group][k] === c);
                      return (
                        <button
                          key={c}
                          type="button"
                          title={usedBy ? `${col.label} (swap with ${g.keys[usedBy]})` : col.label}
                          aria-label={`${label}: ${col.label}`}
                          aria-pressed={selected}
                          onClick={() => set({ colors: setGroupColor(ap.colors, group, key, c) })}
                          className={`h-[18px] w-[18px] rounded-full transition-transform hover:scale-110 ${
                            selected ? "ring-2 ring-slate-900 ring-offset-1 ring-offset-white dark:ring-white dark:ring-offset-slate-900" : usedBy ? "opacity-30" : ""
                          }`}
                          style={{ background: col[500] }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Numbers">
        <Segmented
          label="Numbers"
          options={[{ value: "colorful", label: "Colorful" }, { value: "mono", label: "Monochrome" }]}
          value={ap.numbers} onChange={(v) => set({ numbers: v })}
        />
      </Section>

      <Section title="Card style">
        <Segmented
          label="Card style"
          options={[{ value: "solid", label: "Solid" }, { value: "glass", label: "Glass" }, { value: "outlined", label: "Outlined" }]}
          value={ap.cardStyle} onChange={(v) => set({ cardStyle: v })}
        />
      </Section>

      <Section title="Spacing">
        <Segmented
          label="Spacing"
          options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }]}
          value={ap.spacing} onChange={(v) => set({ spacing: v })}
        />
      </Section>

      <Section title="Corners">
        <Segmented
          label="Corners"
          options={[{ value: "sharp", label: "Sharp" }, { value: "default", label: "Default" }, { value: "round", label: "Round" }]}
          value={ap.corners} onChange={(v) => set({ corners: v })}
        />
      </Section>

      <Section title="Animations">
        <button
          type="button"
          role="switch"
          aria-checked={ap.animations}
          onClick={() => set({ animations: !ap.animations })}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left dark:border-white/10"
        >
          <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Count-ups, chart and card motion</span>
          <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ap.animations ? acc.grad : "bg-slate-300 dark:bg-white/15"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${ap.animations ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </button>
      </Section>
    </>
  );
}

/* ===== Panel: side drawer on desktop, bottom sheet on phones ===== */
export default function CustomizePanel({ open, draft, setDraft, dirty, onSave, onCancel, onReset }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [tab, setTab] = useState("layout");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const off = desktop ? { x: 48, opacity: 0 } : { y: "100%" };
  const update = (fn) => setDraft((d) => fn(d));

  return (
    <AnimatePresence>
      {open && draft && (
        <motion.aside
          key="dash-customize"
          role="dialog"
          aria-label="Customize dashboard"
          initial={off}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={off}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[72vh] flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[380px] md:rounded-3xl"
        >
          {!desktop && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-white/20" />}

          <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-3">
            <div>
              <h2 className="font-display text-[15px] font-extrabold text-slate-900 dark:text-white">Customize dashboard</h2>
              <p className="text-[11px] font-medium text-slate-400">Saved for you, in this browser</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close without saving"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X size={17} />
            </button>
          </div>

          <div className="px-4">
            <Segmented
              label="Customize section"
              options={[
                { value: "layout", label: "Layout", icon: LayoutGrid },
                { value: "appearance", label: "Appearance", icon: Palette },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {tab === "layout"
              ? <LayoutTab draft={draft} update={update} />
              : <AppearanceTab draft={draft} update={update} />}
          </div>

          <footer className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10">
            <button
              type="button"
              onClick={onReset}
              title="Back to the default layout and look"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <RotateCcw size={13} /> Reset
            </button>
            <span className="flex-1 truncate text-right text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {dirty ? "Unsaved" : ""}
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-bold text-white shadow-sm transition ${acc.grad} hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Save
            </button>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
