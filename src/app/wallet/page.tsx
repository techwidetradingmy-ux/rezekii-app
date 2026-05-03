'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

interface Txn {
  t: string;
  d: string;
  amt: string;
  tone: 'in' | 'out';
}

const txns: Txn[] = [
  { t: 'Payout . Maybank **4291',         d: 'Apr 15 . 14:32', amt: '-RM 428.50', tone: 'out' },
  { t: 'Commission . Nasi Lemak Sambal',  d: 'Apr 13',         amt: '+RM 14.20',  tone: 'in'  },
  { t: 'Flat fee . Skintific campaign',   d: 'Apr 11',         amt: '+RM 80.00',  tone: 'in'  },
  { t: 'Commission . ProBuds 2',          d: 'Apr 08',         amt: '+RM 38.40',  tone: 'in'  },
  { t: 'Payout . Maybank **4291',         d: 'Apr 01 . 09:05', amt: '-RM 612.00', tone: 'out' },
  { t: 'Commission . Glow Serum',         d: 'Mar 29',         amt: '+RM 22.50',  tone: 'in'  },
];

export default function WalletPage() {
  const router = useRouter();

  return (
    <div style={{ flex: 1, background: RZ.canvas, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header + action row */}
      <div style={{ flexShrink: 0, position: 'relative', paddingBottom: 36 }}>
        <div style={{ background: RZ.black, padding: '56px 20px 44px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="chevL" size={18} color={RZ.white} />
            </button>
            <div style={{ font: `800 18px/1 ${RZ.fontDisplay}`, color: RZ.white, flex: 1 }}>Wallet</div>
            <Icon name="share" size={20} color={RZ.white} />
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', font: `500 12px/1 ${RZ.fontUI}`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              Available balance
            </div>
            <div style={{ color: RZ.white, font: `800 40px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              RM 1,638.70
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(0,192,115,0.22)', color: RZ.green, font: `700 11px/1 ${RZ.fontUI}` }}>
                <Icon name="arrowUpRight" size={12} color={RZ.green} /> +RM 155.10 this week
              </div>
            </div>
          </div>
        </div>
        {/* Action row -- straddles header/body */}
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 0, background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 18, padding: 12, display: 'flex', gap: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}>
          <button style={{ flex: 1, height: 48, borderRadius: 12, background: RZ.green, color: RZ.white, border: 0, font: `700 13px/1 ${RZ.fontUI}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
            <Icon name="arrowUpRight" size={15} color={RZ.white} /> Withdraw
          </button>
          <button style={{ flex: 1, height: 48, borderRadius: 12, background: RZ.canvas, color: RZ.black, border: `1.5px solid ${RZ.border}`, font: `700 13px/1 ${RZ.fontUI}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
            <Icon name="filter" size={15} color={RZ.black} /> Statement
          </button>
        </div>
      </div>

      {/* Payout method */}
      <div style={{ padding: '20px 16px 0', flexShrink: 0 }}>
        <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, paddingLeft: 4 }}>
          Payout method
        </div>
        <div style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 34, borderRadius: 6, background: '#ffd400', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 10px/1 ${RZ.fontDisplay}`, color: '#000' }}>MBB</div>
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 13px/1 ${RZ.fontUI}`, color: RZ.black }}>Maybank ** 4291</div>
            <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>Default . verified</div>
          </div>
          <Icon name="chevR" size={16} color={RZ.muted} />
        </div>
      </div>

      {/* Transactions */}
      <div style={{ padding: '20px 16px 32px', flex: 1, overflow: 'auto' }}>
        <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, paddingLeft: 4 }}>
          Recent activity
        </div>
        {txns.map((x, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 12, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: x.tone === 'in' ? RZ.greenTint : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon
                name={x.tone === 'in' ? 'arrowUpRight' : 'wallet'}
                size={16}
                color={x.tone === 'in' ? RZ.greenDark : '#e8005a'}
                style={x.tone === 'in' ? { transform: 'rotate(180deg)' } : undefined}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 13px/1.2 ${RZ.fontUI}`, color: RZ.black, letterSpacing: '-0.005em' }}>{x.t}</div>
              <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>{x.d}</div>
            </div>
            <div style={{ font: `800 13.5px/1 ${RZ.fontDisplay}`, color: x.tone === 'in' ? RZ.greenDark : RZ.black, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em' }}>
              {x.amt}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
