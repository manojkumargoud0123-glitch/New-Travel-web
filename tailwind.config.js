/** @type {import('tailwindcss').Config} */

// Primary + brand scales are driven by CSS variables defined in src/index.css
// (the THEME COLORS block). Change the colors there, not here.
const primary = {
  50: "var(--primary-50)",
  100: "var(--primary-100)",
  200: "var(--primary-200)",
  300: "var(--primary-300)",
  400: "var(--primary-400)",
  500: "var(--primary-500)",
  600: "var(--primary-600)",
  700: "var(--primary-700)",
  800: "var(--primary-800)",
  900: "var(--primary-900)",
  950: "var(--primary-950)",
};

const secondary = {
  400: "var(--secondary-400)",
  500: "var(--secondary-500)",
};

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // main accent — use primary-* everywhere
        primary,
        // secondary accent (login / footer gradients)
        secondary,
        // brand-* kept as an alias of primary so older usages stay themed
        brand: primary,
        ink: {
          900: "#0d0e1a",
          950: "#0a0b14",
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.08)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
