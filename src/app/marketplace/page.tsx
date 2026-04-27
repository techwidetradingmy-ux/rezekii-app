'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  cat: string;
  name: string;
  c: string;
  rm: string;
  price: string;
  img: string;
  label: 'BEST SELLER' | 'HOT SELLING' | 'NEW ARRIVAL';
}

// ─── TabBar ──────────────────────────────────────────────────────────────────

function TabBar() {
  const router = useRouter();
  const tabs = [
    { id: 'home',        label: 'Home',        icon: 'home'     as const, href: '/' },
    { id: 'marketplace', label: 'Marketplace', icon: 'bag'      as const, href: '/marketplace' },
    { id: 'campaign',    label: 'Campaign',    icon: 'sparkles' as const, href: '/campaign' },
    { id: 'earnings',    label: 'Earnings',    icon: 'wallet'   as const, href: '/earnings' },
    { id: 'profile',     label: 'Profile',     icon: 'user'     as const, href: '/profile' },
  ];
  const active = 'marketplace';

  return (
    <div style={{
      flexShrink: 0,
      height: 83,
      background: RZ.white,
      borderTop: `1px solid ${RZ.border}`,
      display: 'flex',
      alignItems: 'flex-start',
      paddingTop: 6,
    }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 0,
              cursor: 'pointer',
              padding: '6px 0 0',
            }}
          >
            <Icon
              name={tab.icon}
              size={22}
              color={isActive ? RZ.green : RZ.muted}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <span style={{
              font: `${isActive ? '700' : '500'} 10px/1 ${RZ.fontUI}`,
              color: isActive ? RZ.green : RZ.muted,
              letterSpacing: '-0.005em',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── BrowseScreen ─────────────────────────────────────────────────────────────

const LABEL_STYLES: Record<string, { bg: string; color: string; shadow: string }> = {
  'BEST SELLER': { bg: 'linear-gradient(135deg,#f5a623,#ff7a1a)', color: '#fff', shadow: 'rgba(245,166,35,0.38)' },
  'HOT SELLING': { bg: 'linear-gradient(135deg,#e8005a,#ff4d8d)', color: '#fff', shadow: 'rgba(232,0,90,0.38)' },
  'NEW ARRIVAL': { bg: 'linear-gradient(135deg,#00c073,#0abdb8)', color: '#fff', shadow: 'rgba(0,192,115,0.38)' },
};

const PRODUCTS: Product[] = [
  { cat: 'Beauty',  name: 'Glow Serum 30ml',    c: '12%', rm: 'RM 18.00', price: 'RM 150', img: 'product-beauty.jpg',    label: 'BEST SELLER' },
  { cat: 'Food',    name: 'Nasi Lemak Sambal',   c: '15%', rm: 'RM 5.40',  price: 'RM 36',  img: 'product-food.jpg',      label: 'HOT SELLING' },
  { cat: 'Tech',    name: 'Wireless Earbuds',    c: '8%',  rm: 'RM 12.00', price: 'RM 150', img: 'product-tech.jpg',      label: 'BEST SELLER' },
  { cat: 'Fashion', name: 'Batik Tote Bag',      c: '18%', rm: 'RM 22.00', price: 'RM 122', img: 'product-fashion.jpg',   label: 'NEW ARRIVAL' },
  { cat: 'Home',    name: 'Ceramic Mug Set',     c: '10%', rm: 'RM 8.90',  price: 'RM 89',  img: 'product-home.jpg',      label: 'NEW ARRIVAL' },
  { cat: 'Beauty',  name: 'Matte Lip Tint',      c: '14%', rm: 'RM 6.30',  price: 'RM 45',  img: 'product-accessory.jpg', label: 'HOT SELLING' },
];

const CATS = ['All', 'Beauty', 'Food', 'Tech', 'Fashion', 'Home'] as const;

function BrowseScreen({ onOpenProduct }: { onOpenProduct: (p: Product) => void }) {
  const [cat, setCat] = useState<string>('All');
  const filtered = cat === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);

  return (
    <div style={{ flex: 1, background: RZ.canvas, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 12px', background: RZ.white, borderBottom: `1px solid ${RZ.border}` }}>
        <div style={{ font: `800 26px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em', marginBottom: 14 }}>Browse</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 48, borderRadius: 10, border: `1.5px solid ${RZ.border}`,
          background: RZ.white, padding: '0 12px',
        }}>
          <Icon name="search" size={18} color={RZ.muted}/>
          <input
            placeholder="Search products, brands"
            style={{
              flex: 1, border: 0, outline: 'none', background: 'transparent',
              font: `500 14px/1 ${RZ.fontUI}`, color: RZ.black,
            }}
          />
        </div>
      </div>

      {/* Category chips */}
      <div style={{
        padding: '12px 20px', display: 'flex', gap: 8, overflowX: 'auto',
        background: RZ.white, scrollbarWidth: 'none',
      }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding: '8px 16px', borderRadius: 999, border: 0, cursor: 'pointer',
            background: cat === c ? RZ.black : RZ.canvas,
            color: cat === c ? RZ.white : RZ.body,
            font: `700 13px/1 ${RZ.fontUI}`, flexShrink: 0,
          }}>{c}</button>
        ))}
      </div>

      {/* Product grid */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 20px 20px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        {filtered.map((p, i) => {
          const ls = LABEL_STYLES[p.label];
          return (
            <div
              key={i}
              onClick={() => onOpenProduct(p)}
              style={{
                background: RZ.white, borderRadius: 14, padding: 10,
                display: 'flex', flexDirection: 'column', gap: 8,
                cursor: 'pointer', position: 'relative',
                boxShadow: '0 2px 8px rgba(13,17,23,0.06)',
                border: '1px solid rgba(13,17,23,0.04)',
              }}
            >
              {/* Image */}
              <div style={{
                position: 'relative', width: '100%', height: 130,
                borderRadius: 10, overflow: 'hidden',
                background: '#f5fdf7',
                boxShadow: 'inset 0 0 0 1px rgba(13,17,23,0.06)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/${p.img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  display: 'inline-flex', alignItems: 'center',
                  padding: '4px 8px', borderRadius: 6,
                  background: ls.bg, color: ls.color,
                  font: `900 9px/1 ${RZ.fontUI}`, letterSpacing: '.06em',
                  boxShadow: `0 3px 8px ${ls.shadow}`,
                }}>{p.label}</div>
              </div>

              {/* Category chip */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 8px', borderRadius: 5,
                background: RZ.greenTint, color: RZ.greenDark,
                font: `700 9.5px/1 ${RZ.fontUI}`, letterSpacing: '.05em',
                alignSelf: 'flex-start',
              }}>{p.cat}</div>

              {/* Name */}
              <div style={{ font: `700 14px/1.25 ${RZ.fontDisplay}`, color: RZ.black }}>{p.name}</div>

              {/* Earn row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Earn</span>
                <span style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.green, letterSpacing: '-0.01em' }}>{p.rm}</span>
                <span style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.muted }}>·</span>
                <span style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.body }}>{p.c}</span>
              </div>
            </div>
          );
        })}
      </div>

      <TabBar/>
    </div>
  );
}

// ─── ProductDetailScreen ──────────────────────────────────────────────────────

function ProductDetailScreen({ product, onBack }: { product: Product; onBack: () => void }) {
  const p = product;

  const galleryPool = ['product-beauty.jpg', 'product-accessory.jpg', 'product-home.jpg', 'product-tech.jpg'];
  const gallery = [p.img, ...galleryPool.filter(g => g !== p.img)].slice(0, 4);

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [variant, setVariant] = useState('30ml · Original');
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyStep, setApplyStep] = useState<'variant' | 'channel'>('variant');

  const closeApply = () => {
    setApplyOpen(false);
    setTimeout(() => setApplyStep('variant'), 320);
  };

  // Auto-advance gallery
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSlide(i => (i + 1) % gallery.length), 5000);
    return () => clearInterval(id);
  }, [paused, gallery.length]);

  // Swipe state
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null);
  const galleryWidthRef = useRef(0);
  const galleryWrapRef = useRef<HTMLDivElement>(null);

  const onGalDown = (clientX: number) => {
    setPaused(true);
    galleryWidthRef.current = galleryWrapRef.current?.clientWidth || 0;
    setDrag({ startX: clientX, dx: 0 });
  };
  const onGalMove = (clientX: number) => {
    if (drag) setDrag(d => d ? { ...d, dx: clientX - d.startX } : null);
  };
  const onGalUp = () => {
    if (!drag) return;
    const threshold = Math.max(40, galleryWidthRef.current * 0.18);
    if (drag.dx < -threshold) setSlide(s => (s + 1) % gallery.length);
    else if (drag.dx > threshold) setSlide(s => (s - 1 + gallery.length) % gallery.length);
    setDrag(null);
  };
  const dragPct = drag ? (drag.dx / Math.max(1, galleryWidthRef.current)) * 100 : 0;

  // Pricing
  const retailNum = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 150;
  const saleNum = Math.round(retailNum * 0.65 * 100) / 100;
  const discountPct = Math.round((1 - saleNum / retailNum) * 100);

  const shop = {
    name: 'Lumina Beauty', handle: '@luminabeauty', verified: true,
    rating: 4.8, products: 128, followers: '24.3K', live: true,
  };

  const variants = ['30ml · Original', '50ml · Original', '30ml · Fragrance-free', '50ml · Fragrance-free'];

  const earnNum = parseFloat(p.rm.replace(/[^0-9.]/g, ''));

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: RZ.canvas, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── 1. IMAGE GALLERY ── */}
      <div
        ref={galleryWrapRef}
        style={{
          position: 'relative', background: '#fff', overflow: 'hidden',
          touchAction: 'pan-y', cursor: drag ? 'grabbing' : 'grab', flexShrink: 0,
        }}
        onTouchStart={(e) => onGalDown(e.touches[0].clientX)}
        onTouchMove={(e) => onGalMove(e.touches[0].clientX)}
        onTouchEnd={onGalUp}
        onMouseDown={(e) => { e.preventDefault(); onGalDown(e.clientX); }}
        onMouseMove={(e) => onGalMove(e.clientX)}
        onMouseUp={onGalUp}
        onMouseLeave={onGalUp}
      >
        <div style={{
          display: 'flex', width: '100%', height: 360,
          transform: `translateX(calc(-${slide * 100}% + ${dragPct}%))`,
          transition: drag ? 'none' : 'transform .42s cubic-bezier(.2,.9,.3,1)',
          willChange: 'transform',
        }}>
          {gallery.map((src, i) => (
            <div key={i} style={{ flex: '0 0 100%', height: '100%', background: '#f5fdf7' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/${src}`} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}/>
            </div>
          ))}
        </div>

        {/* Back button */}
        <button onClick={onBack} style={{
          position: 'absolute', top: 56, left: 16, width: 38, height: 38, borderRadius: 999,
          background: 'rgba(255,255,255,0.95)', border: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
        }}>
          <Icon name="chevL" size={18} color={RZ.black}/>
        </button>

        {/* Share + heart */}
        <div style={{ position: 'absolute', top: 56, right: 16, display: 'flex', gap: 8 }}>
          <button style={{
            width: 38, height: 38, borderRadius: 999,
            background: 'rgba(255,255,255,0.95)', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/>
              <path d="M16 6l-4-4-4 4"/>
              <path d="M12 2v13"/>
            </svg>
          </button>
          <button style={{
            width: 38, height: 38, borderRadius: 999,
            background: 'rgba(255,255,255,0.95)', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="heart" size={16} color={RZ.black}/>
          </button>
        </div>

        {/* Slide counter */}
        <div style={{
          position: 'absolute', bottom: 14, right: 14,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(13,17,23,0.6)', backdropFilter: 'blur(6px)',
          color: '#fff', font: `700 11px/1 ${RZ.fontUI}`, letterSpacing: '.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>{slide + 1}/{gallery.length}</div>

        {/* Dot pagination */}
        <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
          {gallery.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setSlide(i); setPaused(true); }} aria-label={`image ${i + 1}`} style={{
              width: i === slide ? 18 : 6, height: 6, borderRadius: 3, border: 0, padding: 0,
              background: i === slide ? '#fff' : 'rgba(255,255,255,0.6)',
              transition: 'width .25s', cursor: 'pointer',
            }}/>
          ))}
        </div>

        {/* Auto-play bar */}
        {!paused && (
          <div key={slide} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.18)' }}>
            <div style={{ height: '100%', background: '#fff', width: '100%', transformOrigin: 'left', animation: 'pdAutoBar 5s linear forwards' }}/>
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 110 }}>

        {/* ── 2. PRICE + TITLE ── */}
        <div style={{ background: '#fff', padding: '14px 16px 16px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 8px', borderRadius: 5,
            background: RZ.greenTint, color: RZ.greenDark,
            font: `700 9.5px/1 ${RZ.fontUI}`, letterSpacing: '.05em',
          }}>{p.cat}</div>

          <div style={{ font: `800 20px/1.25 ${RZ.fontDisplay}`, color: RZ.black, marginTop: 8, marginBottom: 10, letterSpacing: '-0.01em' }}>{p.name}</div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ font: `700 14px/1 ${RZ.fontDisplay}`, color: '#e8005a' }}>RM</span>
              <span style={{ font: `900 30px/1 ${RZ.fontDisplay}`, color: '#e8005a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{saleNum.toFixed(2)}</span>
            </div>
            <span style={{ font: `500 13px/1.2 ${RZ.fontUI}`, color: RZ.muted, textDecoration: 'line-through', paddingBottom: 2 }}>RM {retailNum.toFixed(2)}</span>
            <span style={{
              padding: '3px 7px', borderRadius: 4,
              background: '#ffe5ed', color: '#e8005a',
              font: `900 10px/1 ${RZ.fontUI}`, letterSpacing: '.02em',
              marginBottom: 2,
            }}>-{discountPct}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, font: `700 11.5px/1 ${RZ.fontUI}`, color: RZ.black }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5a623"><path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.7L6 22l1.5-7.2L2 10l7.1-1.1z"/></svg>
              4.9 <span style={{ color: RZ.muted, fontWeight: 500 }}>(1.2K)</span>
            </div>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: RZ.border }}/>
            <div style={{ font: `500 11.5px/1 ${RZ.fontUI}`, color: RZ.muted }}>42K sold</div>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: RZ.border }}/>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, font: `500 11.5px/1 ${RZ.fontUI}`, color: RZ.green }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9h13l3 3v6H3z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
              </svg>
              Free shipping
            </div>
          </div>
        </div>

        {/* ── 3. CREATOR EARNINGS ── */}
        <div style={{ background: '#fff', borderTop: `8px solid ${RZ.canvas}`, padding: '16px 16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ font: `900 10.5px/1 ${RZ.fontUI}`, color: '#00854f', letterSpacing: '.1em' }}>YOUR EARNINGS</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(0,192,115,0.2)' }}/>
          </div>

          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #00c073 0%, #25f4ee 100%)',
            borderRadius: 18, padding: '20px 18px',
            boxShadow: '0 18px 40px rgba(0,192,115,0.32), 0 4px 10px rgba(37,244,238,0.18)',
          }}>
            <div aria-hidden="true" style={{ position: 'absolute', top: -20, right: -20, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.35), rgba(255,255,255,0) 65%)' }}/>
            <div aria-hidden="true" style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 60%)' }}/>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ font: `700 11px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.92)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Earn per sale</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ font: `700 18px/1 ${RZ.fontDisplay}`, color: '#fff' }}>RM</span>
                  <span style={{ font: `900 46px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 4px 12px rgba(0,0,0,0.18)', fontVariantNumeric: 'tabular-nums' }}>{p.rm.replace(/^RM\s*/, '')}</span>
                </div>
                <div style={{ font: `600 12px/1.3 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.92)', marginTop: 6 }}>= <b style={{ color: '#fff' }}>{p.c}</b> commission rate</div>
              </div>
              <div style={{
                background: 'rgba(13,17,23,0.32)', backdropFilter: 'blur(8px)',
                borderRadius: 12, padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.25)',
                textAlign: 'center', flexShrink: 0,
              }}>
                <div style={{ font: `700 9px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.85)', letterSpacing: '.1em', marginBottom: 4 }}>YOUR TIER</div>
                <div style={{ font: `900 18px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.01em' }}>★ 3</div>
                <div style={{ font: `600 9.5px/1 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>+3% boost</div>
              </div>
            </div>

            <div style={{ position: 'relative', marginTop: 16, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ font: `600 11.5px/1.3 ${RZ.fontUI}`, color: '#fff' }}>Sell <b>100 units</b> this month</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: `900 14px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.01em' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H9M17 7v8"/>
                </svg>
                RM {(earnNum * 100).toFixed(0)}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. SHOP CARD ── */}
        <div style={{ margin: '8px 0', background: '#fff', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg,#f5a623,#e8005a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', font: `900 20px/1 ${RZ.fontDisplay}`,
                border: shop.live ? '2.5px solid #e8005a' : '2.5px solid #fff',
              }}>{shop.name.charAt(0)}</div>
              {shop.live && (
                <span style={{
                  position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                  padding: '2px 6px', borderRadius: 4,
                  background: '#e8005a', color: '#fff',
                  font: `900 8px/1 ${RZ.fontUI}`, letterSpacing: '.08em',
                  boxShadow: '0 2px 6px rgba(232,0,90,0.4)',
                }}>LIVE</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ font: `800 14.5px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>{shop.name}</div>
                {shop.verified && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={RZ.green}>
                    <path d="M12 2l2.4 2.2 3.2-.4.5 3.2L21 8.5l-1.4 2.9 1.4 2.9-2.9 1.5-.5 3.2-3.2-.4L12 21l-2.4-2.2-3.2.4-.5-3.2L3 14.4l1.4-2.9L3 8.6 5.9 7l.5-3.2 3.2.4z"/>
                    <path d="M8.5 12.3l2.4 2.4L15.7 9.8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted }}>★ {shop.rating}</span>
                <span style={{ width: 2, height: 2, borderRadius: '50%', background: RZ.border }}/>
                <span style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted }}>{shop.followers} followers</span>
                <span style={{ width: 2, height: 2, borderRadius: '50%', background: RZ.border }}/>
                <span style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted }}>98% reply rate</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                background: '#fff', color: '#e8005a',
                border: '1.5px solid #e8005a',
                font: `800 11px/1 ${RZ.fontUI}`,
              }}>+ Follow</button>
              <button style={{
                padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                background: '#fff', color: RZ.body,
                border: `1.5px solid ${RZ.border}`,
                font: `800 11px/1 ${RZ.fontUI}`,
              }}>View shop</button>
            </div>
          </div>
        </div>

        {/* ── 5. REVIEWS ── */}
        <div style={{ background: '#fff', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.black }}>Ratings &amp; Reviews <span style={{ color: RZ.muted, fontWeight: 500 }}>(1.2K)</span></div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `700 12px/1 ${RZ.fontUI}`, color: '#e8005a' }}>
              See all <Icon name="chevR" size={12} color="#e8005a"/>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0 14px', borderBottom: `1px dashed ${RZ.border}` }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: `900 32px/1 ${RZ.fontDisplay}`, color: RZ.black }}>4.9</div>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {[0,1,2,3,4].map(i => (
                  <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="#f5a623">
                    <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.7L6 22l1.5-7.2L2 10l7.1-1.1z"/>
                  </svg>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { n: 5, pct: 0.88 },
                { n: 4, pct: 0.09 },
                { n: 3, pct: 0.02 },
                { n: 2, pct: 0.005 },
                { n: 1, pct: 0.005 },
              ].map(r => (
                <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: `600 10px/1 ${RZ.fontUI}`, color: RZ.muted, width: 14, textAlign: 'right' }}>{r.n}</span>
                  <div style={{ flex: 1, height: 4, background: RZ.canvas, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${r.pct * 100}%`, height: '100%', background: '#f5a623', borderRadius: 2 }}/>
                  </div>
                  <span style={{ font: `500 10px/1 ${RZ.fontUI}`, color: RZ.muted, width: 28 }}>{Math.round(r.pct * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {[
            { name: 'Nadia R.', variant: '30ml · Original', rating: 5, body: 'Skin feels brighter after 2 weeks — no breakouts. My TikTok audience loved it, posted a before/after.', helpful: 128 },
            { name: 'Aminah K.', variant: '50ml · Fragrance-free', rating: 5, body: 'Gentle on sensitive skin. Shipped in 2 days. Will repurchase.', helpful: 64 },
          ].map((r, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i === 0 ? `1px dashed ${RZ.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#25f4ee,#e8005a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', font: `800 10px/1 ${RZ.fontUI}` }}>{r.name.charAt(0)}</div>
                <span style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.black }}>{r.name}</span>
                <div style={{ display: 'flex', gap: 1 }}>
                  {[0,1,2,3,4].map(s => (
                    <svg key={s} width="9" height="9" viewBox="0 0 24 24" fill="#f5a623">
                      <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.7L6 22l1.5-7.2L2 10l7.1-1.1z"/>
                    </svg>
                  ))}
                </div>
              </div>
              <div style={{ font: `500 10.5px/1 ${RZ.fontUI}`, color: RZ.muted, marginBottom: 6 }}>Variation: {r.variant}</div>
              <div style={{ font: `500 12.5px/1.5 ${RZ.fontUI}`, color: RZ.body }}>{r.body}</div>
              <div style={{ font: `500 10.5px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 6 }}>👍 {r.helpful} found this helpful</div>
            </div>
          ))}
        </div>

        {/* ── 6. REQUIREMENTS ── */}
        <div style={{ marginTop: 8, background: '#fff', padding: '14px 16px' }}>
          <div style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.black, marginBottom: 10 }}>Creator Requirements</div>
          {[
            'Min. 1,000 TikTok followers',
            'Post within 7 days of sample delivery',
            'Must tag @luminabeauty',
            'Shipping to Malaysia only',
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? `1px dashed ${RZ.border}` : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: RZ.greenTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="check" size={14} color={RZ.green} strokeWidth={3}/>
              </div>
              <div style={{ font: `500 13px/1.4 ${RZ.fontUI}`, color: RZ.body }}>{t}</div>
            </div>
          ))}
        </div>

        {/* ── 7. DESCRIPTION ── */}
        <div style={{ marginTop: 8, background: '#fff', padding: '14px 16px' }}>
          <div style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.black, marginBottom: 10 }}>Product Description</div>
          <div style={{ font: `400 13px/1.6 ${RZ.fontUI}`, color: RZ.body }}>
            Vitamin C + Niacinamide serum. Brightens dull skin in 4 weeks. Best for creators in skincare, beauty and lifestyle niches. 58 creators earning this month.
          </div>
        </div>
      </div>

      {/* ── 8. STICKY BOTTOM BAR ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5,
        padding: '10px 16px 28px', background: RZ.white,
        borderTop: `1px solid ${RZ.border}`, display: 'flex', gap: 10, alignItems: 'center',
      }}>
        {/* Sample button */}
        <button
          onClick={() => { setApplyStep('variant'); setApplyOpen(true); }}
          aria-label="Apply for sample"
          style={{
            width: 56, height: 52, borderRadius: 12, cursor: 'pointer',
            background: '#fff', border: `1.5px solid ${RZ.green}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            boxShadow: '0 4px 10px rgba(0,192,115,0.18)',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1"/>
            <path d="M9 13l2 2 4-4"/>
          </svg>
          <span style={{ font: `800 8.5px/1 ${RZ.fontUI}`, color: RZ.green, letterSpacing: '.02em' }}>Sample</span>
        </button>

        {/* Add to Showcase */}
        <button style={{
          flex: 1, height: 52, borderRadius: 14, border: 0, cursor: 'pointer',
          background: 'linear-gradient(135deg, #00c073 0%, #0abdb8 100%)',
          color: '#fff', font: `800 15px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.005em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 10px 24px rgba(0,192,115,0.36)',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add to Showcase
        </button>
      </div>

      {/* ── 9. APPLY-FOR-SAMPLE SHEET ── */}
      {applyOpen && (
        <div onClick={closeApply} style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          animation: 'pdSheetFade .22s ease-out',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#fff',
            borderTopLeftRadius: 22, borderTopRightRadius: 22,
            padding: '14px 18px 34px',
            animation: 'pdSheetIn .35s cubic-bezier(.2,1.2,.4,1)',
            boxShadow: '0 -20px 60px rgba(13,17,23,0.25)',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 14px' }}/>

            {applyStep === 'variant' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/${p.img}`} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `800 14px/1.25 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
                      <span style={{ font: `900 18px/1 ${RZ.fontDisplay}`, color: '#e8005a', fontVariantNumeric: 'tabular-nums' }}>RM {saleNum.toFixed(2)}</span>
                      <span style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, textDecoration: 'line-through' }}>RM {retailNum.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={closeApply} aria-label="close" style={{ width: 28, height: 28, borderRadius: 8, border: 0, background: '#f1f4f7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.8" strokeLinecap="round">
                      <path d="M6 6l12 12M6 18L18 6"/>
                    </svg>
                  </button>
                </div>

                <div style={{ font: `800 12px/1 ${RZ.fontUI}`, color: RZ.black, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Choose Variation</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {variants.map(v => {
                    const isActive = v === variant;
                    return (
                      <button key={v} onClick={() => setVariant(v)} style={{
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        background: isActive ? '#ffe5ed' : RZ.canvas,
                        border: isActive ? '1.5px solid #e8005a' : '1.5px solid transparent',
                        color: isActive ? '#e8005a' : RZ.body,
                        font: `700 12.5px/1 ${RZ.fontUI}`,
                      }}>{v}</button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setApplyStep('channel')}
                  style={{
                    width: '100%', height: 52, borderRadius: 14, border: 0, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #00c073 0%, #0abdb8 100%)',
                    color: '#fff', font: `800 15px/1 ${RZ.fontDisplay}`,
                    boxShadow: '0 10px 24px rgba(0,192,115,0.32)',
                  }}
                >
                  Continue
                </button>
              </>
            )}

            {applyStep === 'channel' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <button onClick={() => setApplyStep('variant')} aria-label="back" style={{ width: 28, height: 28, borderRadius: 8, border: 0, background: '#f1f4f7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="chevL" size={14} color={RZ.black}/>
                  </button>
                  <div style={{ font: `800 16px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>How Do You Want To Apply?</div>
                </div>
                <div style={{ font: `500 12px/1.4 ${RZ.fontUI}`, color: RZ.muted, margin: '8px 0 16px', paddingLeft: 36 }}>
                  Picked: <b style={{ color: RZ.black }}>{variant}</b>
                </div>

                {/* TikTok channel */}
                <button style={{
                  width: '100%', padding: '14px',
                  borderRadius: 14, marginBottom: 10,
                  background: 'linear-gradient(135deg, #0d1117 0%, #1a2433 100%)',
                  border: 0, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: '0 12px 24px rgba(13,17,23,0.32)',
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#0d1117">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.87a8.18 8.18 0 004.78 1.52V7.01a4.85 4.85 0 01-1.01-.32z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ font: `800 14px/1.2 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.005em' }}>Apply Through TikTok</span>
                      <span style={{ padding: '2px 7px', borderRadius: 4, background: '#25f4ee', color: '#0d1117', font: `900 9px/1 ${RZ.fontUI}`, letterSpacing: '.06em' }}>FASTER</span>
                    </div>
                    <div style={{ font: `500 11.5px/1.4 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.78)', marginTop: 4 }}>Faster approval · synced with your TikTok creator account</div>
                  </div>
                  <Icon name="chevR" size={16} color="#fff"/>
                </button>

                {/* Agency channel */}
                <button style={{
                  width: '100%', padding: '14px',
                  borderRadius: 14,
                  background: '#fff', border: `1.5px solid ${RZ.border}`,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: RZ.greenTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21l1.65-3.8a9 9 0 113.4 2.9L3 21"/>
                      <circle cx="12" cy="12" r="3.2"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `800 14px/1.2 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.005em' }}>Apply With Agency</div>
                    <div style={{ font: `500 11.5px/1.4 ${RZ.fontUI}`, color: RZ.muted, marginTop: 4 }}>Manual approve · reviewed by your agency manager within 48h</div>
                  </div>
                  <Icon name="chevR" size={16} color={RZ.muted}/>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pdAutoBar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes pdSheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes pdSheetFade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: RZ.canvas,
      overflow: 'hidden', position: 'relative',
    }}>
      <BrowseScreen onOpenProduct={(p) => setSelectedProduct(p)}/>

      {selectedProduct && (
        <ProductDetailScreen
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
