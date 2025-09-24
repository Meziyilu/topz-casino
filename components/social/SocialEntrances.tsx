'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import "@/public/styles/social-entry.css";

// 動態載入 Lottie
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

import exploreAnim from '@/public/lottie/explore.json';
import feedAnim from '@/public/lottie/feed.json';
import dmAnim from '@/public/lottie/dm.json';
import visitorsAnim from '@/public/lottie/visitors.json';
import profileAnim from '@/public/lottie/profile.json';

export default function SocialEntrances() {
  const items = [
    { href: '/social',         title: '探索玩家',  desc: '搜尋 / 推薦', anim: exploreAnim },
    { href: '/social/feed',    title: '社交動態',  desc: '關注 / 全站', anim: feedAnim },
    { href: '/social/dm',      title: '私訊',      desc: '與玩家對話',   anim: dmAnim },
    { href: '/social/visitors',title: '最近訪客',  desc: '誰看過你',     anim: visitorsAnim },
    { href: '/profile',        title: '我的個人頁',desc: '頭像 / 模組',  anim: profileAnim },
  ];

  return (
    <section className="lb-card">
      <div className="lb-card-title">社交入口</div>
      <div className="social-entry-grid">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="social-entry">
            {/* Lottie 動畫 */}
            <div className="social-entry__lottie">
              <Lottie animationData={it.anim} loop autoplay style={{ width: 80, height: 80 }} />
            </div>

            <div className="social-entry__title">{it.title}</div>
            <div className="social-entry__desc">{it.desc}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
