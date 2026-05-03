'use client';

import React from 'react';

// Six category-specific SVG product illustrations on gradient backgrounds.
// Order matches design system seeds: 0=Beauty serum, 1=Food jar, 2=Tech earbuds,
// 3=Fashion batik tote, 4=Home mug, 5=Beauty lip tint.
const items = [
  {
    bg: ['#ffe9b5', '#ffd0e0'],
    art: (
      <g>
        <rect x="40" y="32" width="28" height="48" rx="5" fill="#d97a3c" stroke="#8a3d15" strokeWidth="1.5"/>
        <rect x="42" y="34" width="24" height="20" rx="3" fill="#f5a765" opacity="0.55"/>
        <rect x="47" y="22" width="14" height="12" rx="2" fill="#3a2418"/>
        <rect x="50" y="10" width="8" height="14" rx="3" fill="#f5c7ae"/>
        <rect x="44" y="56" width="20" height="14" rx="2" fill="#fff" opacity="0.85"/>
        <rect x="47" y="60" width="14" height="1.5" fill="#8a3d15"/>
        <rect x="48" y="63" width="12" height="1" fill="#8a3d15" opacity="0.5"/>
        <rect x="49" y="65.5" width="10" height="1" fill="#8a3d15" opacity="0.5"/>
      </g>
    ),
  },
  {
    bg: ['#d8f0e4', '#b5e2cd'],
    art: (
      <g>
        <rect x="36" y="30" width="36" height="52" rx="5" fill="#fff" stroke="#2a5f3e" strokeWidth="1.5"/>
        <rect x="38" y="44" width="32" height="36" rx="4" fill="#c0392b"/>
        <circle cx="48" cy="55" r="2" fill="#7d2820"/>
        <circle cx="58" cy="60" r="1.6" fill="#7d2820"/>
        <circle cx="52" cy="68" r="1.8" fill="#7d2820"/>
        <circle cx="62" cy="72" r="1.4" fill="#7d2820"/>
        <rect x="34" y="20" width="40" height="14" rx="3" fill="#2a5f3e"/>
        <rect x="34" y="28" width="40" height="3" fill="#1a3d28"/>
        <rect x="40" y="50" width="28" height="12" rx="1.5" fill="#fff" opacity="0.95"/>
        <rect x="43" y="54" width="22" height="1.5" fill="#2a5f3e"/>
        <rect x="45" y="57.5" width="18" height="1" fill="#2a5f3e" opacity="0.55"/>
      </g>
    ),
  },
  {
    bg: ['#e7eefc', '#cfe0ff'],
    art: (
      <g>
        <rect x="28" y="40" width="54" height="34" rx="14" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5"/>
        <path d="M28 56 Q55 50 82 56" stroke="#1e3a8a" strokeWidth="1" fill="none" opacity="0.35"/>
        <circle cx="55" cy="70" r="1.2" fill="#22c55e"/>
        <circle cx="38" cy="26" r="9" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5"/>
        <circle cx="38" cy="26" r="4" fill="#1e3a8a" opacity="0.15"/>
        <rect x="35" y="30" width="6" height="10" rx="3" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5"/>
        <circle cx="72" cy="26" r="9" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5"/>
        <circle cx="72" cy="26" r="4" fill="#1e3a8a" opacity="0.15"/>
        <rect x="69" y="30" width="6" height="10" rx="3" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5"/>
      </g>
    ),
  },
  {
    bg: ['#fff2cc', '#ffe5a0'],
    art: (
      <g>
        <path d="M42 28 C42 16 58 16 58 28" stroke="#6b3410" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M40 28 C40 14 60 14 60 28" stroke="#6b3410" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M30 28 L70 28 L74 82 L26 82 Z" fill="#c2410c" stroke="#6b3410" strokeWidth="1.5"/>
        <circle cx="40" cy="45" r="3.5" fill="#fef3c7"/>
        <circle cx="40" cy="45" r="1.5" fill="#c2410c"/>
        <circle cx="58" cy="52" r="3.5" fill="#fef3c7"/>
        <circle cx="58" cy="52" r="1.5" fill="#c2410c"/>
        <circle cx="46" cy="62" r="3" fill="#fef3c7"/>
        <circle cx="46" cy="62" r="1.2" fill="#c2410c"/>
        <circle cx="62" cy="70" r="2.5" fill="#fef3c7"/>
        {[[35,55],[50,48],[65,60],[42,72],[55,75]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="1" fill="#fef3c7"/>
        ))}
      </g>
    ),
  },
  {
    bg: ['#fde2e4', '#fad0c4'],
    art: (
      <g>
        <path d="M44 16 C44 12 46 12 46 8" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45"/>
        <path d="M54 18 C54 14 56 14 56 10" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45"/>
        <path d="M64 16 C64 12 66 12 66 8" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45"/>
        <path d="M30 30 L30 74 Q30 80 36 80 L64 80 Q70 80 70 74 L70 30 Z" fill="#fff" stroke="#7c2d12" strokeWidth="1.5"/>
        <ellipse cx="50" cy="30" rx="20" ry="3.5" fill="#6b2b0e"/>
        <ellipse cx="50" cy="30" rx="20" ry="3.5" fill="none" stroke="#7c2d12" strokeWidth="1.5"/>
        <path d="M70 40 Q84 42 84 54 Q84 66 70 68" stroke="#7c2d12" strokeWidth="3" fill="none"/>
        <rect x="30" y="56" width="40" height="8" fill="#7c2d12" opacity="0.18"/>
        <circle cx="40" cy="60" r="1.5" fill="#7c2d12" opacity="0.5"/>
        <circle cx="50" cy="60" r="1.5" fill="#7c2d12" opacity="0.5"/>
        <circle cx="60" cy="60" r="1.5" fill="#7c2d12" opacity="0.5"/>
      </g>
    ),
  },
  {
    bg: ['#d1f4ff', '#a8e6ff'],
    art: (
      <g>
        <rect x="42" y="36" width="16" height="44" rx="3" fill="#ec4899" stroke="#831843" strokeWidth="1.5"/>
        <rect x="40" y="78" width="20" height="4" rx="1.5" fill="#831843"/>
        <path d="M44 36 L44 20 L56 20 L56 36 Z" fill="#fef3c7" stroke="#831843" strokeWidth="1.5"/>
        <path d="M46 20 L50 10 L54 20 Z" fill="#ec4899" stroke="#831843" strokeWidth="1.2"/>
        <rect x="45" y="40" width="3" height="32" rx="1.5" fill="#fff" opacity="0.45"/>
        <rect x="43" y="54" width="14" height="10" rx="1" fill="#fff" opacity="0.9"/>
        <rect x="45" y="58" width="10" height="1.2" fill="#831843"/>
        <rect x="46" y="60.5" width="8" height="0.8" fill="#831843" opacity="0.6"/>
      </g>
    ),
  },
];

interface ProductThumbProps {
  seed?: number;
  style?: React.CSSProperties;
}

export default function ProductThumb({ seed = 0, style }: ProductThumbProps) {
  const item = items[seed % items.length];
  const [a, b] = item.bg;
  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(135deg, ${a}, ${b})`,
      borderRadius: 12, overflow: 'hidden', ...style,
    }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
      }}>
        <ellipse cx="50" cy="88" rx="34" ry="6" fill="rgba(0,0,0,0.10)"/>
        {item.art}
      </svg>
    </div>
  );
}
