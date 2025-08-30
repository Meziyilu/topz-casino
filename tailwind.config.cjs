// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "casino-bg": "#0b0f19",
        "casino-card": "rgba(255,255,255,0.05)",
        "casino-accent": "#9333ea", // 紫色重點
      },
      animation: {
        fade: "fadeIn 0.5s ease-in-out",
        floaty: "floaty 3s ease-in-out infinite",
        shine: "shine 3s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
        flipIn: "flipIn 0.6s forwards",
        flipOut: "flipOut 0.6s forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        floaty: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
          "100%": { transform: "translateY(0px)" },
        },
        shine: {
          "0%": { transform: "translateX(-120%)" },
          "60%,100%": { transform: "translateX(120%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        flipIn: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        flipOut: {
          "0%": { transform: "rotateY(180deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
