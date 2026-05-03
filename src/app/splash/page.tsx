'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

interface Tile {
  bg: string;
  top: number;
  left?: number;
  right?: number;
  delay: number;
  icon: React.ReactNode;
}

// TikTok Shop feature tiles — colored-background + white filled icons
const floatingTiles: Tile[] = [
  // top-left — Product Marketplace (orange) — double-loop bag + two dots
  {
    bg: '#F5A623', top: 30, left: 22, delay: 0,
    icon: (
      <g>
        {/* bag body */}
        <rect x="3" y="9.5" width="18" height="12" rx="3.5" fill="white"/>
        {/* left handle loop */}
        <path d="M6.5 9.5V7.8a3.2 3.2 0 0 1 5 0v1.7" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        {/* right handle loop */}
        <path d="M12.5 9.5V7.8a3.2 3.2 0 0 1 5 0v1.7" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        {/* two rivets */}
        <circle cx="9" cy="16.5" r="1.5" fill="#F5A623"/>
        <circle cx="15" cy="16.5" r="1.5" fill="#F5A623"/>
      </g>
    ),
  },
  // top-right — Shoppable Video / LIVE (red) — phone + play button
  {
    bg: '#FE2C55', top: 30, right: 22, delay: 0.6,
    icon: (
      <g>
        {/* phone body */}
        <rect x="4" y="2" width="16" height="20" rx="3.5" fill="white"/>
        {/* camera dot */}
        <circle cx="12" cy="5" r="1.2" fill="#FE2C55"/>
        {/* play triangle */}
        <polygon points="9.5,9.5 9.5,16.5 17,13" fill="#FE2C55"/>
        {/* home indicator */}
        <rect x="9" y="18.5" width="6" height="1.5" rx="0.75" fill="#FE2C55" opacity="0.45"/>
      </g>
    ),
  },
  // bottom-left — Earnings / Dollar (teal) — coin with $ sign
  {
    bg: '#22C4B0', top: 498, left: 22, delay: 1.1,
    icon: (
      <g>
        {/* coin */}
        <circle cx="12" cy="12" r="9.5" fill="white"/>
        {/* dollar S-curve */}
        <path d="M14.5 9.8c-.8-.7-1.8-1.1-2.5-1.1-1.8 0-2.8 1-2.8 2.2s1.1 1.8 2.8 2.4c1.8.6 2.8 1.4 2.8 2.6 0 1.4-1.2 2.2-2.8 2.2-1 0-2.1-.5-2.8-1.3" stroke="#22C4B0" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* vertical bar */}
        <path d="M12 7.5v9" stroke="#22C4B0" strokeWidth="2" strokeLinecap="round"/>
      </g>
    ),
  },
  // bottom-right — Manage Samples / Gift (violet) — gift box with bow
  {
    bg: '#8B5CF6', top: 540, right: 18, delay: 1.7,
    icon: (
      <g>
        {/* box body */}
        <rect x="3" y="12.5" width="18" height="9" rx="2" fill="white"/>
        {/* box lid */}
        <rect x="2.5" y="8.5" width="19" height="4.5" rx="2" fill="white"/>
        {/* center ribbon vertical */}
        <rect x="10.5" y="8.5" width="3" height="13" rx="1" fill="#8B5CF6" opacity="0.45"/>
        {/* bow left petal */}
        <path d="M12 8.5C11.5 6.5 9.5 5 7.5 5.5 6 6 6 8 7.5 8.5 9 9 11 8.5 12 8.5z" fill="white"/>
        {/* bow right petal */}
        <path d="M12 8.5C12.5 6.5 14.5 5 16.5 5.5 18 6 18 8 16.5 8.5 15 9 13 8.5 12 8.5z" fill="white"/>
        {/* bow center knot */}
        <circle cx="12" cy="8.5" r="1.4" fill="white"/>
      </g>
    ),
  },
];

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('rezekii_onboarded') === 'true') {
      router.replace('/home');
    }
  }, [router]);

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      background: RZ.green,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 'clamp(80px, 17vh, 130px)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: RZ.fontUI,
    }}>

      {/* ── Ambient radial glow ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.13), transparent 68%)',
      }}/>

      {/* ── Floating coloured tiles ── */}
      {floatingTiles.map((tile, idx) => (
        <div key={idx} style={{
          position: 'absolute',
          top: tile.top,
          ...(tile.left  !== undefined ? { left:  tile.left  } : {}),
          ...(tile.right !== undefined ? { right: tile.right } : {}),
          width: 52, height: 52,
          borderRadius: 14,
          background: tile.bg,
          boxShadow: '0 8px 22px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: `splashTileBob 3.6s ease-in-out ${tile.delay}s infinite`,
          zIndex: 2,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            strokeLinecap="round" strokeLinejoin="round">
            {tile.icon}
          </svg>
        </div>
      ))}

      {/* ── Centre block: logo + wordmark ── */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Logo with ripple rings */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Ripple ring 1 */}
          <div aria-hidden style={{
            position: 'absolute',
            width: 108, height: 108,
            borderRadius: 26,
            border: '1.5px solid rgba(255,255,255,0.55)',
            animation: 'splashRipple 2.4s ease-out 0s infinite',
            pointerEvents: 'none',
          }}/>

          {/* Ripple ring 2 */}
          <div aria-hidden style={{
            position: 'absolute',
            width: 108, height: 108,
            borderRadius: 26,
            border: '1.5px solid rgba(255,255,255,0.45)',
            animation: 'splashRipple 2.4s ease-out 0.8s infinite',
            pointerEvents: 'none',
          }}/>

          {/* Ripple ring 3 */}
          <div aria-hidden style={{
            position: 'absolute',
            width: 108, height: 108,
            borderRadius: 26,
            border: '1.5px solid rgba(255,255,255,0.35)',
            animation: 'splashRipple 2.4s ease-out 1.6s infinite',
            pointerEvents: 'none',
          }}/>

          {/* Logo card */}
          <div style={{
            width: 108, height: 108,
            borderRadius: 26,
            background: RZ.white,
            boxShadow: '0 20px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'splashMarkPop 1.1s cubic-bezier(.3,1.5,.4,1) both',
            position: 'relative', zIndex: 1,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rezekii-logo.png" alt="Rezekii" width={80} height={80}
              style={{ display: 'block', objectFit: 'contain' }}/>
          </div>
        </div>

        {/* Wordmark */}
        <div style={{
          marginTop: 28, textAlign: 'center',
          animation: 'fadeUp 400ms 200ms cubic-bezier(.2,.7,.2,1) both',
        }}>
          <div style={{
            font: `800 38px/1 ${RZ.fontDisplay}`,
            color: RZ.white,
            letterSpacing: '-0.02em',
          }}>
            Rezekii
          </div>
          <div style={{
            font: `700 11px/1 ${RZ.fontUI}`,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '0.22em',
            marginTop: 10,
            textTransform: 'uppercase',
          }}>
            Connecting Affiliates
          </div>
          {/* Official partner divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 18,
            animation: 'fadeUp 400ms 350ms cubic-bezier(.2,.7,.2,1) both',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.25)' }}/>
            <span style={{
              font: `600 9.5px/1 ${RZ.fontUI}`,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              Official TikTok Shop Partner
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.25)' }}/>
          </div>
        </div>
      </div>

      {/* ── CTA — pinned to bottom ── */}
      <div style={{
        position: 'absolute',
        bottom: 36, left: 28, right: 28,
        zIndex: 3,
        animation: 'fadeUp 400ms 450ms cubic-bezier(.2,.7,.2,1) both',
      }}>
        <button
          onClick={() => router.push('/onboarding')}
          style={{
            width: '100%', height: 56, borderRadius: 14, border: 0, cursor: 'pointer',
            background: RZ.white, color: RZ.black,
            font: `700 17px/1 ${RZ.fontUI}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
          }}
        >
          Get started
          <Icon name="chevR" size={20} color={RZ.black}/>
        </button>
        <div style={{
          textAlign: 'center', marginTop: 16,
          font: `500 13px/1 ${RZ.fontUI}`,
          color: 'rgba(255,255,255,0.75)',
        }}>
          Already have an account?{' '}
          <span
            style={{ color: RZ.white, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}
