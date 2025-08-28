// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f8ff",
          100: "#e9efff",
          200: "#cdd9ff",
          300: "#a8bcff",
          400: "#7b95ff",
          500: "#5674ff",
          600: "#3e58e6",
          700: "#3145b4",
          800: "#27388e",
          900: "#213072",
        },
      },
      boxShadow: {
        glass: "0 10px 40px rgba(0,0,0,0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        flipIn: {
          "0%": { transform: "rotateY(90deg)", opacity: 0 },
          "100%": { transform: "rotateY(0deg)", opacity: 1 },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        flipIn: "flipIn 0.6s ease both",
      },
    },
  },
  plugins: [],
};
