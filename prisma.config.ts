// prisma.config.ts  （Prisma 6 正確寫法）
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  // 保留原本的 DB URL 用 .env
  seed: {
    provider: 'node',
    value: 'node prisma/seed.js', // 你現在用的是 JS 版本的種子
  },
})
