'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';

const initialItems = [
  { type: 'approved',   t: 'Sample approved',       d: 'Glow Vitamin C Serum is on its way -- expect delivery Fri.', ago: '2m',        unread: true,  tone: 'green' },
  { type: 'payout',     t: 'Payout landed',          d: 'RM 428.50 sent to Maybank **4291. Tap to download receipt.', ago: '1h',        unread: true,  tone: 'warm' },
  { type: 'campaign',   t: 'New campaign . Skintific',d: 'Paid brief: 1 TikTok, 15-30s, #skintific. Earn RM 80 flat.',ago: '3h',        unread: true,  tone: 'cyan' },
  { type: 'commission', t: 'Commission earned',       d: '+RM 14.20 from Nasi Lemak Sambal Paste . 3 units.',          ago: 'yesterday', unread: false, tone: 'green' },
  { type: 'review',     t: 'Post reached 10K views', d: 'Your ProBuds 2 review crossed 10K -- keep it up.',           ago: '2d',        unread: false, tone: 'warm' },
  { type: 'approved',   t: 'Sample shipped',          d: 'Skintific 5X Ceramide Serum dispatched via J&T.',            ago: '2d',        unread: false, tone: 'green' },
  { type: 'system',     t: 'Verify your payout bank', d: 'Add Maybank or CIMB details before your first withdrawal.',  ago: '4d',        unread: false, tone: 'muted' },
];

const toneBg: Record<string, string> = {
  green: RZ.green,
  warm:  '#e8005a',
  cyan:  RZ.cyanText,
  muted: RZ.body,
};

const iconFor: Record<string, 'pkg' | 'wallet' | 'sparkles' | 'trend' | 'play' | 'bell'> = {
  approved:   'pkg',
  payout:     'wallet',
  campaign:   'sparkles',
  commission: 'trend',
  review:     'play',
  system:     'bell',
};

function NotifRow({ it, onRead }: { it: typeof initialItems[0]; onRead: () => void }) {
  return (
    <div
      onClick={onRead}
      style={{
        background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 14,
        padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10,
        position: 'relative', cursor: 'pointer',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: toneBg[it.tone], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={iconFor[it.type]} size={20} color={RZ.white} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <div style={{ font: `700 14px/1.2 ${RZ.fontUI}`, color: RZ.black, letterSpacing: '-0.005em' }}>{it.t}</div>
          <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, flexShrink: 0 }}>{it.ago}</div>
        </div>
        <div style={{ font: `400 12.5px/1.45 ${RZ.fontUI}`, color: RZ.body }}>{it.d}</div>
      </div>
      {it.unread && (
        <div style={{ position: 'absolute', top: 16, right: 14, width: 8, height: 8, borderRadius: 999, background: RZ.green }} />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  const markAllRead = () => setItems(items.map(it => ({ ...it, unread: false })));
  const markRead = (idx: number) => setItems(items.map((it, i) => i === idx ? { ...it, unread: false } : it));

  const todayItems = items.slice(0, 3);
  const earlierItems = items.slice(3);

  return (
    <div style={{ flex: 1, background: RZ.canvas, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px', background: RZ.white, borderBottom: `1px solid ${RZ.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${RZ.border}`, background: RZ.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="chevL" size={18} color={RZ.black} />
          </button>
          <div style={{ font: `800 22px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em', flex: 1 }}>Notifications</div>
          <button
            onClick={markAllRead}
            style={{ font: `600 12px/1 ${RZ.fontUI}`, color: RZ.green, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 100px' }}>
        <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '8px 4px 8px' }}>Today</div>
        {todayItems.map((it, i) => (
          <NotifRow key={i} it={it} onRead={() => markRead(i)} />
        ))}
        <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.08em', margin: '20px 4px 8px' }}>Earlier</div>
        {earlierItems.map((it, i) => (
          <NotifRow key={i + 3} it={it} onRead={() => markRead(i + 3)} />
        ))}
      </div>
    </div>
  );
}
