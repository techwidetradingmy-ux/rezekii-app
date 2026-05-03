'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';
import { creatorProfile } from '@/lib/mock-data';

type RowIcon = 'user' | 'bank' | 'bellOutline' | 'shield' | 'help' | 'signOut';

interface Row {
  icon: RowIcon;
  label: string;
  sub?: string;
  tone?: 'default' | 'danger';
  iconBg: string;
  iconFg: string;
}

interface Section {
  title: string;
  rows: Row[];
}

const sections: Section[] = [
  {
    title: 'Account',
    rows: [
      { icon: 'user',        label: 'Account',                 sub: 'Profile, handle, avatar',                 iconBg: RZ.greenTint,           iconFg: RZ.greenDark },
      { icon: 'bank',        label: 'Bank account',            sub: 'Maybank ** 4291 . default',               iconBg: 'rgba(245,166,35,0.14)', iconFg: '#b06a00' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { icon: 'bellOutline', label: 'Notification preferences', sub: 'Push, email, campaign alerts',           iconBg: 'rgba(37,244,238,0.16)', iconFg: RZ.cyanText },
      { icon: 'shield',      label: 'Privacy',                  sub: 'Data, blocked accounts',                 iconBg: 'rgba(123,63,242,0.12)', iconFg: '#7b3ff2' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { icon: 'help',        label: 'Help & support',          sub: 'FAQs, contact creator success',           iconBg: 'rgba(13,17,23,0.06)',  iconFg: RZ.black },
      { icon: 'signOut',     label: 'Sign out',                tone: 'danger',                                  iconBg: 'rgba(232,0,90,0.09)',   iconFg: '#e8005a' },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div style={{ flex: 1, background: RZ.canvas, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px', background: RZ.white, borderBottom: `1px solid ${RZ.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${RZ.border}`, background: RZ.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="chevL" size={18} color={RZ.black} />
          </button>
          <div style={{ font: `800 22px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em', flex: 1 }}>Settings</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 100px' }}>
        {/* Profile summary */}
        <div style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: RZ.warm, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 18px/1 ${RZ.fontDisplay}`, color: RZ.white }}>
            {creatorProfile.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `800 14px/1.2 ${RZ.fontUI}`, color: RZ.black, letterSpacing: '-0.005em' }}>{creatorProfile.name}</div>
            <div style={{ font: `500 11.5px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 4 }}>{creatorProfile.handle} . {creatorProfile.tier} creator</div>
          </div>
          <Icon name="chevR" size={16} color={RZ.muted} />
        </div>

        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 18 }}>
            <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 4px 8px' }}>
              {section.title}
            </div>
            <div style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 14, overflow: 'hidden' }}>
              {section.rows.map((row, i) => (
                <button
                  key={row.label}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: RZ.white, border: 0,
                    borderBottom: i < section.rows.length - 1 ? `1px solid ${RZ.border}` : 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: row.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={row.icon} size={18} color={row.iconFg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `700 13.5px/1.2 ${RZ.fontUI}`, color: row.tone === 'danger' ? '#e8005a' : RZ.black, letterSpacing: '-0.005em' }}>
                      {row.label}
                    </div>
                    {row.sub && (
                      <div style={{ font: `500 11.5px/1.2 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>{row.sub}</div>
                    )}
                  </div>
                  <Icon name="chevR" size={14} color={RZ.muted} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ font: `500 11px/1.4 ${RZ.fontUI}`, color: RZ.muted, textAlign: 'center', marginTop: 8 }}>
          Rezekii v1.0 . Techwide Marketing Sdn Bhd
        </div>
      </div>
    </div>
  );
}
