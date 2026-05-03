'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';
import RzInput from '@/components/ui/RzInput';

const recents = ['serum', 'nasi lemak paste', 'earbuds', 'tote bag'];

const trending = [
  { q: 'ceramide serum', tag: '+412%' },
  { q: 'matcha snack',   tag: '+280%' },
  { q: 'ANC earbuds',    tag: '+210%' },
  { q: 'linen shirt',    tag: '+180%' },
  { q: 'clay mask',      tag: '+140%' },
];

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState('ceramide');

  return (
    <div style={{ flex: 1, background: RZ.white, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '56px 16px 14px', borderBottom: `1px solid ${RZ.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${RZ.border}`, background: RZ.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Icon name="chevL" size={18} color={RZ.black} />
        </button>
        <div style={{ flex: 1 }}>
          <RzInput
            placeholder="Search samples or brands"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            leadingIcon={<Icon name="search" size={18} />}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          Recent
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
          {recents.map(r => (
            <span
              key={r}
              onClick={() => setQ(r)}
              style={{ padding: '8px 12px', borderRadius: 999, background: RZ.canvas, border: `1.5px solid ${RZ.border}`, font: `600 12px/1 ${RZ.fontUI}`, color: RZ.body, cursor: 'pointer' }}
            >
              {r}
            </span>
          ))}
        </div>

        <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          Trending on TikTok
        </div>
        {trending.map((t, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px dashed ${RZ.border}` }}
          >
            <div style={{ width: 28, textAlign: 'center', font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.muted, fontVariantNumeric: 'tabular-nums' }}>
              #{i + 1}
            </div>
            <div style={{ flex: 1, font: `600 13.5px/1 ${RZ.fontUI}`, color: RZ.black, letterSpacing: '-0.005em' }}>{t.q}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: RZ.greenTint, font: `700 11px/1 ${RZ.fontUI}`, color: RZ.greenDark }}>
              <Icon name="trend" size={10} color={RZ.greenDark} /> {t.tag}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
