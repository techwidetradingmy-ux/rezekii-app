'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import Icon from '@/components/ui/Icon';
import RzTag from '@/components/ui/RzTag';
import { RZ } from '@/lib/rz';

// ---------------------------------------------------------------------------
// Banner type
// ---------------------------------------------------------------------------

type Banner = {
  tag: string;
  bg: string;
  accent: string;
  title: string;
  sub: string;
  cta: string;
  img: string;
  kind: 'campaign';
};

// ---------------------------------------------------------------------------
// BannerCarousel — featured campaign banner with auto-rotate, swipe, dots
// ---------------------------------------------------------------------------

interface BannerCarouselProps {
  banners: Banner[];
  bannerIdx: number;
  setBannerIdx: (n: number) => void;
  setBannerPaused: (b: boolean) => void;
  onOpenCampaign: () => void;
}

function BannerCarousel({ banners, bannerIdx, setBannerIdx, setBannerPaused, onOpenCampaign }: BannerCarouselProps) {
  type Drag = { startX: number; startY: number; dx: number; dy: number; locked: 'x' | 'y' | null };
  const [drag, setDrag] = useState<Drag | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef<number>(0);

  useEffect(() => {
    const el = trackRef.current;
    if (el && el.parentElement) widthRef.current = el.parentElement.clientWidth;
  }, [bannerIdx]);

  const onDown = (clientX: number, clientY: number) => {
    setBannerPaused(true);
    const w = trackRef.current?.parentElement?.clientWidth || 0;
    widthRef.current = w;
    setDrag({ startX: clientX, startY: clientY, dx: 0, dy: 0, locked: null });
  };
  const onMove = (clientX: number, clientY: number) => {
    if (!drag) return;
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    let locked = drag.locked;
    if (locked == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    setDrag({ ...drag, dx, dy, locked });
  };
  const onUp = () => {
    if (!drag) return;
    const threshold = Math.max(40, widthRef.current * 0.18);
    if (drag.locked === 'x') {
      if (drag.dx < -threshold) setBannerIdx((bannerIdx + 1) % banners.length);
      else if (drag.dx > threshold) setBannerIdx((bannerIdx - 1 + banners.length) % banners.length);
      else if (Math.abs(drag.dx) < 6) {
        const b = banners[bannerIdx];
        if (b && b.kind === 'campaign') onOpenCampaign();
      }
    } else if (drag.locked == null && Math.abs(drag.dx) < 6 && Math.abs(drag.dy) < 6) {
      const b = banners[bannerIdx];
      if (b && b.kind === 'campaign') onOpenCampaign();
    }
    setDrag(null);
  };

  const offsetPct = -bannerIdx * 100;
  const dragPct = drag && drag.locked === 'x' ? (drag.dx / Math.max(1, widthRef.current)) * 100 : 0;

  return (
    <div style={{ position: 'relative', marginBottom: 22 }}>
      <div
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, boxShadow: '0 18px 34px rgba(13,17,23,0.18), 0 2px 4px rgba(13,17,23,0.06)', touchAction: 'pan-y', cursor: drag ? 'grabbing' : 'grab' }}
        onTouchStart={(e) => onDown(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onUp}
        onMouseDown={(e) => { onDown(e.clientX, e.clientY); }}
        onMouseMove={(e) => { if (drag) onMove(e.clientX, e.clientY); }}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      >
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            transform: `translateX(calc(${offsetPct}% + ${dragPct}%))`,
            transition: drag ? 'none' : 'transform .48s cubic-bezier(.2,.9,.3,1)',
            willChange: 'transform',
          }}
        >
          {banners.map((b, i) => (
            <div key={i} style={{
              flex: '0 0 100%', width: '100%', minWidth: 0,
              position: 'relative', background: b.bg,
              padding: '16px 16px 14px',
              boxSizing: 'border-box',
            }}>
              <div style={{ position: 'absolute', right: -28, top: -28, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${b.accent}22, transparent 70%)`, pointerEvents: 'none' }}/>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', font: `900 9px/1 ${RZ.fontUI}`, letterSpacing: '.14em', backdropFilter: 'blur(6px)' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: b.accent }}/>
                  {b.tag}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {banners.map((_, j) => (
                    <button
                      key={j}
                      onClick={(e) => { e.stopPropagation(); setBannerIdx(j); setBannerPaused(true); }}
                      aria-label={`banner ${j + 1}`}
                      style={{
                        width: j === bannerIdx ? 14 : 5, height: 5, borderRadius: 3, border: 0, padding: 0,
                        background: j === bannerIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                        transition: 'width .25s, background .25s', cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', font: `800 17px/1.2 ${RZ.fontDisplay}`, letterSpacing: '-0.01em', marginBottom: 5 }}>{b.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.82)', font: `500 11.5px/1.35 ${RZ.fontUI}`, marginBottom: 10 }}>{b.sub}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setBannerPaused(true); onOpenCampaign(); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 999,
                      background: '#fff', color: RZ.black, border: 0, cursor: 'pointer',
                      font: `800 11.5px/1 ${RZ.fontUI}`, letterSpacing: '-0.005em',
                      boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
                    }}
                  >
                    {b.cta}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
                <div style={{ width: 76, height: 76, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.35)', boxShadow: '0 8px 16px rgba(0,0,0,0.25)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/${b.img}.jpg`} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecommendedScroller — horizontal product rail with drag-to-scroll
// ---------------------------------------------------------------------------

interface RecommendedScrollerProps {
  onOpenProduct: () => void;
}

function RecommendedScroller({ onOpenProduct }: RecommendedScrollerProps) {
  const items = [
    { cat: 'Beauty',  name: 'Glow Serum 30ml',     c: '12% +3%', rm: 'RM 21.00', price: 'RM 150', img: '/product-beauty.jpg',  flag: 'PRIORITY', flagColor: '#00c073', reason: 'Admin priority . boosted rate' },
    { cat: 'Beauty',  name: 'Matte Lip Tint',      c: '14%',     rm: 'RM 6.30',  price: 'RM 45',  img: '/product-fashion.jpg', flag: 'LIVE',     flagColor: '#e8005a', reason: "You're already selling this" },
    { cat: 'Beauty',  name: 'Ceramide Mask',       c: '16%',     rm: 'RM 11.20', price: 'RM 70',  img: '/product-beauty.jpg',  flag: 'NICHE',    flagColor: '#25f4ee', reason: 'Fits your content niche' },
    { cat: 'Food',    name: 'Nasi Lemak Sambal',   c: '15%',     rm: 'RM 5.40',  price: 'RM 36',  img: '/product-food.jpg',    flag: 'NEW',      flagColor: '#f5a623', reason: 'Fresh seller . cross-niche pick' },
    { cat: 'Tech',    name: 'ProBuds 2',           c: '10%',     rm: 'RM 14.90', price: 'RM 149', img: '/product-tech.jpg',    flag: 'HOT',      flagColor: '#e8005a', reason: 'Trending in your feed now' },
    { cat: 'Fashion', name: 'Oversized Basic Tee', c: '12%',     rm: 'RM 7.20',  price: 'RM 60',  img: '/product-fashion.jpg', flag: 'PRIORITY', flagColor: '#00c073', reason: 'Extra rate . agency pick' },
  ];

  const railRef = useRef<HTMLDivElement | null>(null);
  type DragRail = { startX: number; scrollLeft: number; dx: number };
  const [drag, setDrag] = useState<DragRail | null>(null);

  const onDown = (clientX: number) => {
    const el = railRef.current;
    if (!el) return;
    setDrag({ startX: clientX, scrollLeft: el.scrollLeft, dx: 0 });
  };
  const onMove = (clientX: number) => {
    if (!drag) return;
    const el = railRef.current;
    if (!el) return;
    el.scrollLeft = drag.scrollLeft - (clientX - drag.startX);
    setDrag({ ...drag, dx: clientX - drag.startX });
  };
  const onUp = () => setDrag(null);

  return (
    <div style={{ position: 'relative', marginLeft: -20, marginRight: -20 }}>
      <div
        ref={railRef}
        onMouseDown={(e) => { e.preventDefault(); onDown(e.clientX); }}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={(e) => onDown(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onUp}
        className="no-scrollbar"
        style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          padding: '0 20px 4px',
          cursor: drag ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        {items.map((p, i) => (
          <div
            key={i}
            onClick={() => { if (drag && Math.abs(drag.dx) > 6) return; onOpenProduct(); }}
            style={{
              width: 162, flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 8,
              position: 'relative', cursor: 'pointer',
              background: RZ.white, borderRadius: 16,
              border: `1px solid ${RZ.border}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              padding: 10,
            }}
          >
            <div style={{
              position: 'absolute', top: 8, left: 8, zIndex: 2,
              padding: '3px 7px', borderRadius: 5,
              background: p.flagColor,
              color: p.flag === 'LIVE' ? '#fff' : (p.flagColor === '#25f4ee' ? RZ.black : '#fff'),
              font: `900 8.5px/1 ${RZ.fontUI}`, letterSpacing: '.08em',
              boxShadow: `0 4px 10px ${p.flagColor}55`,
            }}>{p.flag}</div>
            <div style={{
              width: '100%', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden',
              background: RZ.canvas,
              boxShadow: 'inset 0 0 0 1px rgba(13,17,23,0.06)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}/>
            </div>
            <RzTag tone="green">{p.cat}</RzTag>
            <div style={{ font: `700 13.5px/1.2 ${RZ.fontDisplay}`, color: RZ.black }}>{p.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: `700 13px/1 ${RZ.fontDisplay}` }}>
              <span style={{ color: RZ.muted, font: `500 10px/1 ${RZ.fontUI}`, textTransform: 'uppercase', letterSpacing: '.06em' }}>Earn</span>
              <span style={{ color: RZ.green }}>{p.rm}</span>
              <span style={{ color: RZ.muted, font: `500 11px/1 ${RZ.fontUI}` }}>. {p.c}</span>
            </div>
            <div style={{ font: `500 10px/1.3 ${RZ.fontUI}`, color: RZ.body, marginTop: -2 }}>{p.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViralProductCarousel — Top viral products with sparkline hero cards
// ---------------------------------------------------------------------------

type ViralHero = {
  name: string;
  cat: string;
  img: string;
  gmv: string;
  units: string;
  delta: string;
  velocity: string;
  spark: number[];
};

interface ViralProductCarouselProps {
  timeframe: string;
  onOpenProduct: () => void;
}

function ViralProductCarousel({ timeframe, onOpenProduct }: ViralProductCarouselProps) {
  const byRange: Record<string, ViralHero[]> = {
    'Today': [
      { name: 'Glow Serum 30ml',   cat: 'Beauty', img: '/product-beauty.jpg',  gmv: 'RM 4.2K',  units: '278',    delta: '+58%', velocity: 'Selling every 38s',     spark: [6, 8, 9, 11, 14, 18, 22, 26, 31, 34, 38, 42] },
      { name: 'Nasi Lemak Sambal', cat: 'Food',   img: '/product-food.jpg',    gmv: 'RM 3.1K',  units: '462',    delta: '+41%', velocity: 'Selling every 1m 22s', spark: [8, 10, 11, 13, 15, 14, 18, 22, 24, 28, 30, 34] },
      { name: 'ProBuds 2',         cat: 'Tech',   img: '/product-tech.jpg',    gmv: 'RM 2.8K',  units: '94',     delta: '+28%', velocity: 'Selling every 4m 10s', spark: [10, 9, 11, 10, 13, 16, 18, 17, 21, 22, 26, 28] },
    ],
    'Yesterday': [
      { name: 'Nasi Lemak Sambal', cat: 'Food',    img: '/product-food.jpg',    gmv: 'RM 3.8K',  units: '568',   delta: '+32%', velocity: 'Peaked at 9pm',         spark: [10, 14, 17, 22, 26, 30, 34, 38, 32, 28, 24, 20] },
      { name: 'Glow Serum 30ml',   cat: 'Beauty',  img: '/product-beauty.jpg',  gmv: 'RM 3.6K',  units: '241',   delta: '+24%', velocity: 'Steady morning surge',  spark: [12, 16, 20, 22, 26, 28, 26, 24, 22, 20, 18, 16] },
      { name: 'Oversized Tee',     cat: 'Fashion', img: '/product-fashion.jpg', gmv: 'RM 2.4K',  units: '188',   delta: '+18%', velocity: 'Afternoon peak',        spark: [8, 10, 9, 12, 15, 20, 25, 28, 26, 22, 18, 14] },
    ],
    'Past 7 days': [
      { name: 'Glow Serum 30ml',   cat: 'Beauty', img: '/product-beauty.jpg',  gmv: 'RM 28.4K', units: '1,892', delta: '+42%', velocity: 'Selling every 46s',     spark: [8, 11, 9, 14, 13, 18, 22, 20, 27, 32, 30, 38] },
      { name: 'Nasi Lemak Sambal', cat: 'Food',   img: '/product-food.jpg',    gmv: 'RM 21.7K', units: '3,214', delta: '+18%', velocity: 'Consistent daily top',  spark: [14, 17, 19, 21, 23, 22, 25, 27, 30, 29, 32, 34] },
      { name: 'Wireless Earbuds',  cat: 'Tech',   img: '/product-tech.jpg',    gmv: 'RM 18.2K', units: '612',   delta: '+9%',  velocity: 'Weekend-led',            spark: [16, 18, 17, 15, 16, 20, 24, 22, 23, 25, 24, 26] },
      { name: 'Matte Lip Tint',    cat: 'Beauty', img: '/product-fashion.jpg', gmv: 'RM 14.5K', units: '2,310', delta: '+12%', velocity: 'Stable low-price driver', spark: [12, 14, 13, 15, 17, 16, 18, 20, 19, 22, 21, 23] },
    ],
    'Past 30 days': [
      { name: 'Glow Serum 30ml',   cat: 'Beauty', img: '/product-beauty.jpg', gmv: 'RM 112K', units: '7,480',  delta: '+64%', velocity: 'Month leader',  spark: [18, 22, 26, 28, 32, 30, 36, 38, 42, 40, 46, 52] },
      { name: 'Wireless Earbuds',  cat: 'Tech',   img: '/product-tech.jpg',   gmv: 'RM 78K',  units: '2,610',  delta: '+21%', velocity: 'Steady',         spark: [22, 24, 26, 25, 27, 28, 30, 32, 31, 34, 33, 36] },
      { name: 'Nasi Lemak Sambal', cat: 'Food',   img: '/product-food.jpg',   gmv: 'RM 72K',  units: '10,720', delta: '+17%', velocity: 'Broad base',     spark: [24, 25, 27, 26, 28, 27, 29, 30, 31, 32, 33, 34] },
    ],
    'This month': [
      { name: 'Glow Serum 30ml', cat: 'Beauty', img: '/product-beauty.jpg',  gmv: 'RM 68K', units: '4,520', delta: '+38%', velocity: 'Month-to-date #1',   spark: [14, 18, 22, 24, 28, 30, 32, 34, 36, 38, 41, 44] },
      { name: 'ProBuds 2',       cat: 'Tech',   img: '/product-tech.jpg',    gmv: 'RM 41K', units: '1,372', delta: '+24%', velocity: 'Tech category lead',  spark: [18, 19, 22, 24, 23, 26, 28, 29, 31, 30, 33, 35] },
      { name: 'Matte Lip Tint',  cat: 'Beauty', img: '/product-fashion.jpg', gmv: 'RM 32K', units: '5,080', delta: '+15%', velocity: 'Steady stream',       spark: [14, 15, 17, 16, 18, 20, 19, 21, 22, 23, 24, 26] },
    ],
    'Last month': [
      { name: 'Wireless Earbuds', cat: 'Tech',    img: '/product-tech.jpg',    gmv: 'RM 84K', units: '2,820', delta: '+31%', velocity: 'Tech-led month',    spark: [16, 20, 22, 26, 28, 30, 28, 32, 34, 31, 35, 38] },
      { name: 'Glow Serum 30ml',  cat: 'Beauty',  img: '/product-beauty.jpg',  gmv: 'RM 71K', units: '4,760', delta: '+22%', velocity: 'Consistent #2',     spark: [18, 20, 22, 24, 23, 26, 28, 27, 30, 32, 31, 34] },
      { name: 'Oversized Tee',    cat: 'Fashion', img: '/product-fashion.jpg', gmv: 'RM 38K', units: '2,960', delta: '+14%', velocity: 'Fashion mid-month', spark: [14, 15, 17, 18, 20, 19, 21, 22, 21, 23, 24, 25] },
    ],
  };
  const list = byRange[timeframe] ?? byRange['Past 7 days'];

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { setIdx(0); }, [timeframe]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx(i => (i + 1) % list.length), 5000);
    return () => clearInterval(id);
  }, [paused, list.length]);

  type Drag = { startX: number; startY: number; dx: number; dy: number; locked: 'x' | 'y' | null };
  const [drag, setDrag] = useState<Drag | null>(null);
  const widthRef = useRef<number>(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const onDown = (clientX: number, clientY: number) => {
    setPaused(true);
    widthRef.current = trackRef.current?.parentElement?.clientWidth || 0;
    setDrag({ startX: clientX, startY: clientY, dx: 0, dy: 0, locked: null });
  };
  const onMove = (clientX: number, clientY: number) => {
    if (!drag) return;
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    let locked = drag.locked;
    if (locked == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    setDrag({ ...drag, dx, dy, locked });
  };
  const onUp = () => {
    if (!drag) return;
    const threshold = Math.max(40, widthRef.current * 0.18);
    if (drag.locked === 'x') {
      if (drag.dx < -threshold) setIdx((idx + 1) % list.length);
      else if (drag.dx > threshold) setIdx((idx - 1 + list.length) % list.length);
    }
    setDrag(null);
  };

  const offsetPct = -idx * 100;
  const dragPct = drag && drag.locked === 'x' ? (drag.dx / Math.max(1, widthRef.current)) * 100 : 0;

  return (
    <div>
      <div
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, touchAction: 'pan-y' }}
        onTouchStart={(e) => onDown(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onUp}
        onMouseDown={(e) => { onDown(e.clientX, e.clientY); }}
        onMouseMove={(e) => { if (drag) onMove(e.clientX, e.clientY); }}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      >
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            transform: `translateX(calc(${offsetPct}% + ${dragPct}%))`,
            transition: drag ? 'none' : 'transform .5s cubic-bezier(.2,.9,.3,1)',
            willChange: 'transform',
          }}
        >
          {list.map((hero, i) => {
            const rank = i + 1;
            const sparkMax = Math.max(...hero.spark);
            const sparkPath = hero.spark.map((v, j) => `${j === 0 ? 'M' : 'L'} ${(j / (hero.spark.length - 1)) * 100} ${40 - (v / sparkMax) * 34}`).join(' ');
            const sparkArea = `${sparkPath} L 100 40 L 0 40 Z`;
            return (
              <div key={i} style={{ flex: '0 0 100%', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                <div
                  onClick={() => { if (drag && Math.abs(drag.dx) > 6) return; onOpenProduct(); }}
                  style={{
                    position: 'relative', overflow: 'hidden', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #0d1117 0%, #1a2028 55%, #2b0f24 100%)',
                    borderRadius: 18, padding: 14,
                    boxShadow: '0 10px 28px rgba(232,0,90,0.22), 0 2px 8px rgba(13,17,23,0.18)',
                  }}
                >
                  <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,0,90,0.35), transparent 70%)', pointerEvents: 'none' }}/>
                  <div style={{ position: 'absolute', bottom: -50, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.22), transparent 70%)', pointerEvents: 'none' }}/>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 9px', borderRadius: 999,
                      background: 'linear-gradient(135deg, #f5a623, #e8005a)',
                      color: '#fff', font: `900 10px/1 ${RZ.fontUI}`, letterSpacing: '.06em',
                      boxShadow: '0 4px 12px rgba(232,0,90,0.4)',
                    }}>
                      #{rank} VIRAL
                    </div>
                    <div style={{ flex: 1 }}/>
                    <div style={{ font: `700 10px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.65)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                      {hero.velocity}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 92, height: 92, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                      boxShadow: '0 8px 18px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.15)',
                      position: 'relative',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hero.img} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ font: `700 9px/1 ${RZ.fontUI}`, color: RZ.cyan, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{hero.cat}</div>
                        <div style={{ font: `800 15px/1.15 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.01em' }}>{hero.name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
                        <div>
                          <div style={{ font: `600 8.5px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.55)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 3 }}>GMV</div>
                          <div style={{ font: `900 18px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{hero.gmv}</div>
                        </div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 2,
                          padding: '3px 7px', borderRadius: 6,
                          background: 'rgba(0,192,115,0.2)',
                          font: `800 10px/1 ${RZ.fontUI}`, color: '#5ff1a8',
                        }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5ff1a8" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7M17 7H9M17 7v8"/>
                          </svg>
                          {hero.delta}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', font: `600 8.5px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.5)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      <span>Trajectory . {timeframe}</span>
                      <span>{hero.units} units</span>
                    </div>
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: 40, display: 'block' }}>
                      <defs>
                        <linearGradient id={`viralSparkFill-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5ff1a8" stopOpacity="0.45"/>
                          <stop offset="100%" stopColor="#5ff1a8" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d={sparkArea} fill={`url(#viralSparkFill-${i})`}/>
                      <path d={sparkPath} fill="none" stroke="#5ff1a8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="100" cy={40 - (hero.spark[hero.spark.length - 1] / sparkMax) * 34} r="2.2" fill="#5ff1a8"/>
                    </svg>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenProduct(); }}
                    style={{
                      width: '100%', marginTop: 12, padding: '10px 14px',
                      borderRadius: 12, border: 0,
                      background: 'linear-gradient(135deg,#00c073,#5ff1a8)',
                      color: RZ.black,
                      font: `900 12.5px/1 ${RZ.fontUI}`, letterSpacing: '-0.005em',
                      cursor: 'pointer',
                      boxShadow: '0 8px 18px rgba(0,192,115,0.32)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      position: 'relative', zIndex: 1,
                    }}
                  >
                    View product
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setPaused(true); }}
            aria-label={`viral ${i + 1}`}
            style={{
              width: i === idx ? 18 : 6, height: 6, borderRadius: 3, border: 0, padding: 0,
              background: i === idx ? RZ.black : 'rgba(13,17,23,0.22)',
              transition: 'width .25s, background .25s', cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage — main screen
// ---------------------------------------------------------------------------

function readTikTokUser() {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.split('; ').find(r => r.startsWith('tiktok_user='))?.split('=').slice(1).join('=');
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return null; }
}

export default function HomePage() {
  const router = useRouter();

  // Live TikTok profile from cookie
  const [displayName, setDisplayName] = useState('');
  useEffect(() => {
    const u = readTikTokUser();
    if (u?.display_name) setDisplayName(u.display_name);
  }, []);

  const gmvRanges: string[] = ['Today', 'Yesterday', 'Past 7 days', 'Past 30 days', 'Last month', 'This month', 'Custom '];
  const [gmvRange, setGmvRange] = useState<string>('Today');
  const [rangeOpen, setRangeOpen] = useState(false);

  // Live GMV from dashboard API
  const [liveGmv, setLiveGmv] = useState<{ amt: string; delta: number; compare: string } | null>(null);
  useEffect(() => {
    const rangeMap: Record<string, string> = {
      'Today': 'Today', 'Yesterday': 'Yesterday',
      'Past 7 days': 'Past 7 Days', 'Past 30 days': 'Past 30 Days',
      'Last month': 'Last Month', 'This month': 'This Month',
    };
    const apiRange = rangeMap[gmvRange] ?? 'Today';
    fetch(`/api/tiktok/dashboard?range=${encodeURIComponent(apiRange)}`)
      .then(r => r.json())
      .then(d => setLiveGmv({ amt: d.total, delta: d.delta, compare: `${d.deltaLabel} . ${d.prevTotal}` }))
      .catch(() => {});
  }, [gmvRange]);

  // Custom-range calendar
  const [calOpen, setCalOpen] = useState(false);
  const [calStart, setCalStart] = useState<number | null>(null);
  const [calEnd, setCalEnd] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(3);
  const [calYear, setCalYear] = useState(2026);

  // Top-3 range
  const top3Ranges = ['Today', 'Yesterday', 'Past 7 days', 'Past 30 days', 'This month', 'Last month'];
  const [top3Range, setTop3Range] = useState('Past 7 days');
  const [top3Open, setTop3Open] = useState(false);

  // Featured banners
  const banners: Banner[] = [
    {
      tag: 'CAMPAIGN . PAID BRIEF', bg: 'linear-gradient(135deg,#0d1117 0%,#1a2433 100%)', accent: '#25f4ee',
      title: 'Skintific  Rezekii', sub: 'Paid TikTok brief . RM 80 flat + up to 18% commission',
      cta: 'View campaign', img: 'product-beauty', kind: 'campaign',
    },
    {
      tag: 'NEW SELLER . JUST LIVE', bg: 'linear-gradient(135deg,#e8005a 0%,#ff4d8d 100%)', accent: '#fff',
      title: 'Kampung Kitchen launched', sub: 'Sambal range just listed   first 50 creators get priority approval',
      cta: 'View campaign', img: 'product-food', kind: 'campaign',
    },
    {
      tag: 'NEW ARRIVAL . TECH', bg: 'linear-gradient(135deg,#8b5cf6 0%,#b88dff 100%)', accent: '#fff',
      title: 'AudioMY ProBuds 2', sub: 'Drop just went live . request samples before it trends',
      cta: 'View campaign', img: 'product-tech', kind: 'campaign',
    },
  ];
  const [bannerIdx, setBannerIdx] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);

  useEffect(() => {
    if (bannerPaused) return;
    const id = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [bannerPaused, banners.length]);

  const gmvFallback: Record<string, { amt: string; delta: number; compare: string }> = {
    'Today':        { amt: 'RM 142.00',   delta: 23,  compare: 'vs yesterday . RM 115.40' },
    'Yesterday':    { amt: 'RM 115.40',   delta: 8,   compare: 'vs day before . RM 106.80' },
    'Past 7 days':  { amt: 'RM 842.60',   delta: 14,  compare: 'vs previous 7 days . RM 739.20' },
    'Past 30 days': { amt: 'RM 3,612.00', delta: 31,  compare: 'vs previous 30 days . RM 2,755.00' },
    'Last month':   { amt: 'RM 1,012.00', delta: -4,  compare: 'vs month prior . RM 1,054.00' },
    'This month':   { amt: 'RM 1,245.00', delta: 23,  compare: 'vs last month . RM 1,012.00' },
    'Custom ':      { amt: 'RM 1,245.00', delta: 23,  compare: 'Select date range' },
  };
  const g = liveGmv ?? gmvFallback[gmvRange] ?? gmvFallback['Custom '];
  const gmvDelta = g.delta;
  const deltaPositive = gmvDelta >= 0;
  const deltaColor = deltaPositive ? RZ.green : '#e8005a';
  const deltaTint = deltaPositive ? RZ.greenTint : 'rgba(232,0,90,0.10)';

  return (
    <AppShell>
      <div style={{ background: RZ.canvas, display: 'flex', flexDirection: 'column' }}>
        {/* Green header — bolder presence per design feedback */}
        <div style={{ background: RZ.green, padding: '52px 20px 22px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: RZ.white, borderRadius: 13, padding: 8, display: 'inline-flex', boxShadow: '0 6px 14px rgba(0,0,0,0.14)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/rezekii-logo.png" alt="Rezekii" width={30} height={30} style={{ display: 'block' }} />
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.85)', font: `600 13px/1 ${RZ.fontUI}`, marginBottom: 6 }}>Good Morning,</div>
                <div style={{ color: RZ.white, font: `800 22px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.015em' }}>{displayName || 'Creator'}</div>
              </div>
            </div>
            <button
              onClick={() => router.push('/notifications')}
              style={{ position: 'relative', width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, cursor: 'pointer' }}
            >
              <Icon name="bell" size={22} color={RZ.white} />
              <div style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                background: '#FFB800', color: RZ.black,
                font: `900 10px/18px ${RZ.fontUI}`,
                textAlign: 'center',
                border: '2px solid #00c073',
                boxShadow: '0 0 0 0 rgba(255,184,0,0.6)',
                animation: 'homeBellPulse 1.8s ease-in-out infinite',
              }}>3</div>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '0 20px 20px' }}>
          {/* GMV card */}
          <div style={{
            background: RZ.white,
            borderRadius: 18,
            padding: 18,
            marginTop: -12,
            marginBottom: 20,
            boxShadow: '0 18px 32px rgba(13,17,23,0.10), 0 2px 4px rgba(13,17,23,0.04)',
            border: '1px solid rgba(13,17,23,0.05)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: RZ.muted, font: `700 10.5px/1 ${RZ.fontUI}`, letterSpacing: '0.14em', textTransform: 'uppercase' }}>GMV</div>
              <button
                onClick={() => setRangeOpen(o => !o)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 999,
                  background: '#f5fdf7', border: '1px solid #d8f0e4',
                  font: `700 11.5px/1 ${RZ.fontUI}`, color: RZ.black,
                  cursor: 'pointer', letterSpacing: '-0.005em',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="16" rx="2"/>
                  <path d="M3 10h18M8 3v4M16 3v4"/>
                </svg>
                {gmvRange}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: rangeOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
            {rangeOpen && (
              <div style={{
                position: 'absolute', top: 48, right: 16, zIndex: 10,
                background: '#fff', borderRadius: 12,
                boxShadow: '0 20px 40px rgba(13,17,23,0.18), 0 4px 10px rgba(13,17,23,0.08)',
                border: '1px solid rgba(13,17,23,0.06)',
                overflow: 'hidden', minWidth: 168,
                animation: 'homeDropIn .18s ease-out',
              }}>
                {gmvRanges.map(r => (
                  <button
                    key={r}
                    onClick={() => { setGmvRange(r); setRangeOpen(false); if (r === 'Custom ') setCalOpen(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      width: '100%', padding: '10px 12px', border: 0,
                      background: r === gmvRange ? '#f5fdf7' : '#fff',
                      font: `${r === gmvRange ? '700' : '500'} 12px/1 ${RZ.fontUI}`,
                      color: r === gmvRange ? RZ.green : RZ.black,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {r}
                    {r === gmvRange && <Icon name="check" size={13} color={RZ.green} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 2, marginBottom: 10 }}>
              <div style={{ color: RZ.black, font: `800 34px/1 ${RZ.fontDisplay}`, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em' }}>{g.amt}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '9px 13px', borderRadius: 12,
                background: deltaTint,
                color: deltaColor,
                font: `900 18px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.015em',
                fontVariantNumeric: 'tabular-nums',
                boxShadow: `0 4px 10px ${deltaPositive ? 'rgba(0,192,115,0.18)' : 'rgba(232,0,90,0.18)'}`,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={deltaColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: deltaPositive ? 'none' : 'rotate(180deg)' }}>
                  <path d="M7 17L17 7M17 7H9M17 7v8"/>
                </svg>
                {deltaPositive ? '+' : ''}{gmvDelta}%
              </div>
            </div>
            <div style={{ color: RZ.body, font: `500 11.5px/1.3 ${RZ.fontUI}` }}>{g.compare}</div>
          </div>

          {/* Featured campaign banner */}
          <BannerCarousel
            banners={banners}
            bannerIdx={bannerIdx}
            setBannerIdx={setBannerIdx}
            setBannerPaused={setBannerPaused}
            onOpenCampaign={() => router.push('/campaign')}
          />

          {/* Recommended for you */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ font: `700 18px/1 ${RZ.fontDisplay}`, color: RZ.black }}>Recommended For You</div>
            <div onClick={() => router.push('/marketplace')} style={{ font: `600 13px/1 ${RZ.fontUI}`, color: RZ.green, cursor: 'pointer' }}>See All</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 12, padding: '4px 10px 4px 8px', borderRadius: 999, background: 'linear-gradient(90deg, rgba(0,192,115,0.10), rgba(37,244,238,0.10))', border: '1px solid rgba(0,192,115,0.18)', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill={RZ.green}/>
              <path d="M19 3.5l.7 2 2 .5-2 .7-.7 2-.7-2-2-.7 2-.5.7-2z" fill={RZ.cyanText} opacity="0.85"/>
            </svg>
            <span style={{ font: `800 9.5px/1 ${RZ.fontUI}`, letterSpacing: '.06em', color: RZ.green, textTransform: 'uppercase' }}>AI Recommendation</span>
            <span style={{ font: `500 10.5px/1 ${RZ.fontUI}`, color: RZ.body }}>. Based on your niche &amp; level</span>
          </div>

          <RecommendedScroller onOpenProduct={() => router.push('/marketplace')} />

          {/* Top viral product */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 6, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ font: `700 18px/1 ${RZ.fontDisplay}`, color: RZ.black }}>Top Viral Product</div>
            </div>
            <button
              onClick={() => setTop3Open(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 999,
                background: '#f5fdf7', border: '1px solid #d8f0e4',
                font: `700 11px/1 ${RZ.fontUI}`, color: RZ.black,
                cursor: 'pointer', letterSpacing: '-0.005em',
              }}
            >
              {top3Range}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: top3Open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {top3Open && (
              <div style={{
                position: 'absolute', top: 38, right: 0, zIndex: 10,
                background: '#fff', borderRadius: 12,
                boxShadow: '0 20px 40px rgba(13,17,23,0.18), 0 4px 10px rgba(13,17,23,0.08)',
                border: '1px solid rgba(13,17,23,0.06)',
                overflow: 'hidden', minWidth: 156,
                animation: 'homeDropIn .18s ease-out',
              }}>
                {top3Ranges.map(r => (
                  <button
                    key={r}
                    onClick={() => { setTop3Range(r); setTop3Open(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      width: '100%', padding: '10px 12px', border: 0,
                      background: r === top3Range ? '#f5fdf7' : '#fff',
                      font: `${r === top3Range ? '700' : '500'} 12px/1 ${RZ.fontUI}`,
                      color: r === top3Range ? RZ.green : RZ.black,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {r}
                    {r === top3Range && <Icon name="check" size={13} color={RZ.green} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, font: `500 10.5px/1.3 ${RZ.fontUI}`, color: RZ.body }}>
            <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#e8005a', animation: 'viralPulse 1.6s ease-out infinite' }}/>
              <span style={{ position: 'relative', borderRadius: '50%', background: '#e8005a', width: 7, height: 7 }}/>
            </span>
            <span style={{ font: `800 10px/1 ${RZ.fontUI}`, color: '#e8005a', letterSpacing: '.06em' }}>LIVE</span>
            <span>From your agency&apos;s real-time sales . updated 2m ago</span>
          </div>

          <ViralProductCarousel timeframe={top3Range} onOpenProduct={() => router.push('/marketplace')} />
        </div>

        {/* Custom-range calendar modal */}
        {calOpen && (() => {
          const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const firstDow = new Date(calYear, calMonth, 1).getDay();
          const cells: (number | null)[] = [];
          for (let i = 0; i < firstDow; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          const pickDay = (d: number | null) => {
            if (!d) return;
            if (calStart == null || (calStart != null && calEnd != null)) {
              setCalStart(d); setCalEnd(null);
            } else if (d < calStart) {
              setCalStart(d);
            } else {
              setCalEnd(d);
            }
          };
          const inRange = (d: number | null) => {
            if (!d || calStart == null) return false;
            const s = calStart, e = calEnd ?? calStart;
            return d > Math.min(s, e) && d < Math.max(s, e);
          };
          const isEndpoint = (d: number | null) => d != null && (d === calStart || d === calEnd);

          const apply = () => {
            if (calStart != null) {
              const s = Math.min(calStart, calEnd ?? calStart);
              const e = Math.max(calStart, calEnd ?? calStart);
              const mName = monthNames[calMonth].slice(0, 3);
              setGmvRange(`${mName} ${s}   ${e}`);
            }
            setCalOpen(false);
          };

          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
              animation: 'homeDropIn .22s ease-out',
            }}>
              <div style={{
                width: '100%', maxWidth: 320,
                background: '#fff', borderRadius: 20,
                padding: 18,
                boxShadow: '0 30px 60px rgba(13,17,23,0.35), 0 6px 14px rgba(13,17,23,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ font: `800 15px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>Custom date range</div>
                  <button onClick={() => setCalOpen(false)} aria-label="close" style={{ width: 28, height: 28, borderRadius: 8, border: 0, background: '#f1f4f7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.8" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
                  </button>
                </div>
                <div style={{ font: `500 11.5px/1.35 ${RZ.fontUI}`, color: RZ.body, marginBottom: 14 }}>
                  Tap a start date, then tap an end date.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ width: 32, height: 32, borderRadius: 10, border: 0, background: '#f5fdf7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="chevL" size={15} color={RZ.green} />
                  </button>
                  <div style={{ font: `800 13.5px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>{monthNames[calMonth]} {calYear}</div>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ width: 32, height: 32, borderRadius: 10, border: 0, background: '#f5fdf7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="chevR" size={15} color={RZ.green} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', font: `700 10px/1 ${RZ.fontUI}`, color: RZ.muted, padding: '6px 0' }}>{d}</div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {cells.map((d, i) => {
                    const endpoint = isEndpoint(d);
                    const mid = inRange(d);
                    return (
                      <button
                        key={i}
                        disabled={!d}
                        onClick={() => pickDay(d)}
                        style={{
                          height: 34, borderRadius: endpoint ? 10 : (mid ? 0 : 10),
                          border: 0, cursor: d ? 'pointer' : 'default',
                          background: endpoint ? RZ.green : (mid ? RZ.greenTint : 'transparent'),
                          color: endpoint ? '#fff' : (d ? RZ.black : 'transparent'),
                          font: `${endpoint ? '800' : '600'} 12px/1 ${RZ.fontUI}`,
                          position: 'relative',
                        }}
                      >{d}</button>
                    );
                  })}
                </div>

                <div style={{
                  marginTop: 14, padding: '10px 12px', borderRadius: 12,
                  background: '#f5fdf7', border: '1px solid #d8f0e4',
                  font: `600 11.5px/1.35 ${RZ.fontUI}`, color: RZ.black,
                }}>
                  {calStart == null
                    ? <span style={{ color: RZ.body }}>No date selected</span>
                    : calEnd == null
                      ? <>Start: <b>{monthNames[calMonth].slice(0, 3)} {calStart}, {calYear}</b></>
                      : <>Range: <b>{monthNames[calMonth].slice(0, 3)} {Math.min(calStart, calEnd)}   {Math.max(calStart, calEnd)}, {calYear}</b></>
                  }
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    onClick={() => { setCalStart(null); setCalEnd(null); }}
                    style={{
                      flex: 1, height: 42, borderRadius: 12, border: `1.5px solid ${RZ.border}`,
                      background: '#fff', color: RZ.black, cursor: 'pointer',
                      font: `700 12.5px/1 ${RZ.fontUI}`,
                    }}
                  >Clear</button>
                  <button
                    onClick={apply}
                    disabled={calStart == null}
                    style={{
                      flex: 1.3, height: 42, borderRadius: 12, border: 0,
                      background: calStart == null ? '#c7d3dc' : RZ.green, color: '#fff',
                      cursor: calStart == null ? 'default' : 'pointer',
                      font: `900 12.5px/1 ${RZ.fontUI}`,
                      boxShadow: calStart == null ? 'none' : '0 8px 18px rgba(0,192,115,0.35)',
                    }}
                  >Apply range</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </AppShell>
  );
}
