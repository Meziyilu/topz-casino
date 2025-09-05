import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色
        primary: { DEFAULT: "#7c3aed" },

        // 宇宙感點綴
        cosmic: {
          cyan: "#67e8f9",
          rose: "#fda4af",
          amber: "#fde68a",
          violet: "#a78bfa",
          blue: "#60a5fa",
        },

        // 排行榜色彩（壓暗版）
        rank: {
          gold: "#E6C200",
          silver: "#A9A9A9",
          bronze: "#A0522D",
          neutral: "#CCCCCC",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(255,255,255,.15)",
        "glow-strong": "0 0 28px rgba(255,255,255,.26)",
        "gold-pulse":
          "0 0 24px rgba(255,215,0,.35), inset 0 0 22px rgba(255,215,0,.25)",
        // 玻璃面板專用
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        drift: {
          "0%": { transform: "translateY(0px) translateX(0px)" },
          "50%": { transform: "translateY(-10px) translateX(5px)" },
          "100%": { transform: "translateY(0px) translateX(0px)" },
        },
        twinkle: {
          "0%,100%": { opacity: 0.6 },
          "50%": { opacity: 1 },
        },
        sheen: {
          "0%": { transform: "translateX(-100%) skewX(-10deg)" },
          "100%": { transform: "translateX(200%) skewX(-10deg)" },
        },
        flipIn: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)" },
          "70%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        flip: {
          "0%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        confetti: {
          "0%": {
            transform: "translateY(-20vh) rotate(0)",
            opacity: "0",
          },
          "10%": { opacity: "1" },
          "100%": {
            transform: "translateY(110vh) rotate(720deg)",
            opacity: "0",
          },
        },
      },
      animation: {
        drift: "drift 12s ease-in-out infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
        sheen: "sheen 1.2s ease-in-out",
        flipIn: "flipIn .6s ease forwards",
        pop: "pop .28s ease-out both",
        flip: "flip .4s ease-out both",
        confetti: "confetti 1.4s ease-in forwards",
      },
      backgroundImage: {
        "cosmic-noise":
          "radial-gradient(1200px 600px at 10% -10%, rgba(96,165,250,.18), transparent 60%), radial-gradient(1000px 800px at 110% 10%, rgba(167,139,250,.18), transparent 60%), radial-gradient(800px 700px at 50% 110%, rgba(253,164,175,.16), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
