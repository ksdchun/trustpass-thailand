import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        azure: "var(--color-azure)",
        trust: "var(--color-trust)",
        signal: "var(--color-signal)",
        saffron: "var(--color-saffron)",
        fluent: {
          canvas: "var(--color-canvas)",
          panel: "var(--color-panel)",
          border: "var(--color-border)",
          text: "var(--color-ink)",
          muted: "var(--color-muted)",
          blue: "var(--color-azure)",
          blueDark: "var(--color-azure-dark)"
        }
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
