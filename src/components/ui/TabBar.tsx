'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

const tabs = [
  { id: 'home',        label: 'Home',        icon: 'home'     as const, href: '/' },
  { id: 'marketplace', label: 'Marketplace', icon: 'bag'      as const, href: '/marketplace' },
  { id: 'campaign',    label: 'Campaign',    icon: 'sparkles' as const, href: '/campaign' },
  { id: 'earnings',    label: 'Earnings',    icon: 'wallet'   as const, href: '/earnings' },
  { id: 'profile',     label: 'Profile',     icon: 'user'     as const, href: '/profile' },
];

export default function TabBar({ active }: { active?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const activeId = active ?? (
    pathname === '/' ? 'home' :
    pathname.startsWith('/marketplace') ? 'marketplace' :
    pathname.startsWith('/campaign') ? 'campaign' :
    pathname.startsWith('/earnings') ? 'earnings' :
    pathname.startsWith('/profile') ? 'profile' : 'home'
  );

  return (
    <div style={{
      background: RZ.white,
      borderTop: `1px solid ${RZ.border}`,
      height: 83,
      display: 'flex',
      alignItems: 'flex-start',
      paddingTop: 6,
      boxShadow: '0 -1px 0 rgba(0,0,0,0.04)',
      flexShrink: 0,
    }}>
      {tabs.map(t => {
        const isActive = activeId === t.id;
        return (
          <button key={t.id} onClick={() => router.push(t.href)} style={{
            flex: 1, background: 'transparent', border: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '6px 0',
            color: isActive ? RZ.green : RZ.muted,
            font: `600 10px/1 ${RZ.fontUI}`,
            letterSpacing: '0.01em',
            transition: 'color 0.15s',
          }}>
            <Icon
              name={t.icon}
              size={24}
              color={isActive ? RZ.green : RZ.muted}
              fill={isActive && t.icon === 'home' ? RZ.green : 'none'}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span style={{ color: isActive ? RZ.green : RZ.muted }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
