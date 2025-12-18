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
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#faf9f7",
            foreground: "#1a1a2e",
            primary: {
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
              DEFAULT: "#6366f1",
              foreground: "#ffffff",
            },
            secondary: {
              50: "#faf5ff",
              100: "#f3e8ff",
              200: "#e9d5ff",
              300: "#d8b4fe",
              400: "#c084fc",
              500: "#a855f7",
              600: "#9333ea",
              700: "#7e22ce",
              800: "#6b21a8",
              900: "#581c87",
              DEFAULT: "#8b5cf6",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#22c55e",
              foreground: "#ffffff",
            },
            warning: {
              DEFAULT: "#f59e0b",
              foreground: "#1a1a2e",
            },
            danger: {
              DEFAULT: "#ef4444",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          colors: {
            background: "#0f0f1a",
            foreground: "#f8f8fc",
            primary: {
              50: "#312e81",
              100: "#3730a3",
              200: "#4338ca",
              300: "#4f46e5",
              400: "#6366f1",
              500: "#818cf8",
              600: "#a5b4fc",
              700: "#c7d2fe",
              800: "#e0e7ff",
              900: "#eef2ff",
              DEFAULT: "#818cf8",
              foreground: "#0f0f1a",
            },
            secondary: {
              DEFAULT: "#a78bfa",
              foreground: "#0f0f1a",
            },
          },
        },
      },
    }),
  ],
}

export default config
