import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#000000",
        foreground: "#e2e8f0",
        "glass-light": "rgba(15, 23, 42, 0.85)",
        "glass-border": "rgba(148, 163, 184, 0.35)",
        "accent-blue": "#38bdf8",
        "accent-green": "#22c55e",
      },
      boxShadow: {
        glass: "0 18px 40px rgba(15, 23, 42, 0.6)",
      },
      borderRadius: {
        glass: "1.2rem",
      },
      backgroundImage: {
        "gradient-blue-green":
          "linear-gradient(135deg, #0ea5e9, #22c55e)",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "gradient-slow": "gradient-x 18s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;


