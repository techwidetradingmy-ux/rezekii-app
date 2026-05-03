'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';
import RzCard from '@/components/ui/RzCard';
import AppShell from '@/components/layout/AppShell';

type RangeKey =
  | 'Today'
  | 'Yesterday'
  | 'Past 7 Days'
  | 'Past 30 Days'
  | 'This Month'
  | 'Last Month'
  | 'Custom...';

type StatIcon = 'bag' | 'wallet' | 'play' | 'trend' | 'pkg';

interface RangeData {
  total: string;
  delta: number;
  deltaLabel: string;
  bars: number[];
  labels: string[];
  barDates: string[];
  productsSold: number;
  avgPrice: string;
  gmvPerVideo: string;
  gmvPerLive: string;
  videoViews: string;
  productTypes: number;
  streakDays: number;
}

interface PrimaryStat {
  label: string;
  value: string;
  icon: StatIcon;
  tone: string;
  growth: number;
}

interface Niche {
  name: string;
  pct: number;
  gmv: string;
  color: string;
}

interface TopProduct {
  name: string;
  cat: string;
  gmv: string;
  units: number;
  img: string;
}

interface TopPost {
  caption: string;
  views: string;
  gmv: string;
  duration: string;
  img: string;
  tag: string;
  tagColor: string;
}

const ranges: RangeKey[] = [
  'Today', 'Yesterday', 'Past 7 Days', 'Past 30 Days', 'This Month', 'Last Month', 'Custom...',
];

const dataByRange: Record<Exclude<RangeKey, 'Custom...'>, RangeData> = {
  'Today': {
    total: 'RM 142.00', delta: 23, deltaLabel: 'vs Yesterday',
    bars: [142], labels: ['Today'], barDates: ['Apr 24'],
    productsSold: 8, avgPrice: 'RM 17.75',
    gmvPerVideo: 'RM 48.30', gmvPerLive: 'RM 112.50', videoViews: '2.4K',
    productTypes: 3, streakDays: 12,
  },
  'Yesterday': {
    total: 'RM 115.40', delta: 8, deltaLabel: 'vs Day Before',
    bars: [115], labels: ['Yesterday'], barDates: ['Apr 23'],
    productsSold: 6, avgPrice: 'RM 19.23',
    gmvPerVideo: 'RM 38.50', gmvPerLive: 'RM 98.20', videoViews: '1.9K',
    productTypes: 2, streakDays: 11,
  },
  'Past 7 Days': {
    total: 'RM 842.60', delta: 14, deltaLabel: 'vs Previous 7 Days',
    bars: [85, 92, 78, 108, 142, 175, 162],
    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    barDates: ['Apr 18', 'Apr 19', 'Apr 20', 'Apr 21', 'Apr 22', 'Apr 23', 'Apr 24'],
    productsSold: 42, avgPrice: 'RM 20.06',
    gmvPerVideo: 'RM 58.20', gmvPerLive: 'RM 142.00', videoViews: '14.3K',
    productTypes: 5, streakDays: 12,
  },
  'Past 30 Days': {
    total: 'RM 3,612.00', delta: 31, deltaLabel: 'vs Previous 30 Days',
    bars: [38, 52, 45, 68, 72, 58, 85, 92, 78, 64, 88, 96, 72, 84, 110, 118, 95, 128, 142, 135, 162, 148, 175, 188, 142, 168, 195, 210, 185, 212],
    labels: ['1', '5', '10', '15', '20', '25', '30'],
    barDates: Array.from({ length: 30 }, (_, i) => (i >= 7 ? `Apr ${i - 6}` : `Mar ${25 + i}`)),
    productsSold: 86, avgPrice: 'RM 42.00',
    gmvPerVideo: 'RM 68.40', gmvPerLive: 'RM 215.00', videoViews: '247K',
    productTypes: 12, streakDays: 12,
  },
  'This Month': {
    total: 'RM 2,480.00', delta: 18, deltaLabel: 'vs Same Window Last Month',
    bars: [72, 84, 110, 118, 95, 128, 142, 135, 162, 148, 175, 188, 142, 168, 195, 210, 185, 212, 198, 225, 242, 268, 255, 288],
    labels: ['1', '5', '10', '15', '20', '24'],
    barDates: Array.from({ length: 24 }, (_, i) => `Apr ${i + 1}`),
    productsSold: 58, avgPrice: 'RM 42.76',
    gmvPerVideo: 'RM 72.10', gmvPerLive: 'RM 245.00', videoViews: '168K',
    productTypes: 9, streakDays: 12,
  },
  'Last Month': {
    total: 'RM 1,012.00', delta: -4, deltaLabel: 'vs Month Prior',
    bars: [22, 38, 42, 35, 48, 52, 45, 68, 58, 72, 65, 82, 78, 88, 92, 95, 88, 78, 85, 92, 82, 75, 68, 72, 78, 82, 88, 92, 75, 82, 78],
    labels: ['1', '5', '10', '15', '20', '25', '30'],
    barDates: Array.from({ length: 31 }, (_, i) => `Mar ${i + 1}`),
    productsSold: 32, avgPrice: 'RM 31.63',
    gmvPerVideo: 'RM 42.00', gmvPerLive: 'RM 128.00', videoViews: '98K',
    productTypes: 7, streakDays: 12,
  },
};

