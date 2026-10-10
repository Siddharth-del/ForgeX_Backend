import type { Config } from "tailwindcss";

/**
 * Cosmic Life design tokens.
 * Ivory grounds, espresso type, gold used sparingly, deep brown for the attar world.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "420px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      // Allow any whole-number opacity modifier (e.g. bg-ivory/82), not only steps of 5.
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)])),
      colors: {
        ivory: "#F7F3EC",
        sand: "#EFE7DA",
        linen: "#E5D9C7",
        dune: "#D8C6AC",
        gold: { DEFAULT: "#C49A62", deep: "#A87945", soft: "#E3CBA4" },
        umber: "#6B432A",
        espresso: { DEFAULT: "#32180E", deep: "#1F0F08", soft: "#4A2817" },
        ink: { DEFAULT: "#15100C", muted: "#5E5048", faint: "#8C7D70" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Jost", "Helvetica Neue", "Arial", "sans-serif"],
        arabic: ["var(--font-arabic)", "Amiri", "serif"],
      },
      fontSize: {
        eyebrow: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.28em" }],
        "display-sm": ["clamp(2rem, 5vw, 2.75rem)", { lineHeight: "1.02", letterSpacing: "0.01em" }],
        "display-md": ["clamp(2.5rem, 6.4vw, 4.25rem)", { lineHeight: "0.98", letterSpacing: "0.005em" }],
        "display-lg": ["clamp(3rem, 8.6vw, 7.5rem)", { lineHeight: "0.92", letterSpacing: "0" }],
      },
      spacing: {
        section: "clamp(4.5rem, 10vw, 9rem)",
        gutter: "clamp(1rem, 4vw, 3rem)",
      },
      maxWidth: {
        site: "90rem",
        prose: "38rem",
      },
      borderColor: {
        hair: "rgba(50, 24, 14, 0.14)",
        "hair-strong": "rgba(50, 24, 14, 0.28)",
        "hair-light": "rgba(247, 243, 236, 0.18)",
      },
      transitionTimingFunction: {
        luxe: "cubic-bezier(0.22, 1, 0.36, 1)",
        silk: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
