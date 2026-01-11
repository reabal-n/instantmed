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
            // Lumen Health — Morning light palette
            background: "#EDF4F8",
            foreground: "#2D3748",
            primary: {
              50: "#FFFAF5",
              100: "#FEF3E8",
              200: "#FCEBD8",
              300: "#FBDCBA",
              400: "#F9C992",
              500: "#F5A962",
              600: "#E8924A",
              700: "#D17A3A",
              800: "#B8632C",
              900: "#9A4E20",
              DEFAULT: "#F5A962",
              foreground: "#ffffff",
            },
            secondary: {
              50: "#F7FAFC",
              100: "#EDF4F8",
              200: "#E1EEF5",
              300: "#C5DDF0",
              400: "#A8CCE8",
              500: "#8ABBE0",
              600: "#6CA8D4",
              700: "#5090C0",
              800: "#3D78A8",
              900: "#2D6090",
              DEFAULT: "#C5DDF0",
              foreground: "#2D3748",
            },
            success: {
              DEFAULT: "#6BBF8A",
              foreground: "#ffffff",
            },
            warning: {
              DEFAULT: "#F9C992",
              foreground: "#2D3748",
            },
            danger: {
              DEFAULT: "#E07A7A",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          colors: {
            // Lumen Health — Soft dark mode (maintains warmth)
            background: "#1A2332",
            foreground: "#F7FAFC",
            primary: {
              50: "#9A4E20",
              100: "#B8632C",
              200: "#D17A3A",
              300: "#E8924A",
              400: "#F5A962",
              500: "#F9C992",
              600: "#FBDCBA",
              700: "#FCEBD8",
              800: "#FEF3E8",
              900: "#FFFAF5",
              DEFAULT: "#F9C992",
              foreground: "#1A2332",
            },
            secondary: {
              DEFAULT: "#A8CCE8",
              foreground: "#1A2332",
            },
            success: {
              DEFAULT: "#6BBF8A",
              foreground: "#1A2332",
            },
            warning: {
              DEFAULT: "#F9C992",
              foreground: "#1A2332",
            },
            danger: {
              DEFAULT: "#E07A7A",
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
