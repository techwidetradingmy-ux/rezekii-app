'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';
import RzInput from '@/components/ui/RzInput';
import RzTag from '@/components/ui/RzTag';
import TabBar from '@/components/ui/TabBar';
import MobileFrame from '@/components/layout/MobileFrame';
import { products, type Product } from '@/lib/mock-data';

// Local label palette — pixel-matches design source `Screens4-5.jsx`.
const LABEL_STYLES: Record<NonNullable<Product['label']>, { bg: string; color: string; shadow: string }> = {
  'BEST SELLER': { bg: 'linear-gradient(135deg,#f5a623,#ff7a1a)', color: '#fff', shadow: 'rgba(245,166,35,0.38)' },
  'HOT SELLING': { bg: 'linear-gradient(135deg,#e8005a,#ff4d8d)', color: '#fff', shadow: 'rgba(232,0,90,0.38)' },
  'NEW ARRIVAL': { bg: 'linear-gradient(135deg,#00c073,#0abdb8)', color: '#fff', shadow: 'rgba(0,192,115,0.38)' },
};

const CATS = ['All', 'Beauty', 'Food', 'Tech', 'Fashion', 'Home'] as const;

// Map product categories to our /public hero photos.
function imgForCategory(cat: Product['category']): string {
  switch (cat) {
    case 'Beauty':  return '/product-beauty.jpg';
    case 'Food':    return '/product-food.jpg';
    case 'Tech':    return '/product-tech.jpg';
    case 'Fashion': return '/product-fashion.jpg';
    case 'Home':    return '/product-home.jpg';
    default:        return '/product-accessory.jpg';
  }
}

export default function MarketplacePage() {
  const router = useRouter();
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');

  const filtered = cat === 'All' ? products : products.filter((p) => p.category === cat);

  return (
    <MobileFrame>
      <div style={{
        flex: 1, background: RZ.canvas,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '56px 20px 12px', background: RZ.white,
          borderBottom: `1px solid ${RZ.border}`,
        }}>
          <div style={{
            font: `800 26px/1 ${RZ.fontDisplay}`, color: RZ.black,
            letterSpacing: '-0.01em', marginBottom: 14,
          }}>
            Browse
          </div>
          <RzInput
            placeholder="Search products, brands"
            leadingIcon={<Icon name="search" size={18} />}
          />
        </div>

        {/* Category chips */}
        <div
          className="no-scrollbar"
          style={{
            padding: '12px 20px', display: 'flex', gap: 8, overflowX: 'auto',
            background: RZ.white, flexShrink: 0,
          }}
        >
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                padding: '8px 16px', borderRadius: 999, border: 0, cursor: 'pointer',
                background: cat === c ? RZ.black : RZ.canvas,
                color: cat === c ? RZ.white : RZ.body,
                font: `700 13px/1 ${RZ.fontUI}`, flexShrink: 0,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 20px 20px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {filtered.map((p) => {
            const label = p.label ?? 'NEW ARRIVAL';
            const ls = LABEL_STYLES[label];
            const img = imgForCategory(p.category);
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/marketplace/${p.id}`)}
                className="tap-target"
                style={{
                  background: RZ.white, borderRadius: 16, padding: 10,
                  display: 'flex', flexDirection: 'column', gap: 8,
                  position: 'relative',
                  border: `1.5px solid ${RZ.border}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
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
                  <img
                    src={img}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {p.label && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      display: 'inline-flex', alignItems: 'center',
                      padding: '4px 8px', borderRadius: 6,
                      background: ls.bg, color: ls.color,
                      font: `900 9px/1 ${RZ.fontUI}`, letterSpacing: '.06em',
                      boxShadow: `0 3px 8px ${ls.shadow}`,
                    }}>
                      {p.label}
                    </div>
                  )}
                </div>

                {/* Category chip */}
                <RzTag tone="green">{p.category}</RzTag>

                {/* Name */}
                <div style={{
                  font: `700 14px/1.25 ${RZ.fontDisplay}`,
                  color: RZ.black,
                }}>
                  {p.name}
                </div>

                {/* Earn row */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 5,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <span style={{
                    font: `700 12px/1 ${RZ.fontUI}`, color: RZ.muted,
                    textTransform: 'uppercase', letterSpacing: '.06em',
                  }}>
                    Earn
                  </span>
                  <span style={{
                    font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.green,
                    letterSpacing: '-0.01em',
                  }}>
                    RM {p.commissionRM.toFixed(2)}
                  </span>
                  <span style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.muted }}>·</span>
                  <span style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.body }}>
                    {p.commissionRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TabBar />
    </MobileFrame>
  );
}
