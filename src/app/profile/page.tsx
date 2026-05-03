'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';
import AppShell from '@/components/layout/AppShell';
import TikTokGlyph from '@/components/ui/TikTokGlyph';

type RowIcon =
  | 'wallet' | 'pkg' | 'heart' | 'trend' | 'play' | 'bell' | 'share';

interface ProfileRowData {
  icon: RowIcon;
  title: string;
  sub?: string;
  href?: string;
}

interface SectionGroup {
  title: string;
  rows: ProfileRowData[];
}

const sections: SectionGroup[] = [
  {
    title: 'Account',
    rows: [
      { icon: 'wallet', title: 'Wallet & payouts', sub: 'Maybank **4291', href: '/wallet' },
      { icon: 'pkg', title: 'My applications', sub: '5 active . 2 pending' },
      { icon: 'heart', title: 'Favourites', sub: '12 saved products' },
    ],
  },
  {
    title: 'Performance',
    rows: [
      { icon: 'trend', title: 'Sales insights', sub: '7-day . 30-day . all time' },
      { icon: 'play', title: 'My TikTok posts', sub: '18 videos . 2.1M views' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { icon: 'bell', title: 'Help centre', href: '/notifications' },
      { icon: 'share', title: 'Invite a friend', sub: 'Earn RM 20' },
    ],
  },
];

function MiniStat({ n, l }: { n: string; l: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ font: `800 18px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>{n}</div>
      <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 4 }}>{l}</div>
    </div>
  );
}

function ProfileRow({ icon, title, sub, onClick }: { icon: RowIcon; title: string; sub?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 12,
        marginBottom: 8, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: RZ.canvas, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={18} color={RZ.black} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `700 13.5px/1.1 ${RZ.fontUI}`, color: RZ.black, letterSpacing: '-0.005em' }}>{title}</div>
        {sub && <div style={{ font: `500 11.5px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      <Icon name="chevR" size={16} color={RZ.muted} />
    </div>
  );
}

function StreakCard({ days = 12 }: { days?: number }) {
  const milestones = [3, 7, 14, 30, 60, 100, 365];
  const nextMs = milestones.find(m => m > days) ?? milestones[milestones.length - 1];
  const prevMs = [...milestones].reverse().find(m => m <= days) ?? 0;
  const msProgress = Math.min(1, Math.max(0, (days - prevMs) / (nextMs - prevMs)));

  const postedToday = false;

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const expiresStr = useMemo(() => {
    if (!now) return '--';
    const eod = new Date(now); eod.setHours(23, 59, 59, 999);
    const ms = Math.max(0, eod.getTime() - now.getTime());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [now]);

  const timeLeftPct = useMemo(() => {
    if (!now) return 1;
    const eod = new Date(now); eod.setHours(23, 59, 59, 999);
    const sod = new Date(now); sod.setHours(0, 0, 0, 0);
    const dayMs = eod.getTime() - sod.getTime();
    const leftMs = eod.getTime() - now.getTime();
    return Math.max(0, Math.min(1, leftMs / dayMs));
  }, [now]);

  const [bouncing, setBouncing] = useState(false);
  const onBounceMascot = () => {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 520);
  };

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #0d1117 0%, #2b0f24 50%, #3a0a1f 100%)',
      borderRadius: 18, padding: 16, marginBottom: 18, overflow: 'hidden',
      boxShadow: '0 14px 28px rgba(232,0,90,0.22), 0 2px 6px rgba(13,17,23,0.18)',
    }}>
      <div style={{ position: 'absolute', top: -50, right: -50, width: 190, height: 190, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.38), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -50, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,0,90,0.42), transparent 70%)', pointerEvents: 'none' }} />

      {/* Share button */}
      <button
        style={{
          position: 'absolute', top: 14, right: 14, zIndex: 10,
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}
        aria-label="Share streak"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </button>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14, alignItems: 'center' }}>
        <button
          onClick={onBounceMascot}
          aria-label="Tap Rezi"
          style={{
            position: 'relative', flexShrink: 0,
            width: 88, height: 88,
            border: 0, padding: 0, background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            animation: bouncing ? 'stkBounce .52s cubic-bezier(.3,1.4,.4,1)' : 'none',
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
            <defs>
              <radialGradient id="reziFur" cx="50%" cy="40%">
                <stop offset="0%" stopColor="#ffb347" />
                <stop offset="100%" stopColor="#ff8a1f" />
              </radialGradient>
              <radialGradient id="reziBelly" cx="50%" cy="60%">
                <stop offset="0%" stopColor="#fff6d8" />
                <stop offset="100%" stopColor="#ffd89a" />
              </radialGradient>
            </defs>
            <ellipse cx="50" cy="65" rx="24" ry="22" fill="url(#reziFur)" />
            <ellipse cx="50" cy="68" rx="16" ry="14" fill="url(#reziBelly)" />
            <circle cx="50" cy="38" r="20" fill="url(#reziFur)" />
            <ellipse cx="38" cy="24" rx="7" ry="9" fill="#ff8a1f" />
            <ellipse cx="38" cy="25" rx="4" ry="5" fill="#ffd89a" />
            <ellipse cx="62" cy="24" rx="7" ry="9" fill="#ff8a1f" />
            <ellipse cx="62" cy="25" rx="4" ry="5" fill="#ffd89a" />
            <path d="M 42 32 Q 38 34 36 36" stroke="#e8005a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 58 32 Q 62 34 64 36" stroke="#e8005a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 44 28 Q 42 30 40 31" stroke="#e8005a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 56 28 Q 58 30 60 31" stroke="#e8005a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="40" cy="42" r="8" fill="#ffd89a" />
            <circle cx="60" cy="42" r="8" fill="#ffd89a" />
            <ellipse cx="43" cy="40" rx="3.5" ry="4.5" fill="#1a0410" />
            <circle cx="44" cy="39" r="1.2" fill="#fff" />
            <ellipse cx="57" cy="40" rx="3.5" ry="4.5" fill="#1a0410" />
            <circle cx="58" cy="39" r="1.2" fill="#fff" />
            <ellipse cx="50" cy="46" rx="2.5" ry="2" fill="#1a0410" />
            <path d="M 46 48 Q 50 51 54 48" stroke="#e8005a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M 35 50 Q 35 55 40 58 L 50 54 L 60 58 Q 65 55 65 50 L 62 48 Q 50 52 38 48 Z" fill="#00c073" />
            <path d="M 62 48 L 68 52 L 66 58 L 62 54 Z" fill="#00c073" />
            <circle cx="56" cy="52" r="1.5" fill="#25f4ee" opacity="0.6" />
            <circle cx="50" cy="54" r="1.2" fill="#25f4ee" opacity="0.6" />
            <ellipse cx="32" cy="64" rx="6" ry="8" fill="url(#reziFur)" />
            <ellipse cx="68" cy="64" rx="6" ry="8" fill="url(#reziFur)" />
            <circle cx="32" cy="70" r="4" fill="#ffd89a" />
            <circle cx="68" cy="70" r="4" fill="#ffd89a" />
            <path d="M 28 75 Q 18 78 16 85" stroke="#ff8a1f" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M 16 85 Q 14 88 18 90" fill="#ff8a1f" />
            <circle cx="17" cy="87" r="2.5" fill="#e8005a" />
          </svg>

          <div style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 32, height: 32, borderRadius: 999, padding: '0 6px',
            background: 'linear-gradient(135deg, #f5a623, #e8005a)',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(232,0,90,0.5)',
          }}>
            <span style={{ font: `900 16px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{days}</span>
          </div>
        </button>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ font: `800 9.5px/1 ${RZ.fontUI}`, color: '#f5a623', letterSpacing: '.12em', textTransform: 'uppercase' }}>Posting Streak</span>
          </div>
          <div style={{ color: '#fff', font: `800 18px/1.1 ${RZ.fontDisplay}`, letterSpacing: '-0.01em' }}>{days} Days Strong</div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: `600 8.5px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.55)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5 }}>
              <span>Next Badge . {nextMs}d</span>
              <span>{nextMs - days}d To Go</span>
            </div>
            <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{
                width: `${msProgress * 100}%`, height: '100%',
                background: 'linear-gradient(90deg,#f5a623,#e8005a)',
                boxShadow: '0 0 10px rgba(245,166,35,0.55)',
                borderRadius: 3,
                transition: 'width .6s cubic-bezier(.2,.8,.2,1)',
              }} />
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '40%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'stkShimmer 2.4s ease-in-out infinite',
                mixBlendMode: 'overlay',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 999,
              background: 'rgba(37,244,238,0.16)',
              border: '1px solid rgba(37,244,238,0.4)',
              font: `800 9.5px/1 ${RZ.fontUI}`, color: '#7df1ec',
              letterSpacing: '.04em',
            }}>
              Best . 18d
            </div>
          </div>
        </div>
      </div>

      {!postedToday && (
        <div style={{ position: 'relative', zIndex: 1, marginTop: 14, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.14)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ font: `700 9px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.55)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Time Left To Post Today</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ font: `800 11px/1 ${RZ.fontDisplay}`, color: '#ffb3c9', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{expiresStr}</span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(232,0,90,0.18)', overflow: 'hidden', border: '1px solid rgba(232,0,90,0.4)' }}>
            <div style={{
              width: `${timeLeftPct * 100}%`, height: '100%',
              background: timeLeftPct > 0.3
                ? 'linear-gradient(90deg, #f5a623, #ff6b1a)'
                : 'linear-gradient(90deg, #e8005a, #c10050)',
              boxShadow: timeLeftPct < 0.3 ? '0 0 12px rgba(232,0,90,0.8)' : '0 0 8px rgba(245,166,35,0.6)',
              borderRadius: 3,
              transition: 'width 1s linear, background .3s',
            }} />
            <div style={{
              position: 'absolute', top: 0, bottom: 0, width: '30%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'stkShimmer 1.8s ease-in-out infinite',
              mixBlendMode: 'overlay',
            }} />
          </div>
          <div style={{ font: `500 9.5px/1.35 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.5)', marginTop: 5, textAlign: 'center' }}>
            Post a TikTok before midnight to keep your streak alive!
          </div>
        </div>
      )}
    </div>
  );
}

