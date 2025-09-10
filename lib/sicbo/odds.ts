// 若 DB 無值時作為 fallback（實務以 prisma.sicboConfig.payoutTable 為主）
export const defaultPayoutTable = {
  bigSmall: { BIG: 1, SMALL: 1, tripleKills: true },
  singleFace: { one: 1, two: 2, three: 3 }, // 單點 1~3 倍（依出現顆數）
  doubleFace: 8,
  anyTriple: 24,
  specificTriple: 150,
  total: {
    4: 50, 5: 18, 6: 14, 7: 12, 8: 8, 9: 6, 10: 6,
    11: 6, 12: 6, 13: 8, 14: 12, 15: 14, 16: 18, 17: 50,
  },
  twoDiceCombo: 5,
};
