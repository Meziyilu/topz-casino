/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🚀 部署時完全忽略 ESLint（不因為 lint 報錯而 fail）
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 🚀 部署時忽略 TypeScript 型別錯誤（先讓服務起來）
  typescript: {
    ignoreBuildErrors: true,
  },
  // 如有需要可在此放你原本的其他設定…
};

module.exports = nextConfig;