const nichesLocal: Niche[] = [
  { name: 'Beauty', pct: 48, gmv: 'RM 1,733.76', color: '#e8005a' },
  { name: 'Food', pct: 22, gmv: 'RM 794.64', color: '#f5a623' },
  { name: 'Fashion', pct: 18, gmv: 'RM 650.16', color: '#8b5cf6' },
  { name: 'Tech', pct: 12, gmv: 'RM 433.44', color: '#25f4ee' },
];

const topProductsLocal: TopProduct[] = [
  { name: 'Glow Serum 30ml', cat: 'Beauty', gmv: 'RM 682.00', units: 38, img: '/images/product-beauty.jpg' },
  { name: 'Matte Lip Tint', cat: 'Beauty', gmv: 'RM 425.60', units: 22, img: '/images/product-beauty.jpg' },
  { name: 'Nasi Lemak Sambal', cat: 'Food', gmv: 'RM 378.00', units: 18, img: '/images/product-food.jpg' },
];

const topPostsLocal: TopPost[] = [
  { caption: 'Glow Serum review . ASMR unboxing', views: '10.2K', gmv: 'RM 142.00', duration: '0:28', img: '/images/product-beauty.jpg', tag: 'Highest Earning', tagColor: '#f5a623' },
  { caption: 'Batik Tote OOTD haul', views: '8.8K', gmv: 'RM 96.00', duration: '0:42', img: '/images/product-fashion.jpg', tag: 'Best Selling', tagColor: RZ.green },
  { caption: 'AudioMY ProBuds blind test', views: '6.4K', gmv: 'RM 72.00', duration: '0:35', img: '/images/product-tech.jpg', tag: 'Newly Viral', tagColor: '#e8005a' },
];

