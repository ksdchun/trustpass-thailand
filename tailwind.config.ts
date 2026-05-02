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
          surface: "var(--color-surface)",
          border: "var(--color-border)",
          text: "var(--color-ink)",
          muted: "var(--color-muted)",
          blue: "var(--color-azure)",
          blueDark: "var(--color-azure-dark)"
        },
        risk: {
          low: "#107C10",
          caution: "#FFB900",
          high: "#D83B01",
          emergency: "#A4262C"
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', "system-ui", "-apple-system", "BlinkMacSystemFont", "Roboto", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.12)",
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
        elevated: "0 4px 12px rgba(0,0,0,0.08)"
      },
      keyframes: {
        fadein: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        skeleton: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" }
        },
        pulseEmergency: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(164, 38, 44, 0.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(164, 38, 44, 0)" }
        }
      },
      animation: {
        fadein: "fadein 260ms ease-out",
        skeleton: "skeleton 1.4s ease-in-out infinite",
        "pulse-emergency": "pulseEmergency 2s ease-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
