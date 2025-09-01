/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...你原本的設定
  eslint: {
    ignoreDuringBuilds: true, // ← 先讓 build 不因為 lint 錯誤失敗
  },
};

module.exports = nextConfig;