function handleLogout(router: ReturnType<typeof useRouter>) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rezekii_onboarded');
  }
  document.cookie = 'tiktok_session=; path=/; max-age=0';
  document.cookie = 'tiktok_oauth_state=; path=/; max-age=0';
  router.replace('/splash');
}

export default function ProfilePage() {
  const router = useRouter();
  const [verifiedOpen, setVerifiedOpen] = useState(false);

  // Live TikTok profile from cookie set during OAuth
  const [displayName, setDisplayName]   = useState('');
  const [username, setUsername]         = useState('');
  const [followerCount, setFollowerCount] = useState(0);
  const [avatarUrl, setAvatarUrl]       = useState('');
  const [tier, setTier]                 = useState('');

  useEffect(() => {
    const raw = document.cookie.split('; ').find(r => r.startsWith('tiktok_user='))?.split('=').slice(1).join('=');
    if (!raw) return;
    try {
      const u = JSON.parse(decodeURIComponent(raw));
      if (u.display_name)   setDisplayName(u.display_name);
      if (u.username)       setUsername(u.username);
      if (u.follower_count) setFollowerCount(u.follower_count);
      if (u.avatar_url)     setAvatarUrl(u.avatar_url);
      if (u.tier)           setTier(u.tier);
    } catch { /* keep defaults */ }
  }, []);

  const handleRow = (href?: string) => {
    if (href) router.push(href);
  };

  return (
    <AppShell>
      <div style={{ background: RZ.canvas, position: 'relative', minHeight: '100%' }}>
        {/* Sticky compact top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${RZ.border}`,
          padding: '14px 16px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ font: `800 16px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>Profile</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ width: 30, height: 30, borderRadius: 8, background: RZ.canvas, border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="More options">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12a2 2 0 104 0 2 2 0 00-4 0zM10 12a2 2 0 104 0 2 2 0 00-4 0zM16 12a2 2 0 104 0 2 2 0 00-4 0z" />
              </svg>
            </button>
            <button onClick={() => router.push('/notifications')} style={{ width: 30, height: 30, borderRadius: 8, background: RZ.canvas, border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Notifications">
              <Icon name="bell" size={14} color={RZ.black} />
            </button>
          </div>
        </div>

        {/* Hero green band */}
        <div style={{ background: `linear-gradient(135deg, ${RZ.green} 0%, #00a361 60%, #008a51 100%)`, padding: '0 20px', position: 'relative', overflow: 'hidden', height: 64 }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,244,238,0.18), transparent 70%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.25, backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
        </div>

        {/* Profile card */}
        <div style={{ margin: '-28px 16px 0', background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 18, padding: 18, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {/* Avatar with edit camera badge */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 68, height: 68, borderRadius: 999, overflow: 'hidden', border: `3px solid ${RZ.white}`, boxShadow: '0 4px 14px rgba(232,0,90,0.25)' }}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={displayName} width={68} height={68} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <svg viewBox="0 0 68 68" width="100%" height="100%" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="avBg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#ffb27a" />
                        <stop offset="1" stopColor="#e8005a" />
                      </linearGradient>
                    </defs>
                    <rect width="68" height="68" fill="url(#avBg)" />
                    <path d="M6 58c2-22 12-36 28-36s26 14 28 36z" fill="#2b0a1a" />
                    <ellipse cx="34" cy="36" rx="13" ry="15" fill="#f4c9a1" />
                    <path d="M16 42c0-14 8-24 18-24s18 10 18 24c-4-4-10-6-18-6s-14 2-18 6z" fill="#3a0f24" />
                    <ellipse cx="29.5" cy="36" rx="1.3" ry="1.8" fill="#1a0410" />
                    <ellipse cx="38.5" cy="36" rx="1.3" ry="1.8" fill="#1a0410" />
                    <path d="M30 42q4 3 8 0" stroke="#8a3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                    <circle cx="27" cy="40" r="1.5" fill="#e8005a" opacity=".35" />
                    <circle cx="41" cy="40" r="1.5" fill="#e8005a" opacity=".35" />
                  </svg>
                )}
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: RZ.green, border: `2px solid ${RZ.white}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                <div style={{ font: `800 18px/1.1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>{displayName || 'Creator'}</div>
                <button
                  onClick={() => setVerifiedOpen(o => !o)}
                  aria-label="Fully verified creator"
                  style={{
                    width: 20, height: 20, borderRadius: '50%', border: 0, padding: 0, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #25f4ee 0%, #00c073 100%)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 3px 8px rgba(0,192,115,0.4)',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 1.5l2.3 1.6 2.8-.3 1.3 2.5 2.5 1.3-.3 2.8L22.5 12l-1.6 2.3.3 2.8-2.5 1.3-1.3 2.5-2.8-.3L12 22.5l-2.3-1.6-2.8.3-1.3-2.5-2.5-1.3.3-2.8L1.5 12l1.6-2.3-.3-2.8 2.5-1.3 1.3-2.5 2.8.3L12 1.5z"
                      fill="#fff"
                    />
                    <path
                      d="M8.5 12.3l2.4 2.4 4.6-4.9"
                      stroke="#00a361" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {verifiedOpen && (
                  <div
                    role="dialog"
                    style={{
                      position: 'absolute', top: 26, left: 0, zIndex: 20,
                      width: 244, padding: 14, borderRadius: 14,
                      background: RZ.white,
                      border: `1.5px solid ${RZ.border}`,
                      boxShadow: '0 20px 40px rgba(13,17,23,0.18), 0 4px 10px rgba(13,17,23,0.08)',
                      animation: 'profPopIn .18s ease-out',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #25f4ee 0%, #00c073 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </div>
                      <div style={{ font: `800 13px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>Fully verified creator</div>
                    </div>
                    {[
                      { label: 'IC / KYC identity' },
                      { label: 'Bank account & address' },
                      { label: 'TikTok account connected' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i === 0 ? 'none' : `1px dashed ${RZ.border}` }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: RZ.greenTint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={RZ.greenDark} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        </div>
                        <div style={{ flex: 1, font: `600 12px/1.25 ${RZ.fontUI}`, color: RZ.black }}>{r.label}</div>
                      </div>
                    ))}
                    <div style={{ font: `500 10.5px/1.4 ${RZ.fontUI}`, color: RZ.muted, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${RZ.border}` }}>
                      Verified creators get priority campaign invites and faster payouts.
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <TikTokGlyph size={14} />
                <span style={{ font: `500 12px/1 ${RZ.fontUI}`, color: RZ.body }}>
                  {username ? `@${username}` : '@tiktok'}
                  {followerCount > 0 ? ` . ${followerCount >= 1000 ? `${(followerCount/1000).toFixed(1)}K` : followerCount}` : ''}
                </span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '4px 9px', borderRadius: 999, background: RZ.greenTint, font: `700 10px/1 ${RZ.fontUI}`, color: RZ.greenDark, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                <Icon name="sparkles" size={10} color={RZ.greenDark} /> {tier || 'Creator'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${RZ.border}` }}>
            <MiniStat n="RM 1,245" l="This month" />
            <MiniStat n="18" l="Samples" />
            <MiniStat n="4.9*" l="Creator score" />
          </div>
        </div>

        {/* Streak + sections */}
        <div style={{ padding: '20px 16px 16px' }}>
          <StreakCard days={12} />

          {sections.map((section, sIdx) => (
            <React.Fragment key={section.title}>
              <div style={{
                font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted,
                textTransform: 'uppercase', letterSpacing: '.08em',
                marginBottom: 8, paddingLeft: 4,
                marginTop: sIdx === 0 ? 0 : 20,
              }}>
                {section.title}
              </div>
              {section.rows.map(row => (
                <ProfileRow
                  key={row.title}
                  icon={row.icon}
                  title={row.title}
                  sub={row.sub}
                  onClick={() => handleRow(row.href)}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Sign out */}
          <div style={{ marginTop: 28 }}>
            <button
              onClick={() => handleLogout(router)}
              style={{
                width: '100%', height: 50, borderRadius: 12, border: `1.5px solid #ffd6d6`,
                background: '#fff8f8', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                font: `700 14px/1 ${RZ.fontUI}`, color: '#e8005a',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8005a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Sign out
            </button>
            <div style={{ textAlign: 'center', font: `500 11px/1.4 ${RZ.fontUI}`, color: RZ.muted, marginTop: 8 }}>
              You&apos;ll need to reconnect your TikTok account after signing back in.
            </div>
          </div>
          <div style={{ height: 24 }}/>
        </div>
      </div>
    </AppShell>
  );
}
