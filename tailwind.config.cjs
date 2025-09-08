import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      fontFamily: {
        display: ["Inter var", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["SFMono-Regular", "ui-monospace", "monospace"],
      },

      colors: {
        // 主題與背景
        bg: {
          deep: "#0B0F17",         // 深夜底
          panel: "rgba(18, 22, 30, 0.72)",
        },
        primary: { DEFAULT: "#8B5CF6" }, // violet-500 微調

        // 宇宙點綴
        cosmic: {
          cyan: "#67E8F9",
          rose: "#FDA4AF",
          amber: "#FDE68A",
          violet: "#A78BFA",
          blue: "#60A5FA",
          mint: "#34D399",
        },

        // 排行榜
        rank: {
          gold: "#E6C200",
          silver: "#A9A9A9",
          bronze: "#A0522D",
          neutral: "#BFBFBF",
        },
      },

      // 玻璃感陰影
      boxShadow: {
        glass: "0 12px 40px 0 rgba(0,0,0,.45)",
        "glass-inner": "inset 0 1px 0 rgba(255,255,255,.06)",
        glow: "0 0 24px rgba(255,255,255,.10)",
        "glow-strong": "0 0 28px rgba(255,255,255,.22)",
        "gold-pulse": "0 0 32px rgba(255,215,0,.35), inset 0 0 22px rgba(255,215,0,.25)",
      },

      backdropBlur: { xs: "2px", md: "10px" },

      // 背景噪點與光暈
      backgroundImage: {
        "cosmic-noise":
          "radial-gradient(1200px 600px at 10% -10%, rgba(96,165,250,.18), transparent 60%), radial-gradient(1000px 800px at 110% 10%, rgba(167,139,250,.18), transparent 60%), radial-gradient(800px 700px at 50% 110%, rgba(253,164,175,.16), transparent 60%)",
        "glass-radial":
          "radial-gradient(1000px 600px at 80% -20%, rgba(139,92,246,.18), transparent 60%)",
      },

      // 動畫
      keyframes: {
        drift: {
          "0%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-10px) translateX(6px)" },
          "100%": { transform: "translateY(0) translateX(0)" },
        },
        twinkle: { "0%,100%": { opacity: .6 }, "50%": { opacity: 1 } },

        // 金光掃過（贏牌／高亮）
        goldSweep: {
          "0%": { transform: "translateX(-120%)", opacity: 0 },
          "40%": { opacity: .9 },
          "100%": { transform: "translateX(120%)", opacity: 0 },
        },
        // 柔光閃爍（全畫面勝利氛圍）
        softGlow: {
          "0%": { opacity: 0 },
          "40%": { opacity: 1 },
          "100%": { opacity: 0 },
        },
        // 玻璃面板淡入彈出
        glassIn: {
          "0%": { transform: "translateY(6px) scale(.98)", opacity: 0 },
          "60%": { transform: "translateY(0) scale(1.01)", opacity: 1 },
          "100%": { transform: "translateY(0) scale(1)" },
        },
        // 卡片翻面（牌面）
        flipIn: { "0%": { transform: "rotateY(0deg)" }, "100%": { transform: "rotateY(180deg)" } },
        flip: { "0%": { transform: "rotateY(90deg)" }, "100%": { transform: "rotateY(0deg)" } },

        // 微亮光暈（邊框呼吸）
        ringPulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(167,139,250,.35)" },
          "70%": { boxShadow: "0 0 0 12px rgba(167,139,250,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(167,139,250,0)" },
        },
      },
      animation: {
        drift: "drift 12s ease-in-out infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
        goldSweep: "goldSweep 1.4s ease-in-out",
        softGlow: "softGlow 1.2s ease-in-out",
        glassIn: "glassIn .38s cubic-bezier(.16,.65,.22,1)",
        flipIn: "flipIn .6s ease forwards",
        flip: "flip .4s ease-out both",
        ringPulse: "ringPulse 2.4s ease-out infinite",
      },

      // 邊框與透明度微調
      borderColor: {
        glass: "rgba(255,255,255,.10)",
        "glass-strong": "rgba(255,255,255,.18)",
      },
      opacity: { 15: ".15", 35: ".35" },
    },
  },
  plugins: [],
  // 確保動態 class 不會被搶刪（可視需要增減）
  safelist: [
    "animate-goldSweep",
    "animate-softGlow",
    "animate-flip",
    "animate-flipIn",
    "shadow-gold-pulse",
    "bg-cosmic-noise",
  ],
};

export default config;
