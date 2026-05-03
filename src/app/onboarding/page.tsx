'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';
import TikTokGlyph from '@/components/ui/TikTokGlyph';

// ===================================================================
// TTIcon — TikTok-style solid filled glyphs used inside slides
// ===================================================================
type TTIconName = 'heart' | 'comment' | 'send' | 'save' | 'bag' | 'live' | 'play' | 'music' | 'coin' | 'showcase' | 'stats' | 'gift' | 'sparkles' | 'chev' | 'bell' | 'trend';
function TTIcon({ name, size = 24, color = '#fff' }: { name: TTIconName; size?: number; color?: string }) {
  const P = { fill: color };
  switch (name) {
    case 'heart':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M12 21s-7.5-4.4-9.5-9.3C1.2 8 3.6 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4c3.9 0 6.3 4 5 7.7C19.5 16.6 12 21 12 21z"/></svg>;
    case 'comment':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5l-5 4v-4H6a2 2 0 0 1-2-2z"/></svg>;
    case 'send':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M3.4 3.3 21 12 3.4 20.7l2.4-7.7h9l-9-1z"/></svg>;
    case 'save':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>;
    case 'bag':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M6 8h12l-.8 11.4a2 2 0 0 1-2 1.6H8.8a2 2 0 0 1-2-1.6zM9 8V6.5a3 3 0 0 1 6 0V8" stroke={color} strokeWidth={0}/><path fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>;
    case 'live':
      return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...P} cx="12" cy="12" r="3.5"/><path fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10"/></svg>;
    case 'play':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M6 4.5 20 12 6 19.5z"/></svg>;
    case 'music':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M10 3v12.5a3.5 3.5 0 1 1-3.5-3.5c.5 0 1 .1 1.5.3V5l10-2v11.5a3.5 3.5 0 1 1-3.5-3.5c.5 0 1 .1 1.5.3V5.6L10 7z"/></svg>;
    case 'coin':
      return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...P} cx="12" cy="12" r="9"/><path fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" d="M15 9.5c-.5-1-1.7-1.5-3-1.5-1.7 0-3 1-3 2.2 0 2.8 6 1.6 6 4.4 0 1.3-1.3 2.3-3 2.3-1.4 0-2.5-.6-3-1.6M12 6v2M12 16v2"/></svg>;
    case 'showcase':
      return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...P} x="3" y="4" width="8" height="8" rx="1.5"/><rect {...P} x="13" y="4" width="8" height="8" rx="1.5"/><rect {...P} x="3" y="14" width="8" height="6" rx="1.5"/><rect {...P} x="13" y="14" width="8" height="6" rx="1.5"/></svg>;
    case 'stats':
      return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...P} x="3" y="12" width="4" height="9" rx="1"/><rect {...P} x="10" y="7" width="4" height="14" rx="1"/><rect {...P} x="17" y="3" width="4" height="18" rx="1"/></svg>;
    case 'gift':
      return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...P} x="3" y="9" width="18" height="11" rx="1.5"/><rect {...P} x="2" y="6" width="20" height="4" rx="1"/><path fill="none" stroke={color} strokeWidth="2" d="M12 6v14"/><path fill="none" stroke={color} strokeWidth="2" d="M8 6a2.5 2.5 0 1 1 4-2c1-1.5 4-1.5 4 1 0 2-2 3-4 1"/></svg>;
    case 'sparkles':
      return <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M12 2l1.8 5.7L19.5 9l-5.7 1.3L12 16l-1.8-5.7L4.5 9l5.7-1.3zM19 14l.9 2.8L22.5 18l-2.6.5L19 21l-.9-2.5L15.5 18l2.6-1.2z"/></svg>;
    case 'bell':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'trend':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 9 11l4 4 8-8"/><path d="M16 7h5v5"/></svg>;
    case 'chev':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>;
    default:
      return null;
  }
}

