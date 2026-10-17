/* Ready-made colour palettes for the dashboard. Users only ever pick from
   these — there is no free colour picker. */

// The 10 swatches offered for status colours. Accents are built from them too.
export const COLORS = {
  sky:     { label: "Sky",     400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7" },
  blue:    { label: "Blue",    400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb" },
  indigo:  { label: "Indigo",  400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
  violet:  { label: "Violet",  400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
  fuchsia: { label: "Fuchsia", 400: "#e879f9", 500: "#d946ef", 600: "#c026d3" },
  rose:    { label: "Rose",    400: "#fb7185", 500: "#f43f5e", 600: "#e11d48" },
  orange:  { label: "Orange",  400: "#fb923c", 500: "#f97316", 600: "#ea580c" },
  amber:   { label: "Amber",   400: "#fbbf24", 500: "#f59e0b", 600: "#d97706" },
  emerald: { label: "Emerald", 400: "#34d399", 500: "#10b981", 600: "#059669" },
  teal:    { label: "Teal",    400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488" },
};

// The 8 accent palettes — buttons, card icons, date pills, trend bars.
export const ACCENTS = {
  violet:  { label: "Violet",  from: "violet",  to: "indigo" },
  indigo:  { label: "Indigo",  from: "indigo",  to: "blue" },
  blue:    { label: "Blue",    from: "blue",    to: "sky" },
  sky:     { label: "Sky",     from: "sky",     to: "teal" },
  teal:    { label: "Teal",    from: "teal",    to: "emerald" },
  emerald: { label: "Emerald", from: "emerald", to: "teal" },
  amber:   { label: "Amber",   from: "amber",   to: "orange" },
  rose:    { label: "Rose",    from: "rose",    to: "fuchsia" },
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/* CSS custom properties for one colour, e.g. { "--c-500": "14 165 233" }.
   Elements read them through Tailwind classes like text-[rgb(var(--c-600))],
   so a single class list works for every colour and both themes. */
export const colorVars = (name, prefix = "c") => {
  const c = COLORS[name] || COLORS.sky;
  return {
    [`--${prefix}-400`]: hexToRgb(c[400]),
    [`--${prefix}-500`]: hexToRgb(c[500]),
    [`--${prefix}-600`]: hexToRgb(c[600]),
  };
};

export const accentVars = (accent) => {
  const a = ACCENTS[accent] || ACCENTS.violet;
  return { ...colorVars(a.from, "acc"), ...colorVars(a.to, "acc2") };
};

export const accentColors = (accent) => {
  const a = ACCENTS[accent] || ACCENTS.violet;
  return { from: COLORS[a.from], to: COLORS[a.to] };
};
