'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

type StatusTone = 'warm' | 'green' | 'cyan' | 'muted';
type Status = 'All' | 'Pending' | 'Approved' | 'Shipped' | 'Delivered';

interface Application {
  name: string;
  brand: string;
  status: Exclude<Status, 'All'>;
  date: string;
  track: string;
  statusTone: StatusTone;
  img: string;
  creatorSeed: number;
}

const tabs: Status[] = ['All', 'Pending', 'Approved', 'Shipped', 'Delivered'];

const apps: Application[] = [
  { name: 'Skintific 5X Ceramide Serum', brand: 'Skintific',         status: 'Shipped',   date: 'Apr 18', track: 'J&T . in transit',  statusTone: 'warm',  img: '/product-beauty.jpg',    creatorSeed: 12 },
  { name: 'Glow Vitamin C Serum 30ml',   brand: 'Glow Co.',          status: 'Delivered', date: 'Apr 15', track: 'Post by Apr 28',    statusTone: 'green', img: '/product-accessory.jpg', creatorSeed: 27 },
  { name: 'Nasi Lemak Sambal Paste 250g',brand: 'Kampung Kitchen',   status: 'Approved',  date: 'Apr 20', track: 'Prep for dispatch', statusTone: 'cyan',  img: '/product-food.jpg',      creatorSeed: 41 },
  { name: 'ProBuds 2 Wireless Earbuds',  brand: 'AudioMY',           status: 'Pending',   date: 'Apr 21', track: '24-48h review',     statusTone: 'muted', img: '/product-tech.jpg',      creatorSeed: 53 },
  { name: 'Cotton Oversized Tee',        brand: 'Basics KL',         status: 'Pending',   date: 'Apr 21', track: '24-48h review',     statusTone: 'muted', img: '/product-fashion.jpg',   creatorSeed: 8  },
];

const statusColor: Record<StatusTone, string> = {
  warm:  '#e8005a',
  green: RZ.green,
  cyan:  RZ.cyanText,
  muted: RZ.muted,
};

const profilePhoto = (seed: number) => `https://i.pravatar.cc/80?img=${seed}`;

export default function ApplicationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Status>('All');

  const filtered = tab === 'All' ? apps : apps.filter(a => a.status === tab);

  return (
    <div style={{ flex: 1, background: RZ.canvas, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 0', background: RZ.white, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${RZ.border}`, background: RZ.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="chevL" size={18} color={RZ.black} />
          </button>
          <div>
            <div style={{ font: `800 22px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>My Applications</div>
            <div style={{ font: `500 12px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 4 }}>{apps.length} active . 2 awaiting review</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 0 14px' }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 999,
                border: tab === t ? 'none' : `1.5px solid ${RZ.border}`,
                background: tab === t ? RZ.black : RZ.white,
                color: tab === t ? RZ.white : RZ.body,
                font: `600 12px/1 ${RZ.fontUI}`, cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 100px' }}>
        {filtered.map((a, i) => (
          <div
            key={i}
            style={{
              background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 14,
              padding: 12, display: 'flex', gap: 12, marginBottom: 10,
              cursor: 'pointer',
              transition: 'transform .12s ease',
            }}
          >
            {/* Product photo with creator avatar overlay */}
            <div style={{ position: 'relative', width: 66, height: 66, flexShrink: 0 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: '#f5fdf7', boxShadow: 'inset 0 0 0 1px rgba(13,17,23,0.06)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${RZ.white}`, background: '#eee', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profilePhoto(a.creatorSeed)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ font: `700 13.5px/1.25 ${RZ.fontUI}`, color: RZ.black, letterSpacing: '-0.005em', flex: 1 }}>{a.name}</div>
                <Icon name="chevR" size={14} color={RZ.muted} />
              </div>
              <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 4 }}>{a.brand} . Applied {a.date}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: `700 12px/1 ${RZ.fontUI}`, color: statusColor[a.statusTone] }}>
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: statusColor[a.statusTone] }} />
                  {a.status}
                </div>
                <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.body }}>{a.track}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
