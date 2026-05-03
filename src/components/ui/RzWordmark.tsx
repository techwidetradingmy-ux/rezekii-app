'use client';

import React from 'react';
import { RZ } from '@/lib/rz';

interface RzWordmarkProps {
  size?: number;
  color?: string;
  slogan?: string;
}

export default function RzWordmark({ size = 22, color = RZ.black, slogan }: RzWordmarkProps) {
  return (
    <div style={{ lineHeight: 1 }}>
      <div style={{ font: `800 ${size}px/1 ${RZ.fontDisplay}`, color, letterSpacing: '-0.01em' }}>
        Rezekii
      </div>
      {slogan && (
        <div style={{
          font: `700 ${Math.max(9, size * 0.4)}px/1.2 ${RZ.fontUI}`,
          color: color === RZ.white ? 'rgba(255,255,255,0.8)' : RZ.body,
          letterSpacing: '0.18em', marginTop: 4, textTransform: 'uppercase',
        }}>
          {slogan}
        </div>
      )}
    </div>
  );
}
