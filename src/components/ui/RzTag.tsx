'use client';

import React from 'react';
import { RZ } from '@/lib/rz';

type Tone = 'outline' | 'green' | 'cyan' | 'dark' | 'warm';

interface RzTagProps {
  children: React.ReactNode;
  tone?: Tone;
  style?: React.CSSProperties;
}

const tones: Record<Tone, React.CSSProperties> = {
  outline: { background: RZ.white,        color: RZ.body,     border: `1.5px solid ${RZ.border}` },
  green:   { background: RZ.greenTint,    color: RZ.greenDark, border: '0' },
  cyan:    { background: 'rgba(37,244,238,0.09)', color: RZ.cyanText, border: '0' },
  dark:    { background: RZ.black,        color: RZ.white,     border: '0' },
  warm:    { background: RZ.warm,         color: RZ.white,     border: '0' },
};

export default function RzTag({ children, tone = 'outline', style }: RzTagProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '5px 11px', borderRadius: 999,
      font: `700 11px/1 ${RZ.fontUI}`,
      letterSpacing: '0.02em', textTransform: 'uppercase',
      ...tones[tone],
      ...style,
    }}>
      {children}
    </span>
  );
}
