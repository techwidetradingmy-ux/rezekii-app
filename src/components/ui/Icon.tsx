'use client';

import React from 'react';

type IconName =
  | 'home' | 'search' | 'bag' | 'chart' | 'user' | 'bell'
  | 'chevR' | 'chevL' | 'check' | 'x' | 'heart' | 'filter'
  | 'arrowUpRight' | 'wallet' | 'pkg' | 'clock' | 'play'
  | 'share' | 'plus' | 'trend' | 'sparkles';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, fill = 'none', style }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 9.5L12 2l9 7.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9.5z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    bag: <><path d="M3 7h18l-2 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 7z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></>,
    chart: <><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="13" y="7" width="3" height="11"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    chevR: <><path d="m9 6 6 6-6 6"/></>,
    chevL: <><path d="m15 6-6 6 6 6"/></>,
    check: <><path d="M20 6 9 17l-5-5"/></>,
    x: <><path d="M18 6 6 18M6 6l12 12"/></>,
    heart: <><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></>,
    filter: <><path d="M3 4h18l-7 9v7l-4-2v-5z"/></>,
    arrowUpRight: <><path d="M7 17 17 7M7 7h10v10"/></>,
    wallet: <><path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l3-4h12l3 4"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/></>,
    pkg: <><path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    play: <><polygon points="6 4 20 12 6 20" fill="currentColor"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    trend: <><path d="M3 17 9 11l4 4 8-8"/><path d="M21 7h-5V7"/><path d="M21 7v5"/></>,
    sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {paths[name] || null}
    </svg>
  );
}
