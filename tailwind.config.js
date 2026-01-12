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
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)"],
        handwritten: ["var(--font-handwritten)", "Caveat", "cursive"],
      },
      colors: {
        // Lumen Health Brand Colors — Morning Spectrum
        sky: {
          50: '#F7FAFC',
          100: '#EDF4F8',
          200: '#E1EEF5',
          300: '#C5DDF0',
          400: '#A8CCE8',
          500: '#8ABBE0',
        },
        dawn: {
          50: '#FFFAF5',
          100: '#FEF3E8',
          200: '#FCEBD8',
          300: '#FBDCBA',
          400: '#F9C992',
          500: '#F5A962',
          600: '#E8924A',
        },
        ivory: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F7F4ED',
          300: '#F0EBE0',
          400: '#E5DFD2',
        },
        peach: {
          50: '#FFF8F5',
          100: '#FFEDE5',
          200: '#FFE0D4',
          300: '#FFCEBB',
          400: '#FFB89D',
        },
        champagne: {
          50: '#FFFCF7',
          100: '#FFF8ED',
          200: '#FFF0DB',
          300: '#FFE5C4',
        },
      },
      lineHeight: {
        relaxed: "1.75",
        loose: "1.8",
      },
      boxShadow: {
        // Lumen Design System — Soft, warm shadows
        "soft": "0 4px 20px rgba(197, 221, 240, 0.15)",
        "soft-md": "0 8px 30px rgba(197, 221, 240, 0.20)",
        "soft-lg": "0 12px 40px rgba(197, 221, 240, 0.25)",
        // Dawn glow shadows (warm)
        "glow-dawn": "0 4px 20px rgba(245, 169, 98, 0.25)",
        "glow-dawn-hover": "0 8px 30px rgba(245, 169, 98, 0.30)",
        "glow-dawn-focus": "0 0 20px rgba(245, 169, 98, 0.15)",
        // Sky glow shadows (cool)
        "glow-sky": "0 4px 20px rgba(197, 221, 240, 0.20)",
        "glow-sky-hover": "0 8px 30px rgba(197, 221, 240, 0.25)",
        // State shadows
        "glow-success": "0 4px 20px rgba(107, 191, 138, 0.20)",
        "glow-error": "0 4px 20px rgba(224, 122, 122, 0.20)",
        // Glass card shadows
        "glass": "0 4px 20px rgba(197, 221, 240, 0.15)",
        "glass-hover": "0 8px 30px rgba(197, 221, 240, 0.20)",
        "glass-elevated": "0 12px 40px rgba(197, 221, 240, 0.25)",
        "glass-modal": "0 20px 60px rgba(197, 221, 240, 0.30)",
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
            // InstantMed — Morning sky pastel palette
            background: "#FAFBFC",
            foreground: "#1E293B",
            primary: {
              50: "#EFF6FF",
              100: "#DBEAFE",
              200: "#BFDBFE",
              300: "#93C5FD",
              400: "#60A5FA",
              500: "#3B82F6",
              600: "#2563EB",
              700: "#1D4ED8",
              800: "#1E40AF",
              900: "#1E3A8A",
              DEFAULT: "#3B82F6",
              foreground: "#ffffff",
            },
            secondary: {
              50: "#F8FAFC",
              100: "#F1F5F9",
              200: "#E2E8F0",
              300: "#CBD5E1",
              400: "#94A3B8",
              500: "#64748B",
              600: "#475569",
              700: "#334155",
              800: "#1E293B",
              900: "#0F172A",
              DEFAULT: "#F1F5F9",
              foreground: "#334155",
            },
            success: {
              DEFAULT: "#22C55E",
              foreground: "#ffffff",
            },
            warning: {
              DEFAULT: "#F59E0B",
              foreground: "#1E293B",
            },
            danger: {
              DEFAULT: "#F87171",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          colors: {
            // InstantMed — Clean dark mode with sky accents
            background: "#0F172A",
            foreground: "#F1F5F9",
            primary: {
              50: "#1E3A8A",
              100: "#1E40AF",
              200: "#1D4ED8",
              300: "#2563EB",
              400: "#3B82F6",
              500: "#60A5FA",
              600: "#93C5FD",
              700: "#BFDBFE",
              800: "#DBEAFE",
              900: "#EFF6FF",
              DEFAULT: "#60A5FA",
              foreground: "#0F172A",
            },
            secondary: {
              DEFAULT: "#334155",
              foreground: "#F1F5F9",
            },
            success: {
              DEFAULT: "#22C55E",
              foreground: "#0F172A",
            },
            warning: {
              DEFAULT: "#F59E0B",
              foreground: "#0F172A",
            },
            danger: {
              DEFAULT: "#F87171",
              foreground: "#ffffff",
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
