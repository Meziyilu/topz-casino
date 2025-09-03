import { defineConfig } from '@prisma/internals';

export default defineConfig({
  seeds: {
    // 與你現在的 seed.js 對齊
    seedCommand: 'node prisma/seed.js',
  },
});
