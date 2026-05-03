'use client';

import React from 'react';
import { RZ } from '@/lib/rz';

interface RzMilestoneProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function RzMilestone({ children, icon, style }: RzMilestoneProps) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 18px', borderRadius: 999, background: RZ.warm,
      color: RZ.white, font: `700 13px/1 ${RZ.fontUI}`,
      boxShadow: '0 4px 14px rgba(232,0,90,0.25)',
      ...style,
    }}>
      {icon}{children}
    </div>
  );
}