// ===================================================================
// OBLogoLockup ??top-left logo, contained box on dark themes
// ===================================================================
function OBLogoLockup({ theme = 'light', size = 24 }: { theme?: 'light' | 'dark'; size?: number }) {
  const onDark = theme === 'dark';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      {onDark ? (
        <div style={{
          background: '#fff', borderRadius: 9, padding: 4,
          display: 'inline-flex', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rezekii-logo.png" alt="Rezekii" width={size} height={size} style={{ display: 'block' }}/>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src="/rezekii-logo.png" alt="Rezekii" width={size + 6} height={size + 6} style={{ display: 'block' }}/>
      )}
      <div style={{ font: `800 15.5px/1 ${RZ.fontDisplay}`, color: onDark ? '#fff' : RZ.black, letterSpacing: '-0.015em' }}>Rezekii</div>
    </div>
  );
}

// ===================================================================
// OBText ??eyebrow + headline + sub block
// ===================================================================
function OBText({ eyebrow, headline, sub, theme = 'light' }: { eyebrow: string; headline: React.ReactNode; sub: React.ReactNode; theme?: 'light' | 'dark' }) {
  const ink = theme === 'dark' ? '#fff' : RZ.black;
  const subCol = theme === 'dark' ? 'rgba(255,255,255,0.75)' : 'rgba(13,17,23,0.62)';
  const eyeCol = theme === 'dark' ? RZ.cyan : RZ.green;
  return (
    <div className="ob-anim">
      <div style={{ font: `800 10px/1 ${RZ.fontDisplay}`, color: eyeCol, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10 }}>{eyebrow}</div>
      <div style={{ font: `800 clamp(21px,4.5dvh,27px)/1.14 ${RZ.fontDisplay}`, color: ink, letterSpacing: '-0.025em', marginBottom: 8, textWrap: 'balance' as const }}>{headline}</div>
      <div style={{ font: `500 clamp(12px,1.8dvh,13px)/1.5 ${RZ.fontUI}`, color: subCol, maxWidth: '100%' }}>{sub}</div>
    </div>
  );
}

// ===================================================================
// OBChrome ??shared scaffold (top logo + skip + progress + bottom CTA pair)
// ===================================================================
function OBChrome({
  idx, total, onPrev, onNext, onSkip, theme = 'light', shopStep, children,
}: {
  idx: number; total: number; onPrev: () => void; onNext: () => void; onSkip: () => void;
  theme?: 'light' | 'dark'; shopStep?: boolean; children: React.ReactNode;
}) {
  const isLast = idx === total - 1;
  const isFirst = idx === 0;
  const inkFg = theme === 'dark' ? '#fff' : RZ.black;
  const inkMuted = theme === 'dark' ? 'rgba(255,255,255,0.68)' : 'rgba(13,17,23,0.55)';
  const progBg = theme === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(13,17,23,0.12)';
  const progFg = theme === 'dark' ? RZ.cyan : RZ.green;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Header — top padding shrinks on short screens */}
      <div style={{ padding: 'clamp(18px,6dvh,52px) 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto', flexShrink: 0 }}>
        <OBLogoLockup theme={theme} size={24}/>
        {!isLast && (
          <button onClick={onSkip} style={{ background: 'transparent', border: 0, cursor: 'pointer', font: `600 12.5px/1 ${RZ.fontUI}`, color: inkMuted, padding: 6 }}>Skip</button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 20px', display: 'flex', gap: 4, pointerEvents: 'auto', flexShrink: 0 }}>
        {Array.from({ length: total }).map((_, j) => (
          <div key={j} style={{
            flex: j === idx ? 2.2 : 1, height: 3, borderRadius: 999,
            background: j <= idx ? progFg : progBg, transition: 'flex .3s, background .3s',
          }}/>
        ))}
      </div>

      {/* Spacer — stays at least 8dvh so graphic always shows through */}
      <div style={{ flex: 1, minHeight: 'clamp(60px,8dvh,200px)' }}/>

      {/* Bottom content — scrollable safety valve on very short screens */}
      <div style={{ padding: `0 22px clamp(14px,env(safe-area-inset-bottom,16px),30px)`, pointerEvents: 'auto', flexShrink: 0, overflowY: 'auto', maxHeight: '68dvh' }}>
        {children}
        {isLast ? (
          shopStep ? (
            /* ── Last slide · shop_step=1: TikTok ✅ connected → now connect Shop ── */
            <div className="ob-anim" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>

              {/* TikTok connected pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(0,192,115,0.10)',
                border: '1px solid rgba(0,192,115,0.28)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={RZ.green}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9.01a8.16 8.16 0 004.77 1.52V7.09a4.85 4.85 0 01-1.84-.4z"/></svg>
                <span style={{ font: `600 12.5px/1 ${RZ.fontUI}`, color: RZ.green, flex: 1 }}>TikTok Connected</span>
                {/* checkmark */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>

              {/* TikTok Shop connect button */}
              <button
                onClick={() => { window.location.href = '/api/auth/tiktok-shop/connect'; }}
                style={{
                  width: '100%', height: 54, borderRadius: 12, border: 0, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)',
                  color: '#fff',
                  font: `700 15px/1 ${RZ.fontUI}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 10px 28px rgba(255,0,80,0.35)',
                  position: 'relative', overflow: 'hidden',
                }}>
                <span aria-hidden="true" style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.2) 50%, transparent 65%)',
                  transform: 'translateX(-120%)',
                  animation: 'rzBtnSheen 3.6s ease-in-out infinite',
                }}/>
                <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  {/* TikTok Shop bag icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  Connect TikTok Shop
                </span>
              </button>

              {/* What you unlock */}
              <div style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
                {['GMV & earnings', 'Orders & products', 'Available to withdraw'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span style={{ font: `500 10px/1 ${RZ.fontUI}`, color: inkMuted, whiteSpace: 'nowrap' as const }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Skip */}
              <button
                onClick={() => { window.location.href = '/home'; }}
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'center',
                  font: `500 12px/1 ${RZ.fontUI}`, color: inkMuted, padding: '4px 0',
                }}>
                Skip for now — connect later in Settings
              </button>
            </div>
          ) : (
            /* ── Last slide · default: T&C above, back + TikTok CTA row ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
              <div style={{
                textAlign: 'center',
                font: `400 11px/1.4 ${RZ.fontUI}`,
                color: theme === 'dark' ? 'rgba(255,255,255,0.45)' : RZ.muted,
              }}>
                By continuing, you agree to our{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Terms</span>
                {' '}&amp;{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={onPrev} style={{
                  width: 48, height: 52, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(13,17,23,0.06)',
                  border: '1px solid rgba(13,17,23,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}><Icon name="chevL" size={17} color={inkFg}/></button>
                <button
                  onClick={onNext}
                  style={{
                    flex: 1, height: 52, borderRadius: 12, border: 0, cursor: 'pointer',
                    background: '#000', color: '#fff',
                    font: `700 15px/1 ${RZ.fontUI}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: '0 10px 28px rgba(0,0,0,0.38)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                  <span aria-hidden="true" style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
                    transform: 'translateX(-120%)',
                    animation: 'rzBtnSheen 3.6s ease-in-out infinite',
                  }}/>
                  <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ display: 'block', flexShrink: 0 }}>
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9.01a8.16 8.16 0 004.77 1.52V7.09a4.85 4.85 0 01-1.84-.4z"/>
                    </svg>
                    Continue with TikTok
                  </span>
                </button>
              </div>
            </div>
          )
        ) : (
          /* ── All other slides: back chevron + next button (back on slide 1 goes to /splash) ── */
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 22 }}>
          <button onClick={onPrev} style={{
            width: 48, height: 48, borderRadius: 14,
            background: theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(13,17,23,0.05)',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(13,17,23,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: 1, flexShrink: 0,
            backdropFilter: 'blur(10px)',
          }}><Icon name="chevL" size={17} color={inkFg}/></button>
            <button
              onClick={onNext}
              style={{
                flex: 1, height: 60, borderRadius: 16, border: 0, cursor: 'pointer',
                background: RZ.green, color: '#fff',
                font: `900 18px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 12px 28px rgba(0,192,115,0.42)',
                transition: 'transform .18s cubic-bezier(.3,1.4,.4,1), box-shadow .18s ease, filter .18s ease',
                position: 'relative', zIndex: 20, overflow: 'hidden',
              }}>
              <span aria-hidden="true" style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)',
                transform: 'translateX(-120%)',
                animation: 'rzBtnSheen 3.6s ease-in-out infinite',
              }}/>
              <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                Continue <Icon name="chevR" size={20} color="#fff"/>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================================================
// SLIDE 1 ??Commission +5% hero
// ===================================================================
function OBCommission() {
  type Accent = { kind: 'wallet' | 'receipt' | 'trend' | 'coin'; top: number; left?: number; right?: number; size: number; rot: number; bg: string; shadow: string; d: number };
  const accents: Accent[] = [
    { kind: 'wallet',  top: 150, left: 18,  size: 34, rot: -8,  bg: '#f5a623', shadow: '0 10px 20px rgba(245,166,35,0.5)', d: 0.00 },
    { kind: 'receipt', top: 156, right: 18, size: 32, rot:  7,  bg: '#00c5c5', shadow: '0 10px 20px rgba(0,197,197,0.5)', d: 0.25 },
    { kind: 'trend',   top: 395, left: 16,  size: 34, rot: -10, bg: '#00c073', shadow: '0 10px 20px rgba(0,192,115,0.5)', d: 0.45 },
    { kind: 'coin',    top: 400, right: 16, size: 32, rot:  10, bg: '#ff3b5c', shadow: '0 10px 20px rgba(255,59,92,0.5)', d: 0.60 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg,#062d1f 0%,#0d1117 60%,#000 100%)', overflow: 'hidden' }}>
      <style>{`
        @keyframes obcWobbleA {
          0%   { transform: rotate(calc(var(--rot, 0deg) - 3deg)) translateY(0) }
          25%  { transform: rotate(var(--rot, 0deg))              translateY(-6px) }
          50%  { transform: rotate(calc(var(--rot, 0deg) + 3deg)) translateY(0) }
          75%  { transform: rotate(var(--rot, 0deg))              translateY(5px) }
          100% { transform: rotate(calc(var(--rot, 0deg) - 3deg)) translateY(0) }
        }
        @keyframes obcWobbleB {
          0%   { transform: rotate(calc(var(--rot, 0deg) + 3deg)) translateY(0) }
          25%  { transform: rotate(var(--rot, 0deg))              translateY(5px) }
          50%  { transform: rotate(calc(var(--rot, 0deg) - 3deg)) translateY(0) }
          75%  { transform: rotate(var(--rot, 0deg))              translateY(-6px) }
          100% { transform: rotate(calc(var(--rot, 0deg) + 3deg)) translateY(0) }
        }
        @keyframes obcTilePulse { 0%,100% { filter: brightness(1) saturate(1) } 50% { filter: brightness(1.15) saturate(1.18) } }
      `}</style>

      <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,192,115,0.42), transparent 60%)' }}/>
      <div style={{ position: 'absolute', bottom: -140, left: -100, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,244,238,0.24), transparent 60%)' }}/>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1 }} viewBox="0 0 360 780" preserveAspectRatio="none">
        {Array.from({ length: 10 }).map((_, i) => <line key={i} x1="0" y1={i*90} x2="360" y2={i*90} stroke="#fff" strokeWidth="0.5"/>)}
        {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={i*50} y1="0" x2={i*50} y2="780" stroke="#fff" strokeWidth="0.5"/>)}
      </svg>

      {accents.map((s, i) => {
        const pos: React.CSSProperties = { position: 'absolute', top: s.top, ...(s.left != null ? { left: s.left } : { right: s.right }) };
        const anim = i % 2 === 0 ? 'obcWobbleA' : 'obcWobbleB';
        const S = Math.round(s.size * 0.6);
        let icon: React.ReactNode = null;
        if (s.kind === 'wallet') {
          icon = (
            <svg width={S} height={S} viewBox="0 0 24 24" fill="#fff">
              <path d="M4 7.5a2 2 0 0 1 2-2h11.5a1.5 1.5 0 0 1 0 3H6.5a.5.5 0 0 0 0 1h13A1.5 1.5 0 0 1 21 11v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z"/>
              <circle cx="17" cy="14" r="1.4" fill={s.bg}/>
            </svg>
          );
        } else if (s.kind === 'receipt') {
          icon = (
            <svg width={S} height={S} viewBox="0 0 24 24" fill="#fff">
              <path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3Z"/>
              <rect x="8.5" y="7" width="7" height="1.4" rx="0.5" fill={s.bg}/>
              <rect x="8.5" y="10" width="7" height="1.4" rx="0.5" fill={s.bg}/>
              <rect x="8.5" y="13" width="5" height="1.4" rx="0.5" fill={s.bg}/>
            </svg>
          );
        } else if (s.kind === 'trend') {
          icon = (
            <svg width={S} height={S} viewBox="0 0 24 24" fill="#fff">
              <path d="M3 19h18v2H3z"/>
              <path d="M4.5 15.5l5.5-5.5 3.5 3.5L20 7" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 7h6v6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          );
        } else {
          icon = (
            <svg width={S} height={S} viewBox="0 0 24 24" fill="#fff">
              <circle cx="12" cy="12" r="8.4"/>
              <path d="M12.8 7.2v1.2h1.8v1.5h-3.3a.9.9 0 0 0 0 1.8h1.4a2.4 2.4 0 0 1 0 4.8v1.3h-1.4v-1.3H9.4v-1.5h3.5a.9.9 0 0 0 0-1.8h-1.4a2.4 2.4 0 0 1 0-4.8V7.2h1.3Z" fill={s.bg}/>
            </svg>
          );
        }
        return (
          <div key={i} style={{
            ...pos,
            width: s.size, height: s.size, borderRadius: Math.round(s.size * 0.26),
            background: s.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `${s.shadow}, inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.08)`,
            border: '1px solid rgba(255,255,255,0.18)',
            transformOrigin: 'center',
            ['--rot' as string]: `${s.rot}deg`,
            transform: `rotate(${s.rot}deg)`,
            animation: `${anim} 3.8s ease-in-out ${s.d}s infinite, obcTilePulse 2.6s ease-in-out ${s.d}s infinite`,
          } as React.CSSProperties}>
            {icon}
          </div>
        );
      })}

      <div style={{ position: 'absolute', top: '22%', left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ font: `800 9px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.7)', letterSpacing: '.32em', textTransform: 'uppercase', marginBottom: 6 }}>up to</div>
        <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{
            font: `900 170px/0.9 ${RZ.fontDisplay}`, letterSpacing: '-0.05em',
            background: 'linear-gradient(180deg,#25f4ee 0%,#00c073 60%,#00c073 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            display: 'inline-block',
          }}>+5%</div>
          <div style={{
            font: `800 9px/1 ${RZ.fontDisplay}`, color: RZ.cyan,
            letterSpacing: '.28em', textTransform: 'uppercase',
            marginTop: 14, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>or more</div>
        </div>
        <div style={{ font: `700 10.5px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.6)', letterSpacing: '.32em', textTransform: 'uppercase', marginTop: 8 }}>commission · vs open plan</div>
      </div>

      <div style={{
        position: 'absolute', top: '56%', left: 22, right: 22,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.16)',
        }}>
          <div style={{ font: `600 9px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '.14em' }}>Open plan</div>
          <div style={{ font: `800 22px/1 ${RZ.fontDisplay}`, color: '#fff', marginTop: 8, letterSpacing: '-0.01em' }}>5%</div>
          <div style={{ font: `500 9.5px/1.3 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>Standard rate</div>
        </div>
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: 'linear-gradient(135deg,#00c073,#009a5c)',
          boxShadow: '0 12px 30px rgba(0,192,115,0.45)',
          position: 'relative',
        }}>
          <div style={{ font: `600 9px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase', letterSpacing: '.14em' }}>With Rezekii</div>
          <div style={{ font: `800 22px/1 ${RZ.fontDisplay}`, color: '#fff', marginTop: 8, letterSpacing: '-0.01em' }}>6–10%</div>
          <div style={{ font: `500 9.5px/1.3 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.88)', marginTop: 6 }}>up to +5% or more bonus</div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// SLIDE 2 ??Tier ladder
// ===================================================================
function OBRank() {
  const tiers = [
    { t: 'Outsider',   earn: '0%',   color: '#9aa5b1', outsider: true },
    { t: 'New joiner', earn: '+1%',  color: '#25f4ee', active: true },
    { t: 'Rising',     earn: '+2%',  color: '#00c073' },
    { t: 'Mid',        earn: '+3%',  color: '#f5a623' },
    { t: 'Top',        earn: '+4%',  color: '#e8005a' },
    { t: 'MCN',        earn: '+5%',  color: '#8b5cf6' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#f0fbf5 0%, #e4f6ec 60%, #d0edd9 100%)', overflow: 'hidden' }}>
      <style>{`
        @keyframes rnkBarGrow { 0% { opacity: 0; transform: scaleY(0.2) } 100% { opacity: 1; transform: scaleY(1) } }
        @keyframes rnkPulse { 0%,100% { transform: translate(-50%,0) } 50% { transform: translate(-50%,-3px) } }
        @keyframes rnkCalloutIn { from { opacity: 0; transform: translate(-50%, 8px) scale(0.85) } to { opacity: 1; transform: translate(-50%, 0) scale(1) } }
        @keyframes rnkFadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }} viewBox="0 0 360 780">
        {Array.from({ length: 36 }).map((_, i) => {
          const colors = ['#00c073', '#25f4ee', '#f5a623', '#e8005a'];
          const x = (i * 37) % 360, y = (i * 53) % 780;
          return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.5 : 1.3} fill={colors[i % 4]} opacity={0.35}/>;
        })}
      </svg>

      <div style={{ position: 'absolute', top: 138, left: 0, right: 0, textAlign: 'center', opacity: 0, animation: 'rnkFadeUp .55s ease .1s forwards' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: RZ.black, color: '#fff', font: `900 9.5px/1 ${RZ.fontDisplay}`, letterSpacing: '.14em', boxShadow: '0 8px 18px rgba(13,17,23,0.18)' }}>
          CREATOR TIER LADDER
        </div>
        <div style={{ marginTop: 11, font: `800 20px/1.15 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.025em', padding: '0 44px', textWrap: 'balance' as const }}>
          Higher Tier, <span style={{ color: RZ.green }}>Higher Benefit.</span>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 240, left: '50%', transform: 'translateX(-50%)',
        width: 2, height: 38,
        background: 'linear-gradient(180deg, rgba(0,192,115,0) 0%, #00c073 100%)',
        opacity: 0, animation: 'rnkFadeUp .5s ease .35s forwards',
      }}/>

      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 7, padding: '0 20px' }}>
        {tiers.map((t, i) => {
          const barH = t.outsider ? 30 : 44 + (i - 1) * 22;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
              {t.active && (
                <div style={{ position: 'absolute', top: -54, left: '50%', padding: '5px 9px', borderRadius: 999, background: RZ.black, color: '#fff', font: `900 8.5px/1 ${RZ.fontDisplay}`, letterSpacing: '.06em', whiteSpace: 'nowrap', boxShadow: '0 8px 18px rgba(0,0,0,0.22)', zIndex: 3, transform: 'translate(-50%, 0)', opacity: 0, animation: 'rnkCalloutIn .55s cubic-bezier(.2,.9,.3,1.3) 1.55s forwards, rnkPulse 1.8s ease-in-out 2.2s infinite' }}>
                  YOU START HERE
                  <svg width="14" height="12" viewBox="0 0 14 12" style={{ position: 'absolute', left: '50%', bottom: -10, transform: 'translateX(-50%)', display: 'block' }}>
                    <path d="M7 0v6M3 4l4 4 4-4" stroke={RZ.cyan} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              <div style={{
                font: `800 11.5px/1 ${RZ.fontDisplay}`,
                color: t.active ? RZ.black : 'rgba(13,17,23,0.6)',
                letterSpacing: '-0.01em',
                opacity: 0, animation: `rnkFadeUp .5s ease ${0.55 + i * 0.09}s forwards`,
              }}>{t.earn}</div>
              <div style={{
                width: '100%', height: barH, borderRadius: '9px 9px 3px 3px',
                background: t.outsider
                  ? 'repeating-linear-gradient(45deg, rgba(154,165,177,0.3) 0 4px, rgba(154,165,177,0.15) 4px 8px)'
                  : `linear-gradient(180deg, ${t.color}, ${t.color}cc)`,
                border: t.outsider ? '1.5px dashed rgba(154,165,177,0.55)' : 'none',
                opacity: t.active ? 1 : (t.outsider ? 0.85 : 0.62),
                boxShadow: t.active ? `0 16px 34px ${t.color}66, inset 0 -3px 0 rgba(0,0,0,0.14)` : 'inset 0 -2px 0 rgba(0,0,0,0.08)',
                outline: t.active ? '3px solid #fff' : 'none',
                outlineOffset: t.active ? -3 : 0,
                transformOrigin: 'bottom',
                animation: `rnkBarGrow .55s cubic-bezier(.3,1.2,.4,1) ${0.45 + i * 0.09}s backwards`,
              }}/>
              <div style={{
                font: `700 9px/1.15 ${RZ.fontDisplay}`,
                color: t.active ? RZ.black : 'rgba(13,17,23,0.55)',
                letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'center',
                opacity: 0, animation: `rnkFadeUp .5s ease ${0.65 + i * 0.09}s forwards`,
              }}>{t.t}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'absolute', top: 488, left: 22, right: 22,
        padding: '11px 13px', borderRadius: 14,
        background: '#fff', border: '1.5px solid rgba(13,17,23,0.06)',
        boxShadow: '0 16px 34px rgba(13,17,23,0.10)',
        display: 'flex', alignItems: 'center', gap: 11,
        opacity: 0, animation: 'rnkFadeUp .55s ease 1.3s forwards',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: RZ.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 16px rgba(0,192,115,0.35)' }}>
          <Icon name="check" size={16} color="#fff" strokeWidth={3}/>
        </div>
        <div style={{ flex: 1, font: `500 11.5px/1.4 ${RZ.fontDisplay}`, color: 'rgba(13,17,23,0.75)' }}>
          <b style={{ color: RZ.black }}>Join Rezekii, verify your account</b> — then enjoy additional commission on selected eligible products (not every listing qualifies).
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// SLIDE 3 ??Sample APPROVED within 24h
// ===================================================================
function OBSample() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: RZ.black, overflow: 'hidden' }}>
      <style>{`
        @keyframes smpPhotoFade { from { opacity: 0; transform: scale(1.06) } to { opacity: 1; transform: scale(1) } }
        @keyframes smpChipIn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes smpStampPop { 0% { opacity: 0; transform: rotate(8deg) scale(0.5) } 60% { opacity: 1; transform: rotate(8deg) scale(1.08) } 100% { opacity: 1; transform: rotate(8deg) scale(1) } }
        @keyframes smpChipL { from { opacity: 0; transform: translateX(-10px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes smpRise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes smpApprovedPulse { 0%,100% { box-shadow: 0 20px 50px rgba(0,192,115,0.55), 0 0 0 0 rgba(0,192,115,0.4) } 50% { box-shadow: 0 20px 50px rgba(0,192,115,0.55), 0 0 0 14px rgba(0,192,115,0) } }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '62%', overflow: 'hidden', animation: 'smpPhotoFade .7s cubic-bezier(.2,.8,.2,1)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/product-tech.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%', background: 'linear-gradient(180deg, rgba(13,17,23,0.25) 0%, transparent 30%, transparent 55%, #0d1117 100%)' }}/>

      <div style={{ position: 'absolute', top: 150, left: 20, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px 7px 11px', borderRadius: 12, background: 'rgba(13,17,23,0.82)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.18)', opacity: 0, animation: 'smpChipIn .55s ease .2s forwards' }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: RZ.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TTIcon name="gift" size={13} color="#fff"/>
        </div>
        <div style={{ font: `800 12px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.01em' }}>Sample Request</div>
        <div style={{ padding: '3px 7px', borderRadius: 999, background: 'rgba(37,244,238,0.22)', border: '1px solid rgba(37,244,238,0.5)', font: `900 9px/1 ${RZ.fontDisplay}`, color: RZ.cyan, letterSpacing: '.1em' }}>TECH</div>
      </div>

      <div style={{ position: 'absolute', top: '32%', left: 20, padding: '6px 10px', borderRadius: 999, background: RZ.cyan, font: `900 10px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '.08em', boxShadow: '0 8px 18px rgba(37,244,238,0.35)', opacity: 0, animation: 'smpChipL .5s ease .55s forwards' }}>LOW ENTRY</div>

      <div style={{
        position: 'absolute', top: '28%', right: 16,
        padding: '10px 14px', border: `3px solid ${RZ.green}`, borderRadius: 12,
        background: 'rgba(0,192,115,0.22)', backdropFilter: 'blur(12px)',
        opacity: 0,
        animation: 'smpStampPop .55s cubic-bezier(.3,1.5,.4,1) .85s forwards, smpApprovedPulse 2.2s ease-in-out 1.4s infinite',
      }}>
        <div style={{ font: `900 10px/1 ${RZ.fontDisplay}`, color: '#a8f0ca', letterSpacing: '.2em', textTransform: 'uppercase' }}>Sample</div>
        <div style={{ font: `900 26px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.02em', marginTop: 4 }}>APPROVED</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Icon name="check" size={12} color="#a8f0ca" strokeWidth={3}/>
          <div style={{ font: `700 10px/1 ${RZ.fontDisplay}`, color: '#a8f0ca', letterSpacing: '.06em' }}>WITHIN 24H</div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: '56%', left: 20, right: 20, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', opacity: 0, animation: 'smpRise .55s ease 1.1s forwards' }}>
          <div style={{ font: `600 9px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '.14em' }}>Open plan</div>
          <div style={{ font: `800 15px/1 ${RZ.fontDisplay}`, color: '#fff', marginTop: 6, textDecoration: 'line-through', opacity: 0.7 }}>5–7 working days</div>
          <div style={{ font: `600 10px/1 ${RZ.fontDisplay}`, color: '#ff6b8a', marginTop: 5 }}>And often rejected</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'linear-gradient(135deg,#00c073,#009a5c)', boxShadow: '0 10px 24px rgba(0,192,115,0.4)', opacity: 0, animation: 'smpRise .55s ease 1.3s forwards' }}>
          <div style={{ font: `600 9px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.88)', textTransform: 'uppercase', letterSpacing: '.14em' }}>Rezekii</div>
          <div style={{ font: `800 15px/1 ${RZ.fontDisplay}`, color: '#fff', marginTop: 6 }}>Within 24h</div>
          <div style={{ font: `700 10px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.92)', marginTop: 5 }}>If requirements met</div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// SLIDE 4 ??5 Ways to earn (hub + spokes)
// ===================================================================
function OBCampaigns() {
  const VB_W = 360, VB_H = 780;
  const HUB = { cx: 180, cy: 210 };

  type Row = { icon: 'trend' | 'play' | 'pkg' | 'sparkles' | 'pin'; title: string; sub: string; amt: string; bg: string; x: number; y: number; w: number; anchorX: number; anchorY: number; d: number };
  const rows: Row[] = [
    { icon: 'trend',    title: 'Affiliate',             sub: 'Earn per sale',             amt: '',       bg: '#00c073', x: 28,  y: 290, w: 144, anchorX: 172, anchorY: 310, d: 0.75 },
    { icon: 'play',     title: 'Paid Reviews',          sub: 'TikTok Brand Mission',      amt: 'RM 350', bg: '#e8005a', x: 188, y: 290, w: 144, anchorX: 188, anchorY: 310, d: 0.90 },
    { icon: 'pkg',      title: 'Gift Reviews',          sub: 'Free Product + Incentive',  amt: 'FREE',   bg: '#0abdb8', x: 28,  y: 386, w: 144, anchorX: 172, anchorY: 406, d: 1.05 },
    { icon: 'sparkles', title: 'UGC Reviews',           sub: 'Creative for Seller Ads',   amt: 'RM 800', bg: '#f5a623', x: 188, y: 386, w: 144, anchorX: 188, anchorY: 406, d: 1.20 },
    { icon: 'pin',      title: 'Store or Event Visits', sub: 'On-Site Content & Visit',   amt: 'RM 300', bg: '#8b5cf6', x: 28,  y: 482, w: 304, anchorX: 180, anchorY: 482, d: 1.35 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg,#fef6ea 0%,#ffffff 50%,#e8fcef 100%)', overflow: 'hidden' }}>
      <style>{`
        @keyframes cmpHubIn { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.6) } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
        @keyframes cmpCardIn { from { opacity: 0; transform: translateY(12px) scale(0.94) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes cmpLineDraw { from { stroke-dashoffset: 220 } to { stroke-dashoffset: 0 } }
        @keyframes cmpDotPulse { 0%,100% { r: 3.5; opacity: 1 } 50% { r: 5; opacity: 0.55 } }
        @keyframes cmpHubGlow { 0%,100% { box-shadow: 0 30px 60px rgba(0,192,115,0.45), 0 0 0 0 rgba(0,192,115,0.35) } 50% { box-shadow: 0 30px 60px rgba(0,192,115,0.45), 0 0 0 16px rgba(0,192,115,0) } }
        @keyframes cmpPillPop { from { transform: translateX(-50%) scale(0.5); opacity: 0 } to { transform: translateX(-50%) scale(1); opacity: 1 } }
      `}</style>

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        {Array.from({ length: 180 }).map((_, i) => {
          const x = (i % 18) * 20 + 10, y = Math.floor(i / 18) * 40 + 40;
          return <circle key={i} cx={x} cy={y} r="1" fill={RZ.green} opacity={0.4}/>;
        })}
      </svg>

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <defs>
          <radialGradient id="hubRing" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#00c073" stopOpacity="0"/>
            <stop offset="85%" stopColor="#00c073" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#00c073" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx={HUB.cx} cy={HUB.cy} r="110" fill="url(#hubRing)"/>
        {rows.map((r, i) => (
          <g key={i}>
            <path
              d={`M ${HUB.cx} ${HUB.cy} L ${r.anchorX} ${r.anchorY}`}
              stroke={r.bg} strokeWidth="1.6" fill="none"
              strokeDasharray="4 4" strokeLinecap="round" opacity="0.55"
              style={{ animation: `cmpLineDraw .6s ease ${r.d}s backwards` }}
            />
            <circle cx={r.anchorX} cy={r.anchorY} r="3.5" fill={r.bg}
              style={{ animation: `cmpDotPulse 1.8s ease-in-out ${r.d + 0.6}s infinite` }}
            />
          </g>
        ))}
      </svg>

      <div style={{
        position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)',
        padding: '7px 16px', borderRadius: 999,
        background: RZ.black, color: '#fff',
        font: `900 10px/1 ${RZ.fontDisplay}`, letterSpacing: '.24em', whiteSpace: 'nowrap',
        boxShadow: '0 10px 22px rgba(13,17,23,0.28)',
        display: 'inline-flex', alignItems: 'center', gap: 7,
        zIndex: 4,
        animation: 'cmpPillPop .5s cubic-bezier(.3,1.4,.4,1) 0s backwards',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: RZ.green, boxShadow: '0 0 0 3px rgba(0,192,115,0.25)' }}/>
        5 WAYS TO EARN
      </div>

      <div style={{
        position: 'absolute', top: HUB.cy / VB_H * 100 + '%', left: HUB.cx / VB_W * 100 + '%',
        width: 94, height: 94, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #25f4ee, #00c073 55%, #009a5c)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: '4px solid #ffffff',
        zIndex: 2, transform: 'translate(-50%,-50%)',
        animation: 'cmpHubIn .6s cubic-bezier(.3,1.4,.4,1) .45s backwards, cmpHubGlow 2.4s ease-in-out 1.4s infinite',
      }}>
        <div style={{ font: `900 34px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.06em', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>1</div>
        <div style={{ font: `900 8.5px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '.32em', marginTop: 3, opacity: 0.95 }}>APP</div>
      </div>

      {rows.map((r, i) => (
        <div key={i} style={{
          position: 'absolute', top: r.y, left: r.x, width: r.w,
          padding: '10px 11px', borderRadius: 14, background: '#fff',
          border: '1.5px solid rgba(13,17,23,0.06)',
          boxShadow: `0 18px 34px ${r.bg}22, 0 2px 4px rgba(13,17,23,0.06)`,
          display: 'flex', alignItems: 'center', gap: 9,
          zIndex: 3,
          opacity: 0,
          animation: `cmpCardIn .55s cubic-bezier(.3,1.2,.4,1) ${r.d + 0.1}s forwards`,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: r.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: `0 6px 12px ${r.bg}55`,
          }}>
            {r.icon === 'pin' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/>
                <circle cx="12" cy="10" r="2.5"/>
              </svg>
            ) : (
              <Icon name={r.icon} size={14} color="#fff"/>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `800 10.5px/1.1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>{r.title}</div>
            <div style={{ font: `500 8.5px/1.2 ${RZ.fontDisplay}`, color: 'rgba(13,17,23,0.55)', marginTop: 3 }}>{r.sub}</div>
          </div>
          {r.amt && (<div style={{ font: `800 9px/1 ${RZ.fontDisplay}`, color: r.bg, padding: '3px 6px', borderRadius: 5, background: `${r.bg}15`, flexShrink: 0 }}>{r.amt}</div>)}
        </div>
      ))}
    </div>
  );
}

// ===================================================================
// SLIDE 5 ??Sellers DM you (live pitch profile card)
// ===================================================================
function OBProfile() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #1a2a3f 0%, #0d1117 55%, #000 100%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: '100%', background: 'linear-gradient(180deg, rgba(37,244,238,0.4), transparent 70%)' }}/>
      <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,244,238,0.25), transparent 60%)', filter: 'blur(20px)' }}/>

      <svg style={{ position: 'absolute', top: '23%', left: '50%', transform: 'translateX(-50%)', width: 300, height: 300 }} viewBox="0 0 300 300">
        {[60, 100, 140].map((r, i) => (
          <circle key={i} cx="150" cy="150" r={r} stroke={RZ.cyan} strokeWidth="1" fill="none" opacity={0.35 - i * 0.1} strokeDasharray="3 4"/>
        ))}
      </svg>

      {[
        { x: 40, y: 200, label: 'Verified', c: '#00c073' },
        { x: 290, y: 180, label: 'Trusted', c: '#25f4ee' },
        { x: 300, y: 350, label: 'Backed', c: '#f5a623' },
        { x: 30, y: 380, label: 'Approved', c: '#e8005a' },
      ].map((a, i) => (
        <div key={i} style={{
          position: 'absolute', left: a.x - 6, top: a.y,
          padding: '5px 9px', borderRadius: 999,
          background: 'rgba(13,17,23,0.6)', border: `1px solid ${a.c}55`,
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', gap: 5,
          font: `800 8.5px/1 ${RZ.fontDisplay}`, color: a.c, letterSpacing: '.1em', textTransform: 'uppercase',
          boxShadow: `0 6px 14px ${a.c}33`,
        }}>
          <Icon name="check" size={9} color={a.c} strokeWidth={3.5}/> {a.label}
        </div>
      ))}

      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: 240, padding: 14, borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
        border: '1.5px solid rgba(37,244,238,0.35)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(37,244,238,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: `700 9px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.6)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: RZ.cyan, boxShadow: `0 0 8px ${RZ.cyan}` }}/> Live pitch
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#f5a623,#e8005a)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 20px/1 ${RZ.fontDisplay}`, color: '#fff', border: '2px solid rgba(255,255,255,0.14)' }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.01em' }}>Aisyah R.</div>
            <div style={{ font: `500 11px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.55)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <TikTokGlyph size={10}/> @aisyah · 24.3K
            </div>
          </div>
          <div style={{ padding: '3px 7px', borderRadius: 999, background: 'rgba(0,192,115,0.22)', border: '1px solid rgba(0,192,115,0.4)', font: `800 9px/1 ${RZ.fontDisplay}`, color: RZ.green, letterSpacing: '.06em' }}>T2</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginTop: 12 }}>
          {[['Niche','Beauty'],['Views','2.1M'],['Conv.','4.8%']].map(([k,v], i) => (
            <div key={i} style={{ padding: '7px 6px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <div style={{ font: `500 8.5px/1 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{k}</div>
              <div style={{ font: `800 12.5px/1 ${RZ.fontDisplay}`, color: '#fff', marginTop: 5 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', top: '57%', left: 30, right: 30,
        padding: '10px 12px', borderRadius: 12,
        background: 'linear-gradient(90deg, rgba(37,244,238,0.18), rgba(37,244,238,0.06))',
        border: '1px solid rgba(37,244,238,0.45)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 10px 30px rgba(37,244,238,0.15)',
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: RZ.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={13} color={RZ.black}/></div>
        <div style={{ flex: 1, font: `500 11.5px/1.3 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.92)' }}><b style={{ color: '#fff', fontWeight: 800 }}>Verified seller</b> wants to send you a sample</div>
      </div>
    </div>
  );
}

// ===================================================================
// SLIDE 6 ??Brand collab invites
// ===================================================================
function OBCollabs() {
  type B = { cat: string; icon: TTIconName; color: string; offer: string; rot: number };
  const brands: B[] = [
    { cat: 'Wellness',   icon: 'heart',    color: '#e8005a', offer: 'Product review series · RM 1.2K',  rot: -3 },
    { cat: 'Beauty',     icon: 'sparkles', color: '#8b5cf6', offer: 'Long-term ambassador slot',         rot: 2 },
    { cat: 'Tech',       icon: 'play',     color: '#0066ff', offer: 'Launch partner · RM 1.5K',          rot: -2 },
    { cat: 'Home & F&B', icon: 'gift',     color: '#f5a623', offer: 'Cookware review + recipe content',  rot: 3 },
    { cat: 'Fashion',    icon: 'save',     color: '#00c073', offer: 'Seasonal drop · RM 950',            rot: -2 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#f5eeff 0%,#fff5e8 100%)', overflow: 'hidden' }}>
      <style>{`
        @keyframes clbCardIn { from { opacity: 0; transform: translateX(-18px) rotate(var(--r, 0deg)) } to { opacity: 1; transform: translateX(0) rotate(var(--r, 0deg)) } }
        @keyframes clbTagIn { from { opacity: 0; transform: rotate(0) scale(0.6) } to { opacity: 1; transform: rotate(4deg) scale(1) } }
      `}</style>

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }} viewBox="0 0 360 780">
        {Array.from({ length: 30 }).map((_, i) => {
          const x = (i * 41) % 360, y = (i * 71) % 780;
          return <path key={i} d={`M${x} ${y} l10 -5 l0 10 z`} fill="#8b5cf6" opacity="0.3"/>;
        })}
      </svg>

      <div style={{ position: 'absolute', top: 150, right: -10, padding: '5px 22px 5px 12px', background: RZ.black, color: '#fff', font: `800 10.5px/1 ${RZ.fontDisplay}`, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', opacity: 0, animation: 'clbTagIn .5s cubic-bezier(.3,1.4,.4,1) .15s forwards', transformOrigin: 'right center' }}>
        INVITES WAITING
      </div>

      {brands.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: 18 + (i % 2 === 0 ? 0 : 14), right: 18 - (i % 2 === 0 ? 0 : 14),
          top: 182 + i * 70,
          padding: 12, borderRadius: 16,
          background: '#fff',
          border: '1.5px solid rgba(13,17,23,0.06)',
          boxShadow: '0 16px 32px rgba(13,17,23,0.1), 0 2px 4px rgba(13,17,23,0.04)',
          display: 'flex', alignItems: 'center', gap: 11,
          ['--r' as string]: `${b.rot}deg`,
          opacity: 0,
          animation: `clbCardIn .5s cubic-bezier(.3,1.2,.4,1) ${0.25 + i * 0.1}s forwards`,
        } as React.CSSProperties}>
          <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: b.color }}/>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg, ${b.color}, ${b.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 8px 18px ${b.color}55` }}>
            <TTIcon name={b.icon} size={20} color="#fff"/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ font: `800 13px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>{b.cat}</div>
              <div style={{ font: `500 9.5px/1 ${RZ.fontDisplay}`, color: 'rgba(13,17,23,0.5)' }}>· Brand collab</div>
            </div>
            <div style={{ font: `500 11px/1.3 ${RZ.fontDisplay}`, color: 'rgba(13,17,23,0.7)', marginTop: 4 }}>{b.offer}</div>
          </div>
          <div style={{ padding: '5px 9px', borderRadius: 7, background: RZ.black, color: '#fff', font: `900 9.5px/1 ${RZ.fontDisplay}`, letterSpacing: '.08em' }}>INVITED</div>
        </div>
      ))}
    </div>
  );
}

// ===================================================================
// SLIDE 7 ??Creator levels (L6-L8)
// ===================================================================
function OBMentor() {
  type L = { lv: string; img: string; tag: string; color: string; perk: string; featured?: boolean };
  const levels: L[] = [
    { lv: 'L8', img: '/level-8.jpg', tag: 'Diamond',  color: '#25f4ee', perk: 'Top-tier perks + MCN priority', featured: true },
    { lv: 'L7', img: '/level-7.jpg', tag: 'Platinum', color: '#8b5cf6', perk: 'Bigger briefs · higher rates' },
    { lv: 'L6', img: '/level-6.jpg', tag: 'Gold',     color: '#f5a623', perk: 'Consistent brand invites' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0d1117 0%,#1a1f2e 55%,#0d1117 100%)', overflow: 'hidden' }}>
      <style>{`
        @keyframes lvlCardIn { from { opacity: 0; transform: translateY(18px) scale(0.94) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes lvlGlow { 0%,100% { box-shadow: 0 14px 34px rgba(37,244,238,0.35), 0 0 0 0 rgba(37,244,238,0.3) } 50% { box-shadow: 0 14px 34px rgba(37,244,238,0.35), 0 0 0 10px rgba(37,244,238,0) } }
        @keyframes lvlBadgePop { from { opacity: 0; transform: scale(0.5) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 340, height: 280, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(37,244,238,0.22), transparent 65%)', filter: 'blur(18px)' }}/>
      <div style={{ position: 'absolute', bottom: '28%', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(0,192,115,0.55), transparent)' }}/>

      <div style={{ position: 'absolute', top: 132, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'rgba(37,244,238,0.14)', border: '1px solid rgba(37,244,238,0.4)', backdropFilter: 'blur(10px)', font: `800 10px/1 ${RZ.fontDisplay}`, color: RZ.cyan, letterSpacing: '.14em' }}>
          <TTIcon name="stats" size={11} color={RZ.cyan}/> CREATOR LEVEL
        </div>
      </div>

      <div style={{ position: 'absolute', top: 160, left: 22, right: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {levels.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 8, borderRadius: 14,
            background: l.featured
              ? 'linear-gradient(90deg, rgba(37,244,238,0.18), rgba(37,244,238,0.04))'
              : 'rgba(255,255,255,0.04)',
            border: l.featured ? '1.5px solid rgba(37,244,238,0.5)' : '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            opacity: 0,
            animation: `lvlCardIn .55s cubic-bezier(.3,1.2,.4,1) ${0.2 + i * 0.15}s forwards${l.featured ? ', lvlGlow 2.4s ease-in-out 1.2s infinite' : ''}`,
          }}>
            <div style={{
              position: 'relative', width: 52, height: 52, borderRadius: 11, overflow: 'hidden', flexShrink: 0,
              border: `2px solid ${l.color}`,
              boxShadow: `0 6px 14px ${l.color}55`,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              <div style={{
                position: 'absolute', top: 4, left: 4,
                padding: '2px 5px', borderRadius: 5,
                background: l.color, color: RZ.black,
                font: `900 9.5px/1 ${RZ.fontDisplay}`, letterSpacing: '.04em',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              }}>{l.lv}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ font: `900 14px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.02em' }}>Level {l.lv.slice(1)}</div>
                <div style={{ padding: '2px 6px', borderRadius: 5, background: `${l.color}22`, border: `1px solid ${l.color}55`, font: `800 8.5px/1 ${RZ.fontDisplay}`, color: l.color, letterSpacing: '.08em' }}>{l.tag.toUpperCase()}</div>
              </div>
              <div style={{ font: `500 10.5px/1.35 ${RZ.fontDisplay}`, color: 'rgba(255,255,255,0.72)' }}>{l.perk}</div>
            </div>
            {l.featured && (
              <div style={{
                padding: '4px 8px', borderRadius: 6, background: RZ.cyan, color: RZ.black,
                font: `900 9px/1 ${RZ.fontDisplay}`, letterSpacing: '.08em', flexShrink: 0,
                animation: 'lvlBadgePop .4s cubic-bezier(.3,1.5,.4,1) .8s backwards',
              }}>GOAL</div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', top: 394, left: 18, right: 18,
        padding: '10px 12px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(0,192,115,0.22), rgba(37,244,238,0.08))',
        border: '1px solid rgba(0,192,115,0.4)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 24px rgba(0,192,115,0.18)',
        display: 'flex', alignItems: 'center', gap: 10,
        opacity: 0,
        animation: 'lvlCardIn .55s ease .95s forwards, lvlGlow 2.6s ease-in-out 1.8s infinite',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', flexShrink: 0, boxShadow: '0 5px 12px rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.18)', animation: 'lvlBadgePop .5s cubic-bezier(.3,1.5,.4,1) 1.1s backwards' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/techwide-logo.png" alt="Techwide Marketing" width={32} height={32} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `700 7px/1 ${RZ.fontDisplay}`, color: RZ.cyan, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 3 }}>Certified TikTok Shop Partner · MCN</div>
          <div style={{ font: `800 11px/1.15 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Techwide Marketing Sdn Bhd</div>
        </div>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: RZ.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 5px 12px rgba(0,192,115,0.45)' }}>
          <Icon name="check" size={12} color="#fff" strokeWidth={3}/>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// SLIDE 8 ??Latest drops feed (animated ticker)
// ===================================================================
function OBCaseStudy() {
  type U = { tag: string; tagColor: string; title: string; meta: string; img: string | null };
  const updates: U[] = [
    { tag: 'VIRAL PRODUCT',  tagColor: '#e8005a', title: 'Glow Serum 30ml',        meta: '1.2M views · RM 5.1K',     img: 'product-beauty' },
    { tag: 'POLICY UPDATE',  tagColor: '#f5a623', title: 'New commission split',   meta: 'Effective Apr 24',          img: null },
    { tag: 'VIRAL FORMAT',   tagColor: '#8b5cf6', title: '3-sec hook template',    meta: '842K views · +6.2% CTR',    img: 'product-tech' },
    { tag: 'LIVE STRATEGY',  tagColor: '#00c073', title: 'Golden hour 8–10pm',     meta: '4× more GMV vs daytime',    img: null },
  ];

  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % updates.length), 1600);
    return () => clearInterval(t);
  }, [updates.length]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#fff5f0 0%,#ffffff 50%,#eef9fe 100%)', overflow: 'hidden' }}>
      <style>{`
        @keyframes obPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes obSlideIn { from { opacity: 0; transform: translateX(8px) } to { opacity: 1; transform: translateX(0) } }
      `}</style>

      <svg style={{ position: 'absolute', top: 'clamp(80px,11dvh,120px)', right: 20, opacity: 0.22 }} width="48" height="48" viewBox="0 0 60 60">
        <polygon points="20,12 48,30 20,48" fill="#e8005a"/>
      </svg>
      <svg style={{ position: 'absolute', top: '48%', left: 14, opacity: 0.2 }} width="36" height="36" viewBox="0 0 40 40">
        <polygon points="14,8 32,20 14,32" fill={RZ.cyanText}/>
      </svg>

      <div style={{ position: 'absolute', top: 'clamp(76px,11dvh,112px)', left: 22, display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 999, background: RZ.black, color: '#fff', font: `800 10px/1 ${RZ.fontDisplay}`, letterSpacing: '.12em' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: RZ.cyan, boxShadow: `0 0 8px ${RZ.cyan}`, animation: 'obPulse 1.2s ease-in-out infinite' }}/>
        LATEST DROPS
      </div>

      <div style={{ position: 'absolute', top: 'clamp(120px,19dvh,162px)', left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'clamp(260px,42dvh,370px)', overflow: 'hidden' }}>
        {updates.map((u, i) => {
          const isActive = i === active;
          return (
            <div key={i} style={{
              padding: '9px 13px', borderRadius: 15,
              background: '#fff',
              border: isActive ? `1.5px solid ${u.tagColor}` : '1.5px solid rgba(13,17,23,0.06)',
              boxShadow: isActive ? `0 14px 30px ${u.tagColor}33, 0 2px 4px rgba(13,17,23,0.04)` : '0 4px 10px rgba(13,17,23,0.06)',
              display: 'flex', alignItems: 'center', gap: 11,
              transform: isActive ? 'scale(1.035)' : 'scale(1)',
              transition: 'all .4s cubic-bezier(.2,.8,.2,1)',
              position: 'relative', overflow: 'hidden',
            }}>
              {isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: u.tagColor }}/>
              )}
              {u.img ? (
                <div style={{ width: 50, height: 50, borderRadius: 11, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/${u.img}.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, transparent, rgba(0,0,0,0.2))' }}/>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                    <svg width="14" height="14" viewBox="0 0 12 12"><polygon points="4,2 10,6 4,10" fill="#fff"/></svg>
                  </div>
                </div>
              ) : (
                <div style={{ width: 50, height: 50, borderRadius: 11, background: `${u.tagColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={u.tag === 'POLICY UPDATE' ? 'bell' : 'trend'} size={22} color={u.tagColor}/>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: `${u.tagColor}15`, color: u.tagColor, font: `900 9px/1 ${RZ.fontDisplay}`, letterSpacing: '.08em', marginBottom: 6 }}>{u.tag}</div>
                <div style={{ font: `800 13.5px/1.2 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.title}</div>
                <div style={{ font: `500 10.5px/1.2 ${RZ.fontDisplay}`, color: 'rgba(13,17,23,0.55)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.meta}</div>
              </div>
              {isActive && (
                <div key={active} style={{ animation: 'obSlideIn .35s ease-out', padding: '4px 9px', borderRadius: 6, background: RZ.black, color: '#fff', font: `900 9px/1 ${RZ.fontDisplay}`, letterSpacing: '.08em', flexShrink: 0 }}>NEW</div>
              )}
            </div>
          );
        })}
        <div style={{
          marginTop: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 11,
          background: 'rgba(13,17,23,0.04)',
          border: '1px dashed rgba(13,17,23,0.14)',
          font: `700 10.5px/1 ${RZ.fontDisplay}`, color: 'rgba(13,17,23,0.6)', letterSpacing: '.02em',
        }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e8005a', animation: 'obPulse 1.2s ease-in-out infinite' }}/>
          </div>
          <span><b style={{ color: RZ.black }}>+12 more</b> drops unlocked after login</span>
          <Icon name="chevR" size={12} color="rgba(13,17,23,0.5)"/>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Page ??8-slide controller with swipe/back/next + skip
// ===================================================================
type Slide = {
  key: string;
  eyebrow: string;
  headline: React.ReactNode;
  sub: React.ReactNode;
  theme: 'light' | 'dark';
  Gfx: React.FC;
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopStep = searchParams.get('shop_step') === '1';
  const slides: Slide[] = [
    { key: 'commission', eyebrow: '01 · Commission',      headline: <>Earn <span style={{ color: RZ.cyan }}>Up To +5% Or More</span> On Every Sale</>, sub: <>Sellers pay Rezekii creators extra commission on every eligible product — <b style={{ color: '#fff' }}>a guaranteed minimum of +1%</b> on top of the TikTok open-plan rate, scaling up to +5% or more as you rank up.</>, theme: 'dark',  Gfx: OBCommission },
    { key: 'rank',       eyebrow: '02 · Rank Up',         headline: <>Jom, Verify, <span style={{ color: RZ.green }}>Start Earning.</span></>, sub: <>Outside the programme you&apos;re at 0%. Join Rezekii and verify to unlock <b style={{ color: RZ.black }}>+1%</b> and climb toward higher tiers under our MCN. Applies to selected eligible products — not every listing qualifies.</>, theme: 'light', Gfx: OBRank },
    { key: 'sample',     eyebrow: '03 · Sample Request',  headline: <>Samples Approved <span style={{ color: RZ.cyan }}>Within 24 Hours</span></>, sub: 'Meet the entry requirement and you\'re in — no 5-to-7-day waits and no silent rejections.', theme: 'dark',  Gfx: OBSample },
    { key: 'campaigns',  eyebrow: '04 · Income Mix',      headline: <>One App. <span style={{ color: RZ.green }}>Five</span> Ways To <span style={{ color: RZ.green }}>Earn Big.</span></>, sub: 'Affiliate, Paid Reviews, Gift Reviews, UGC Reviews, and Store or Event Visits — every income stream, stacked in one place.', theme: 'light', Gfx: OBCampaigns },
    { key: 'profile',    eyebrow: '05 · Sellers Find You', headline: <>Quality Sellers <span style={{ color: RZ.cyan }}>Invite You First</span></>, sub: 'Your Rezekii profile is a live pitch deck. Verified, trusted, platform-backed sellers reach out to creators who fit their brief — every day, straight to your inbox.', theme: 'dark',  Gfx: OBProfile },
    { key: 'collabs',    eyebrow: '06 · Collab Invites',   headline: <>Brand Deals <span style={{ color: '#8b5cf6' }}>In Your Inbox</span></>, sub: 'Across Tech, Wellness, Beauty, Home & F&B, and Fashion — launch partnerships and ambassador deals surfaced in-app.', theme: 'light', Gfx: OBCollabs },
    { key: 'mentor',     eyebrow: '07 · Creator Level',   headline: <>Learn From <span style={{ color: RZ.cyan }}>L6 To L8 Top Creators</span></>, sub: 'Our app is full of top-tier L6 to L8 creators — grab every chance to learn from them and skyrocket your account from Level 1 to Level 6. Certified TikTok Shop Partner Techwide Marketing guides every step.', theme: 'dark',  Gfx: OBMentor },
    { key: 'casestudy',  eyebrow: '08 · Latest Drops',    headline: <>Everything You Need, <span style={{ color: '#e8005a' }}>In One Feed</span></>, sub: 'Viral products, policy updates, winning content formats, and live-selling strategy — delivered as they happen. Login with TikTok to unlock.', theme: 'light', Gfx: OBCaseStudy },
  ];

  const [i, setI] = useState(() => shopStep ? slides.length - 1 : 0);
  const total = slides.length;
  const s = slides[i];
  const Gfx = s.Gfx;

  // If ?shop_step=1 arrives after mount (rare), jump to last slide
  useEffect(() => {
    if (shopStep) setI(slides.length - 1);
  }, [shopStep, slides.length]);

  // Touch swipe support
  const touchRef = useRef<{ startX: number; startY: number; locked: 'x' | 'y' | null } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, locked: null };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;
    if (touchRef.current.locked == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      touchRef.current.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.startX;
    if (touchRef.current.locked === 'x' && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchRef.current = null;
  };

  const goNext = () => {
    if (i === total - 1) {
      if (typeof window !== 'undefined') localStorage.setItem('rezekii_onboarded', 'true');
      window.location.href = '/api/auth/tiktok';
    } else {
      setI(i + 1);
    }
  };
  const goPrev = () => { if (i === 0) router.push('/splash'); else setI(i - 1); };
  const goSkip = () => {
    if (typeof window !== 'undefined') localStorage.setItem('rezekii_onboarded', 'true');
    window.location.href = '/api/auth/tiktok';
  };

  return (
    <div
      style={{ width: '100%', minHeight: '100dvh', position: 'relative', overflow: 'hidden', background: '#fff', fontFamily: RZ.fontUI }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        @keyframes obSlideFade { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes obStaggerUp  { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        .ob-anim > * { opacity: 0; animation: obStaggerUp .55s cubic-bezier(.2,.8,.2,1) forwards; }
        .ob-anim > *:nth-child(1) { animation-delay: .05s }
        .ob-anim > *:nth-child(2) { animation-delay: .18s }
        .ob-anim > *:nth-child(3) { animation-delay: .31s }
        .ob-anim > *:nth-child(4) { animation-delay: .44s }
        .ob-anim > *:nth-child(5) { animation-delay: .57s }
        .ob-anim > *:nth-child(6) { animation-delay: .70s }
      `}</style>
      <div key={s.key} style={{ position: 'absolute', inset: 0, animation: 'obSlideFade .5s cubic-bezier(.2,.8,.2,1)' }}>
        <Gfx/>
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 'max(360px, 52dvh)',
        background: s.theme === 'dark'
          ? 'linear-gradient(180deg, transparent 0%, rgba(13,17,23,0) 8%, rgba(13,17,23,0.55) 32%, rgba(13,17,23,0.93) 62%, rgba(13,17,23,0.98) 100%)'
          : 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0) 8%, rgba(255,255,255,0.72) 32%, rgba(255,255,255,0.96) 62%, rgba(255,255,255,1) 100%)',
        pointerEvents: 'none',
      }}/>
      <OBChrome
        key={'chrome-' + s.key}
        idx={i} total={total} theme={s.theme}
        onPrev={goPrev}
        onNext={goNext}
        onSkip={goSkip}
        shopStep={shopStep}
      >
        <OBText eyebrow={s.eyebrow} headline={s.headline} sub={s.sub} theme={s.theme}/>
      </OBChrome>
    </div>
  );
}
