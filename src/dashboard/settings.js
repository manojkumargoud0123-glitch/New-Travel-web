import { COLORS, ACCENTS } from "./palettes.js";

/* Per-user dashboard settings, kept in this browser's localStorage.
   Pure JS (no React) so the clean-up logic can be tested on its own. */

export const CARD_IDS = [
  "tripOverview",
  "fleetOverview",
  "geofences",
  "tripTrend",
  "recentTrips",
];

export const WIDTHS = ["auto", "s", "m", "l", "full"];

// Status colours, grouped. Within a group no two entries may share a colour.
export const COLOR_GROUPS = {
  trips: { label: "Trip status", keys: { active: "Active", completed: "Completed", cancelled: "Cancelled" } },
  fleet: { label: "Vehicles", keys: { active: "Active", connected: "Connected", disconnected: "Disconnected" } },
  geofences: { label: "Geofences", keys: { plants: "Plants", sites: "Sites" } },
};

export const DEFAULT_COLORS = {
  trips: { active: "sky", completed: "emerald", cancelled: "rose" },
  fleet: { active: "violet", connected: "emerald", disconnected: "rose" },
  geofences: { plants: "emerald", sites: "sky" },
};

export const OPTIONS = {
  numbers: ["colorful", "mono"],
  cardStyle: ["solid", "glass", "outlined"],
  spacing: ["compact", "comfortable"],
  corners: ["sharp", "default", "round"],
};

export const STORAGE_PREFIX = "dash.";
export const storageKey = (user) => `${STORAGE_PREFIX}settings.v1.${user || "default"}`;

export const defaultSettings = () => ({
  version: 1,
  order: [...CARD_IDS],
  hidden: [],
  widths: {},
  appearance: {
    accent: "violet",
    colors: JSON.parse(JSON.stringify(DEFAULT_COLORS)),
    numbers: "colorful",
    cardStyle: "glass",
    spacing: "compact",
    corners: "default",
    animations: true,
  },
});

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

const cleanIds = (list, exclude = new Set()) => {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const id of list) {
    if (CARD_IDS.includes(id) && !exclude.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
};

// A group is kept only if every key has a known colour and none repeat;
// otherwise the whole group falls back to its defaults.
const cleanColorGroup = (raw, group) => {
  const defaults = DEFAULT_COLORS[group];
  if (!isObj(raw)) return { ...defaults };
  const out = {};
  for (const key of Object.keys(defaults)) {
    out[key] = COLORS[raw[key]] ? raw[key] : defaults[key];
  }
  const used = Object.values(out);
  return new Set(used).size === used.length ? out : { ...defaults };
};

/* Turn whatever was stored (old versions, hand-edited, corrupt) into valid
   settings. Unknown cards are dropped; cards added since the settings were
   saved are appended so they show up. */
export function sanitize(raw) {
  const base = defaultSettings();
  if (!isObj(raw)) return base;

  const order = cleanIds(raw.order);
  const hidden = cleanIds(raw.hidden, new Set(order));
  for (const id of CARD_IDS) {
    if (!order.includes(id) && !hidden.includes(id)) order.push(id);
  }

  const widths = {};
  if (isObj(raw.widths)) {
    for (const [id, w] of Object.entries(raw.widths)) {
      if (CARD_IDS.includes(id) && WIDTHS.includes(w) && w !== "auto") widths[id] = w;
    }
  }

  const ra = isObj(raw.appearance) ? raw.appearance : {};
  const da = base.appearance;
  const colors = {};
  for (const group of Object.keys(DEFAULT_COLORS)) {
    colors[group] = cleanColorGroup(isObj(ra.colors) ? ra.colors[group] : null, group);
  }

  return {
    version: 1,
    order,
    hidden,
    widths,
    appearance: {
      accent: ACCENTS[ra.accent] ? ra.accent : da.accent,
      colors,
      numbers: pick(ra.numbers, OPTIONS.numbers, da.numbers),
      cardStyle: pick(ra.cardStyle, OPTIONS.cardStyle, da.cardStyle),
      spacing: pick(ra.spacing, OPTIONS.spacing, da.spacing),
      corners: pick(ra.corners, OPTIONS.corners, da.corners),
      animations: typeof ra.animations === "boolean" ? ra.animations : da.animations,
    },
  };
}

export function loadSettings(user, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(storageKey(user));
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(user, settings, storage = globalThis.localStorage) {
  try {
    storage?.setItem(storageKey(user), JSON.stringify(sanitize(settings)));
    return true;
  } catch {
    return false;
  }
}

/* ===== Edits used by the Customize panel (all return new objects) ===== */

// Picking a colour another entry in the same group already uses swaps the two.
export function setGroupColor(colors, group, key, color) {
  if (!COLORS[color] || !DEFAULT_COLORS[group]?.[key]) return colors;
  const current = { ...colors[group] };
  const taken = Object.keys(current).find((k) => k !== key && current[k] === color);
  if (taken) current[taken] = current[key];
  current[key] = color;
  return { ...colors, [group]: current };
}

export const hideCard = (s, id) =>
  s.order.includes(id)
    ? { ...s, order: s.order.filter((x) => x !== id), hidden: [...s.hidden, id] }
    : s;

export const showCard = (s, id) =>
  s.hidden.includes(id)
    ? { ...s, hidden: s.hidden.filter((x) => x !== id), order: [...s.order, id] }
    : s;

// Keyboard reordering: move a visible card one step up (-1) or down (+1)
export const moveCard = (s, id, dir) => {
  const i = s.order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= s.order.length) return s;
  const order = [...s.order];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...s, order };
};

export const setWidth = (s, id, width) => {
  const widths = { ...s.widths };
  if (width === "auto" || !WIDTHS.includes(width)) delete widths[id];
  else widths[id] = width;
  return { ...s, widths };
};

export const setAppearance = (s, patch) => ({ ...s, appearance: { ...s.appearance, ...patch } });
