import { heroui } from "@heroui/theme"

const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"],
        mono: ["var(--font-mono)"],
        handwritten: ["var(--font-handwritten)", "Caveat", "cursive"],
      },
      lineHeight: {
        relaxed: "1.75",
        loose: "1.8",
      },
      boxShadow: {
        "soft": "0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06)",
        "soft-md": "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 30px rgba(0, 0, 0, 0.08)",
        "soft-lg": "0 8px 12px rgba(0, 0, 0, 0.06), 0 20px 48px rgba(0, 0, 0, 0.1)",
        // Soft Pop Glass - Colored glow shadows
        "glow-primary": "0 8px 30px rgb(59, 130, 246, 0.2)",
        "glow-primary-hover": "0 12px 40px rgb(59, 130, 246, 0.3)",
        "glow-primary-intense": "0 16px 50px rgb(59, 130, 246, 0.4)",
        "glow-accent": "0 8px 30px rgb(139, 92, 246, 0.2)",
        "glow-accent-hover": "0 12px 40px rgb(139, 92, 246, 0.3)",
        "glow-success": "0 8px 30px rgb(34, 197, 94, 0.2)",
        "glow-success-hover": "0 12px 40px rgb(34, 197, 94, 0.3)",
        "glow-danger": "0 8px 30px rgb(239, 68, 68, 0.2)",
        "glow-warning": "0 8px 30px rgb(245, 158, 11, 0.2)",
        // Glass card shadows
        "glass": "0 8px 30px rgba(0, 0, 0, 0.06)",
        "glass-hover": "0 20px 40px rgba(59, 130, 246, 0.1)",
        "glass-elevated": "0 25px 60px rgba(0, 0, 0, 0.15)",
      },
      // Backdrop blur extensions
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
        "3xl": "64px",
      },
      spacing: {
        "8": "8px",
        "12": "12px",
        "16": "16px",
        "24": "24px",
        "32": "32px",
        "48": "48px",
      },
      animation: {
        scroll: "scroll linear infinite",
        "fade-in": "fadeIn 200ms ease-out forwards",
        "slide-up": "slideUp 200ms ease-out forwards",
        aurora: "aurora 60s linear infinite",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        scroll: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { 
            opacity: "0",
            transform: "translateY(8px)"
          },
          to: { 
            opacity: "1",
            transform: "translateY(0)"
          },
        },
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [
    addVariablesForColors,
    heroui({
      themes: {
        light: {
          colors: {
            background: "#F9FAFB",
            foreground: "#1a1a1a",
            primary: {
              50: "#eff6ff",
              100: "#dbeafe",
              200: "#bfdbfe",
              300: "#93c5fd",
              400: "#60a5fa",
              500: "#3b82f6",
              600: "#2563eb",
              700: "#1d4ed8",
              800: "#1e40af",
              900: "#1e3a8a",
              DEFAULT: "#2563EB",
              foreground: "#ffffff",
            },
            secondary: {
              50: "#eef2ff",
              100: "#e0e7ff",
              200: "#c7d2fe",
              300: "#a5b4fc",
              400: "#818cf8",
              500: "#6366f1",
              600: "#4f46e5",
              700: "#4338ca",
              800: "#3730a3",
              900: "#312e81",
              DEFAULT: "#4f46e5",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#22c55e",
              foreground: "#ffffff",
            },
            warning: {
              DEFAULT: "#f59e0b",
              foreground: "#1a1a1a",
            },
            danger: {
              DEFAULT: "#ef4444",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          colors: {
            background: "#0f0f0f",
            foreground: "#fafafa",
            primary: {
              50: "#1e3a8a",
              100: "#1e40af",
              200: "#1d4ed8",
              300: "#2563eb",
              400: "#3b82f6",
              500: "#60a5fa",
              600: "#93c5fd",
              700: "#bfdbfe",
              800: "#dbeafe",
              900: "#eff6ff",
              DEFAULT: "#60a5fa",
              foreground: "#0f0f0f",
            },
            secondary: {
              DEFAULT: "#a78bfa",
              foreground: "#0f0f0f",
            },
          },
        },
      },
      layout: {
        radius: {
          small: "10px",
          medium: "12px",
          large: "16px",
        },
      },
    }),
  ],
}

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}

export default config
