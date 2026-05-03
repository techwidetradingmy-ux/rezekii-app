'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

const tabs = [
  { id: 'home',        label: 'Home',        icon: 'home'     as const, href: '/home' },
  { id: 'marketplace', label: 'Marketplace', icon: 'bag'      as const, href: '/marketplace' },
  { id: 'campaign',    label: 'Campaign',    icon: 'cursor'   as const, href: '/campaign' },
  { id: 'earnings',    label: 'Earnings',    icon: 'wallet'   as const, href: '/earnings' },
  { id: 'profile',     label: 'Profile',     icon: 'user'     as const, href: '/profile' },
];

function getActiveId(pathname: string) {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/marketplace')) return 'marketplace';
  if (pathname.startsWith('/campaign'))    return 'campaign';
  if (pathname.startsWith('/earnings'))    return 'earnings';
  if (pathname.startsWith('/profile'))     return 'profile';
  return 'home';
}

interface Ripple { id: number; x: number; y: number; tabId: string }

export default function TabBar({ active }: { active?: string }) {
  const router   = useRouter();
  const pathname = usePathname();

  const activeId    = active ?? getActiveId(pathname);
  const activeIndex = tabs.findIndex(t => t.id === activeId);

  const [bouncingTab, setBouncingTab] = useState<string | null>(null);
  const [ripples,     setRipples]     = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  const handleTab = useCallback(
    (tab: typeof tabs[number], e: React.MouseEvent<HTMLButtonElement>) => {
      // Ripple — always fires
      const rect = e.currentTarget.getBoundingClientRect();
      const id = ++rippleIdRef.current;
      setRipples(prev => [
        ...prev,
        { id, x: e.clientX - rect.left, y: e.clientY - rect.top, tabId: tab.id },
      ]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);

      if (tab.id === activeId) return; // already active — ripple only, no nav

      // Bounce on destination icon
      setBouncingTab(tab.id);
      setTimeout(() => setBouncingTab(null), 500);

      router.push(tab.href);
    },
    [activeId, router],
  );

  // Pill & dot slide: each column is 20% of the inner container
  const pillLeft = `${activeIndex * 20}%`;

  return (
    /*
     * Outer strip: position:fixed, full viewport width, blurred glass surface.
     * Inner column: max-w-[390px] centred — matches the MobileFrame content column.
     * On real phones (< 390 px) the inner column fills 100 % of the width.
     */
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(216,240,228,0.85)',
      boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 -6px 28px rgba(0,0,0,0.055)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 390,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: 6,
        /* Safe-area padding for notched phones */
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        minHeight: 58,
      }}>

        {/* ── Dot indicator — slides above the active pill ── */}
        <div aria-hidden style={{
          position: 'absolute',
          top: 2,
          left: pillLeft,
          width: '20%',
          display: 'flex',
          justifyContent: 'center',
          transition: 'left 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 4, height: 4, borderRadius: '50%',
            background: RZ.green,
            boxShadow: '0 0 6px rgba(0,192,115,0.7)',
          }}/>
        </div>

        {/* ── Sliding green pill ── */}
        <div aria-hidden style={{
          position: 'absolute',
          top: 6,
          left: pillLeft,
          width: '20%',
          display: 'flex',
          justifyContent: 'center',
          transition: 'left 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 54, height: 34, borderRadius: 12,
            background: 'rgba(0,192,115,0.13)',
          }}/>
        </div>

        {/* ── Tab buttons ── */}
        {tabs.map(tab => {
          const isActive   = tab.id === activeId;
          const isBouncing = bouncingTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={e => handleTab(tab, e)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="rz-tab-btn"
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '4px 0 2px',
                position: 'relative',
                overflow: 'hidden',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                outline: 'none',
              }}
            >
              {/* Ripple circles */}
              {ripples.filter(r => r.tabId === tab.id).map(rp => (
                <span key={rp.id} aria-hidden style={{
                  position: 'absolute',
                  left: rp.x, top: rp.y,
                  width: 70, height: 70,
                  marginLeft: -35, marginTop: -35,
                  borderRadius: '50%',
                  background: isActive
                    ? 'rgba(0,192,115,0.22)'
                    : 'rgba(154,165,177,0.22)',
                  pointerEvents: 'none',
                  animation: 'tabRipple 550ms ease-out forwards',
                }}/>
              ))}

              {/* Icon — bounces on activation, scales on press */}
              <div
                className="rz-tab-icon"
                style={{
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: isBouncing
                    ? 'tabBounce 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
                    : 'none',
                }}
              >
                <Icon
                  name={tab.icon}
                  size={26}
                  color={isActive && tab.icon === 'home' ? 'none' : isActive ? RZ.green : '#9AA5B1'}
                  fill={isActive && tab.icon === 'home' ? RZ.green : 'none'}
                  strokeWidth={isActive && tab.icon === 'home' ? 0 : 2}
                />
              </div>

              {/* Label — weight shifts active↔inactive */}
              <span style={{
                fontSize: 10,
                lineHeight: 1,
                fontFamily: RZ.fontUI,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.01em',
                color: isActive ? RZ.green : '#9AA5B1',
                transition: 'color 200ms',
                whiteSpace: 'nowrap',
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}

      </div>
    </div>
  );
}