export default function EarningsPage() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('Past 30 Days');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Live data from dashboard API — falls back to static mock while loading
  const [liveData, setLiveData] = useState<null | {
    total: string; delta: number; deltaLabel: string; prevTotal: string;
    bars: number[]; labels: string[]; barDates: string[];
    productsSold: number; avgPrice: string; gmvPerVideo: string; gmvPerLive: string;
    videoViews: string; productTypes: number; withdraw: string;
    topProducts: { name: string; cat: string; gmv: string; units: number; img: string }[];
    niches: { name: string; pct: number; gmv: string; color: string }[];
    topPosts: { caption: string; views: string; gmv: string; duration: string; img: string; tag: string; tagColor: string }[];
  }>(null);

  useEffect(() => {
    const apiRange = range === 'Custom...' ? 'Past 30 Days' : range;
    fetch(`/api/tiktok/dashboard?range=${encodeURIComponent(apiRange)}`)
      .then(r => r.json())
      .then(setLiveData)
      .catch(() => {});
  }, [range]);

  const dataKey: Exclude<RangeKey, 'Custom...'> =
    range === 'Custom...' ? 'Past 30 Days' : range;
  const d = dataByRange[dataKey];

  // Merge live API data over static fallback
  const bars         = liveData?.bars         ?? d.bars;
  const totalLabel   = liveData?.total        ?? d.total;
  const deltaVal     = liveData?.delta        ?? d.delta;
  const deltaLbl     = liveData?.deltaLabel   ?? d.deltaLabel;
  const prevTotalLbl = liveData?.prevTotal    ?? '';
  const withdraw     = liveData?.withdraw     ?? 'RM 842.00';
  const topProducts  = liveData?.topProducts  ?? topProductsLocal;
  const niches       = liveData?.niches       ?? nichesLocal;
  const topPostsData = liveData?.topPosts     ?? topPostsLocal;

  const maxH = Math.max(...bars);
  const deltaPositive = deltaVal >= 0;

  const primaryStats: PrimaryStat[] = [
    { label: 'Products Sold',     value: String(liveData?.productsSold  ?? d.productsSold),  icon: 'bag',    tone: RZ.green,    growth: 24 },
    { label: 'Avg Product GMV',   value: liveData?.avgPrice   ?? d.avgPrice,   icon: 'wallet', tone: '#8b5cf6', growth: 12 },
    { label: 'Avg GMV / Video',   value: liveData?.gmvPerVideo ?? d.gmvPerVideo, icon: 'play',   tone: '#e8005a', growth: -3 },
    { label: 'Avg GMV / Live',    value: liveData?.gmvPerLive  ?? d.gmvPerLive,  icon: 'trend',  tone: '#f5a623', growth: 18 },
    { label: 'Avg Video Views',   value: liveData?.videoViews  ?? d.videoViews,  icon: 'trend',  tone: RZ.cyanText, growth: 31 },
    { label: 'Product Types Sold',value: String(liveData?.productTypes ?? d.productTypes), icon: 'pkg', tone: RZ.green, growth: 8 },
  ];

  return (
    <AppShell>
      <div style={{ background: RZ.canvas, position: 'relative', minHeight: '100%' }}>
        {/* Compact top bar */}
        <div style={{ padding: '20px 20px 14px', background: RZ.white, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ font: `800 26px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>
              Earnings
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: RZ.canvas, border: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Share earnings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
              </button>
              <button
                onClick={() => setRangeOpen(o => !o)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 999,
                  background: '#f5fdf7', border: '1px solid #d8f0e4',
                  font: `700 12px/1 ${RZ.fontUI}`, color: RZ.black,
                  cursor: 'pointer', letterSpacing: '-0.005em',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                {range}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: rangeOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
          {rangeOpen && (
            <div style={{
              position: 'absolute', top: 60, right: 20, zIndex: 10,
              background: '#fff', borderRadius: 12,
              boxShadow: '0 20px 40px rgba(13,17,23,0.18), 0 4px 10px rgba(13,17,23,0.08)',
              border: '1px solid rgba(13,17,23,0.06)',
              overflow: 'hidden', minWidth: 168,
              animation: 'earnDropIn .18s ease-out',
            }}>
              {ranges.map(r => (
                <button
                  key={r}
                  onClick={() => { setRange(r); setRangeOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    width: '100%', padding: '10px 12px', border: 0,
                    background: r === range ? '#f5fdf7' : '#fff',
                    font: `${r === range ? '700' : '500'} 12px/1 ${RZ.fontUI}`,
                    color: r === range ? RZ.green : RZ.black,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {r}
                  {r === range && <Icon name="check" size={13} color={RZ.green} strokeWidth={3} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '4px 16px 24px' }}>
          {/* Hero earnings */}
          <div style={{ padding: '8px 4px 16px' }}>
            <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              Total . {range}
            </div>
            <div className="rz-earn" style={{ font: `700 24px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalLabel}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
              padding: '4px 9px', borderRadius: 999,
              background: deltaPositive ? RZ.greenTint : 'rgba(232,0,90,0.09)',
              color: deltaPositive ? RZ.green : '#e8005a',
              font: `700 12px/1 ${RZ.fontUI}`,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={deltaPositive ? RZ.green : '#e8005a'} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                {deltaPositive
                  ? <path d="M7 17L17 7M17 7H9M17 7v8" />
                  : <path d="M17 7L7 17M7 17h8M7 17V9" />}
              </svg>
              {Math.abs(deltaVal)}% {deltaLbl}
            </div>
          </div>

          {/* Chart */}
          <RzCard padding={false}>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div style={{ font: `700 13px/1 ${RZ.fontDisplay}`, color: RZ.black }}>Daily Sales Trend</div>
                <div style={{ font: `500 10px/1 ${RZ.fontUI}`, color: RZ.muted }}>Tap A Bar To Reveal GMV</div>
              </div>
              <div style={{ position: 'relative', paddingTop: hoverIdx != null ? 38 : 0, transition: 'padding .18s' }}>
                {hoverIdx != null && bars[hoverIdx] != null && (() => {
                  const pct = (hoverIdx + 0.5) / bars.length;
                  const tipValue = bars[hoverIdx];
                  const tipDate = d.barDates[hoverIdx] ?? d.labels[hoverIdx] ?? `Day ${hoverIdx + 1}`;
                  const leftPct = Math.max(12, Math.min(88, pct * 100));
                  return (
                    <div style={{
                      position: 'absolute', top: 0, left: `${leftPct}%`, transform: 'translateX(-50%)',
                      background: RZ.black, color: RZ.white, borderRadius: 8, padding: '6px 10px',
                      font: `700 11px/1.2 ${RZ.fontUI}`, whiteSpace: 'nowrap',
                      boxShadow: '0 6px 14px rgba(13,17,23,0.25)',
                      animation: 'earnDropIn .14s ease-out', zIndex: 2,
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.7)', font: `500 9px/1 ${RZ.fontUI}`, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                        {tipDate}
                      </div>
                      <div style={{ font: `800 13px/1 ${RZ.fontDisplay}`, fontVariantNumeric: 'tabular-nums' }}>
                        RM {tipValue.toFixed(2)}
                      </div>
                      <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 8, height: 8, background: RZ.black }} />
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 2, minWidth: 32 }}>
                    {[maxH, maxH * 0.5, 0].map((val, i) => (
                      <div key={i} style={{ font: `500 9px/1 ${RZ.fontUI}`, color: RZ.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(val)}
                      </div>
                    ))}
                  </div>

                  <div style={{ flex: 1, position: 'relative' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'flex-end', gap: bars.length > 14 ? 2 : 5, height: 120, position: 'relative' }}
                      onMouseLeave={() => setHoverIdx(null)}
                    >
                      {bars.map((h, i) => {
                        const isHover = hoverIdx === i;
                        return (
                          <div
                            key={i}
                            onMouseEnter={() => setHoverIdx(i)}
                            onClick={() => setHoverIdx(i === hoverIdx ? null : i)}
                            onTouchStart={() => setHoverIdx(i)}
                            style={{
                              flex: 1,
                              height: `${(h / maxH) * 100}%`,
                              background: isHover
                                ? 'linear-gradient(180deg,#00c073,#009a5c)'
                                : 'rgba(13,17,23,0.10)',
                              borderRadius: 4,
                              transformOrigin: 'bottom',
                              animation: `earnBarRise .5s cubic-bezier(.3,1.4,.4,1) ${i * 0.012}s both`,
                              transition: 'background .15s, filter .15s',
                              filter: isHover ? 'brightness(1.05)' : 'none',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingLeft: 40, font: `500 10px/1 ${RZ.fontUI}`, color: RZ.muted }}>
                {d.labels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
            </div>
          </RzCard>

          {/* Primary stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, marginBottom: 18 }}>
            {primaryStats.map((s, i) => (
              <RzCard key={i} padding={false}>
                <div style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: `${s.tone}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={s.icon} size={12} color={s.tone} />
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '3px 6px', borderRadius: 999,
                      background: s.growth >= 0 ? 'rgba(0,192,115,0.1)' : 'rgba(232,0,90,0.1)',
                      font: `700 9px/1 ${RZ.fontUI}`,
                      color: s.growth >= 0 ? RZ.green : '#e8005a',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={s.growth >= 0 ? RZ.green : '#e8005a'} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        {s.growth >= 0
                          ? <path d="M7 17L17 7M17 7H9M17 7v8" />
                          : <path d="M17 7L7 17M7 17h8M7 17V9" />}
                      </svg>
                      {Math.abs(s.growth)}%
                    </div>
                  </div>
                  <div style={{ font: `800 20px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {s.value}
                  </div>
                  <div style={{ font: `600 10px/1.25 ${RZ.fontUI}`, color: RZ.muted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {s.label}
                  </div>
                </div>
              </RzCard>
            ))}
          </div>

          {/* Withdraw button */}
          <button
            onClick={() => router.push('/wallet')}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 16, border: 0,
              background: 'linear-gradient(135deg, #00c073 0%, #009a5c 100%)',
              color: RZ.white, cursor: 'pointer',
              font: `800 15px/1 ${RZ.fontUI}`, letterSpacing: '-0.005em',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              boxShadow: '0 10px 22px rgba(0,192,115,0.30)',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="wallet" size={18} color={RZ.white} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ font: `600 10px/1 ${RZ.fontUI}`, opacity: 0.82, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Available To Withdraw
                </div>
                <div style={{ font: `900 18px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {withdraw}
                </div>
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.22)',
              font: `800 12px/1 ${RZ.fontUI}`, letterSpacing: '.06em',
            }}>
              WITHDRAW
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Top Selling Niche */}
          <div style={{ font: `700 16px/1 ${RZ.fontDisplay}`, color: RZ.black, marginBottom: 10, letterSpacing: '-0.01em' }}>
            Top Selling Niche
          </div>
          <RzCard padding={false}>
            <div style={{ padding: 16 }}>
              {(() => {
                const SIZE = 132;
                const STROKE = 22;
                const R = (SIZE - STROKE) / 2;
                const C = 2 * Math.PI * R;
                let acc = 0;
                const slices = niches.map((n: { name: string; pct: number; gmv: string; color: string }) => {
                  const len = (n.pct / 100) * C;
                  const dasharray = `${len} ${C - len}`;
                  const dashoffset = -acc + (C / 4);
                  acc += len;
                  return { ...n, dasharray, dashoffset };
                });
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
                      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={RZ.canvas} strokeWidth={STROKE} />
                        {slices.map((s, i) => (
                          <circle
                            key={i}
                            cx={SIZE / 2} cy={SIZE / 2} r={R}
                            fill="none" stroke={s.color} strokeWidth={STROKE}
                            strokeDasharray={s.dasharray}
                            strokeDashoffset={s.dashoffset}
                            strokeLinecap="butt"
                          />
                        ))}
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                        <div style={{ font: `600 8.5px/1 ${RZ.fontUI}`, color: RZ.muted, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 3 }}>Mix</div>
                        <div style={{ font: `900 17px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{niches.length}</div>
                        <div style={{ font: `600 8.5px/1.1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>niches</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {niches.map((n, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 9, height: 9, borderRadius: 2, background: n.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ font: `700 12.5px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.005em' }}>{n.name}</div>
                            <div style={{ font: `500 10.5px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{n.pct}% . {n.gmv}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </RzCard>

          {/* Top Selling Products */}
          <div style={{ font: `700 16px/1 ${RZ.fontDisplay}`, color: RZ.black, marginTop: 18, marginBottom: 10, letterSpacing: '-0.01em' }}>
            Top Selling Products
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topProducts.map((p, i) => (
              <RzCard key={i} padding={false}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i === 0 ? '#f5a623' : i === 1 ? '#c0c7cf' : '#d4936a',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: `900 13px/1 ${RZ.fontDisplay}`, flexShrink: 0,
                    boxShadow: '0 3px 8px rgba(0,0,0,0.12)',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(13,17,23,0.06)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `700 13.5px/1.2 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.005em' }}>{p.name}</div>
                    <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>{p.cat} . {p.units} units</div>
                  </div>
                  <div style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.green, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    {p.gmv}
                  </div>
                </div>
              </RzCard>
            ))}
          </div>

          {/* Top Performing Posts */}
          <div style={{ font: `700 16px/1 ${RZ.fontDisplay}`, color: RZ.black, marginTop: 20, marginBottom: 4, letterSpacing: '-0.01em' }}>
            Top Performing Posts
          </div>
          <div style={{ font: `500 11px/1.3 ${RZ.fontUI}`, color: RZ.muted, marginBottom: 10 }}>
            Ranked By GMV Generated . {range}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {topPostsData.map((post, i) => (
              <button key={i} style={{ textDecoration: 'none', border: 0, padding: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ background: RZ.white, borderRadius: 14, border: `1.5px solid ${RZ.border}`, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 12', background: '#0d1117', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.88)' }} />
                    <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 6px', borderRadius: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', font: `700 9px/1 ${RZ.fontUI}`, letterSpacing: '.04em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="#25f4ee">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9.01a8.16 8.16 0 004.77 1.52V7.09a4.85 4.85 0 01-1.84-.4z" />
                      </svg>
                      TikTok
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', font: `700 9px/1 ${RZ.fontUI}`, fontVariantNumeric: 'tabular-nums' }}>
                      {post.duration}
                    </div>
                    <div style={{ position: 'absolute', top: 8, left: 8, padding: '4px 7px', borderRadius: 6, background: post.tagColor, color: '#fff', font: `800 9px/1 ${RZ.fontUI}`, letterSpacing: '.06em', textTransform: 'uppercase', boxShadow: `0 3px 8px ${post.tagColor}55` }}>
                      {post.tag}
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#0d1117">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ padding: 9 }}>
                    <div style={{
                      font: `700 11.5px/1.3 ${RZ.fontDisplay}`, color: RZ.black,
                      letterSpacing: '-0.005em', marginBottom: 5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {post.caption}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, font: `500 10px/1 ${RZ.fontUI}`, color: RZ.muted }}>
                      <span>{post.views} views</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: RZ.green, font: `700 10px/1 ${RZ.fontUI}` }}>
                        Details
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
