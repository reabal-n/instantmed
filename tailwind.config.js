import { heroui } from "@heroui/theme"

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
      },
    },
  },
  darkMode: "class",
  plugins: [
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
              50: "#f3f0ff",
              100: "#ede9fe",
              200: "#ddd6fe",
              300: "#c4b5fd",
              400: "#a78bfa",
              500: "#8b5cf6",
              600: "#7c3aed",
              700: "#6d28d9",
              800: "#5b21b6",
              900: "#4c1d95",
              DEFAULT: "#8b5cf6",
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

export default config
