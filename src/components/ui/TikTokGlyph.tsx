'use client';

import React from 'react';

interface TikTokGlyphProps {
  size?: number;
  style?: React.CSSProperties;
}

export default function TikTokGlyph({ size = 20, style }: TikTokGlyphProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/tiktok-square.png"
      alt="TikTok"
      width={size}
      height={size}
      style={{
        display: 'block',
        objectFit: 'contain',
        borderRadius: size * 0.22,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
