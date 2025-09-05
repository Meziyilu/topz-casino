// components/profile/BalanceCard.tsx
'use client';

export default function BalanceCard({ wallet, bank }: { wallet: number; bank: number }) {
  return (
    <div className="pf-card">
      <div className="pf-kv"><span>錢包餘額</span><b>{wallet.toLocaleString()}</b></div>
      <div className="pf-kv"><span>銀行餘額</span><b>{bank.toLocaleString()}</b></div>
    </div>
  );
}
