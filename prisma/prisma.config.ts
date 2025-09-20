// prisma.config.ts
export default {
  seed: {
    provider: "ts-node",
    value: "ts-node --transpile-only prisma/seed.ts",
  },
};
