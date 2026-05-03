'use client';

import React, { useState, useEffect } from 'react';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

const features = [
  { n: '01', t: 'Apply for free samples', d: 'Hundreds of brands, zero upfront cost.', icon: 'pkg' as const },
  { n: '02', t: 'Post on TikTok',         d: 'Use your own voice — we track the link.', icon: 'play' as const },
  { n: '03', t: 'Earn commission',         d: 'Paid to your bank every two weeks.', icon: 'wallet' as const },
];

export default function OnboardingPage() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % features.length), 2600);
    return () => clearInterval(t);
  }, []);

  const handleContinue = () => {
    window.location.href = '/api/auth/tiktok';
  };

  return (
    <div style={{
      minHeight: '100dvh', background: 'linear-gradient(180deg,#f5fdf7 0%,#ffffff 40%)',
      display: 'flex', flexDirection: 'column', padding: '36px 22px 24px',
      position: 'relative', overflow: 'hidden',
      fontFamily: RZ.fontUI,
    }}>
      {/* Ambient blobs */}
      <div style={{ position: 'absolute', top: -40, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,192,115,0.22), transparent 65%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: 140, left: -70, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,0,90,0.14), transparent 65%)', pointerEvents: 'none' }}/>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rezekii-logo.png" alt="Rezekii" width={44} height={44} style={{ display: 'block', objectFit: 'contain' }}/>
      </div>

      {/* Hero illustration stage */}
      <div style={{ position: 'relative', height: 150, marginBottom: 14 }}>
        <div style={{
          position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)',
          width: 126, height: 126, borderRadius: 24, background: RZ.white,
          padding: 10,
          boxShadow: '0 18px 40px rgba(0,0,0,0.14),0 6px 12px rgba(0,0,0,0.08)',
          animation: 'floatA 3s ease-in-out infinite',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/product-beauty.jpg"
            alt="Rezekii bag"
            width={106} height={106}
            style={{ display: 'block', width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }}
          />
        </div>
        <div style={{ position: 'absolute', right: 14, top: 56, background: RZ.black, borderRadius: 14, padding: '8px 12px', boxShadow: '0 10px 22px rgba(0,0,0,0.25)', animation: 'floatC 3.8s ease-in-out infinite' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', font: `600 8px/1 ${RZ.fontUI}`, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Earned</div>
          <div style={{ color: RZ.cyan, font: `800 14px/1 ${RZ.fontDisplay}`, fontVariantNumeric: 'tabular-nums' }}>RM 142</div>
        </div>
      </div>

      <div style={{ font: `800 26px/1.15 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.02em', marginBottom: 8, textAlign: 'center' }}>
        Earn from every<br/>TikTok you post.
      </div>
      <div style={{ font: `400 13px/1.5 ${RZ.fontUI}`, color: RZ.body, marginBottom: 16, textAlign: 'center', padding: '0 8px' }}>
        Browse free samples, post reviews on TikTok, earn commission when people buy.
      </div>

      {/* Animated feature row */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, background: RZ.white, border: `1.5px solid ${RZ.green}`, borderRadius: 14, padding: '12px 14px', boxShadow: '0 6px 18px rgba(0,192,115,.14)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: RZ.green, color: RZ.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={features[i].icon} size={20} color={RZ.white}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `800 10px/1 ${RZ.fontDisplay}`, color: RZ.green, letterSpacing: '.08em' }}>STEP {features[i].n}</div>
          <div style={{ font: `700 14px/1.2 ${RZ.fontDisplay}`, color: RZ.black, marginTop: 2 }}>{features[i].t}</div>
          <div style={{ font: `400 11.5px/1.4 ${RZ.fontUI}`, color: RZ.body, marginTop: 2 }}>{features[i].d}</div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
        {features.map((_, idx) => (
          <div key={idx} style={{
            width: idx === i ? 22 : 6, height: 6, borderRadius: 999,
            background: idx === i ? RZ.green : RZ.border,
            transition: 'width .35s cubic-bezier(.2,.8,.2,1)',
          }}/>
        ))}
      </div>

      {/* Social proof strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex' }}>
          {['#f5a623','#e8005a','#00c073','#25f4ee'].map((c, idx) => (
            <div key={idx} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: idx ? -7 : 0 }}/>
          ))}
        </div>
        <div style={{ font: `500 11px/1.3 ${RZ.fontUI}`, color: RZ.body }}>
          <b style={{ color: RZ.black, fontWeight: 700 }}>2,400+</b> creators already earning
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
        <button
          onClick={handleContinue}
          style={{
            position: 'relative', overflow: 'hidden',
            height: 52, borderRadius: 12, border: 0, width: '100%',
            font: `700 15px/1 ${RZ.fontUI}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#000', color: RZ.white,
            boxShadow: '0 10px 22px rgba(0,0,0,0.28), inset 0 -3px 0 rgba(255,255,255,0.06)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" style={{ display: 'block', objectFit: 'contain' }}>
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9.01a8.16 8.16 0 004.77 1.52V7.09a4.85 4.85 0 01-1.84-.4z" fill="white"/>
          </svg>
          Continue with TikTok
        </button>
        <div style={{ textAlign: 'center', font: `500 10.5px/1.4 ${RZ.fontUI}`, color: RZ.muted, marginTop: 2 }}>
          By continuing, you agree to our Terms &amp; Privacy Policy.
        </div>
      </div>
    </div>
  );
}
