'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RZ } from '@/lib/rz';
import Icon from '@/components/ui/Icon';
import TabBar from '@/components/ui/TabBar';

const types = ['All', 'Awareness', 'Affiliate', 'Store Visit'];

const campaigns = [
  { brand: 'Skintific',       title: 'Ceramide Serum launch',     type: 'Awareness',   pay: 'RM 80 flat',          metric: '1 post . 15-30s',      slotsTaken: 90,  slotsTotal: 100, expires: '11 Dec 25', featured: true, tone: 'warm',   img: '/product-beauty.jpg',   tagline: 'Glow-up launch . paid TikTok brief' },
  { brand: 'Maybank TAP',     title: 'Get paid as a creator',     type: 'Awareness',   pay: 'RM 50 flat',          metric: '1 post + 1 story',     slotsTaken: 62,  slotsTotal: 100, expires: '05 Dec 25', featured: false, tone: 'cyan',  img: '/product-tech.jpg',     tagline: 'Fintech creators . Malaysia-wide' },
  { brand: 'Kampung Kitchen', title: 'Cook + review sambal',      type: 'Affiliate',   pay: 'up to 18%',           metric: 'commission . GMV',     slotsTaken: 24,  slotsTotal: 100, expires: '28 Dec 25', featured: false, tone: 'green', img: '/product-food.jpg',     tagline: 'Home-cook content . recipe demo' },
  { brand: 'AudioMY',         title: 'ProBuds 2 unboxing',        type: 'Affiliate',   pay: 'up to 12%',           metric: 'commission . GMV',     slotsTaken: 48,  slotsTotal: 100, expires: '20 Dec 25', featured: false, tone: 'cyan',  img: '/product-tech.jpg',     tagline: 'Tech reviewers . 30-day fresh drop' },
  { brand: 'Mr DIY Bangsar',  title: 'Visit & vlog new flagship', type: 'Store Visit', pay: 'RM 120 + RM 5/visit', metric: '1 vlog . check-in',    slotsTaken: 18,  slotsTotal: 50,  expires: '22 Dec 25', featured: false, tone: 'purple',img: '/product-tech.jpg',     tagline: 'Klang Valley creators . in-store vlog' },
  { brand: 'Basics KL',       title: 'Oversized tee haul',        type: 'Affiliate',   pay: 'up to 15%',           metric: 'commission . GMV',     slotsTaken: 37,  slotsTotal: 100, expires: '15 Dec 25', featured: false, tone: 'warm',  img: '/product-fashion.jpg',  tagline: 'Streetwear haul . OOTD style' },
];

const toneColor: Record<string, string> = { warm: '#e8005a', cyan: RZ.cyanText, green: RZ.green, purple: '#7b3ff2' };
const toneGradient: Record<string, string> = {
  warm:   'linear-gradient(135deg,#e8005a 0%,#f5a623 100%)',
  cyan:   'linear-gradient(135deg,#0d1117 0%,#25f4ee 140%)',
  green:  'linear-gradient(135deg,#009a5c 0%,#00c073 100%)',
  purple: 'linear-gradient(135deg,#4b1d9e 0%,#9d5bf5 100%)',
};

type Campaign = typeof campaigns[0];

function CampaignDetailSheet({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: RZ.white, borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '14px 18px 40px', maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 16px' }} />

        {/* Banner */}
        <div style={{
          position: 'relative', height: 160, borderRadius: 16, overflow: 'hidden',
          background: toneGradient[campaign.tone], marginBottom: 16,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0) 70%)' }} />
          <div style={{ position: 'absolute', left: 16, bottom: 14, right: 80 }}>
            <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.22)', color: '#fff', font: `800 9px/1 ${RZ.fontUI}`, letterSpacing: '.08em', textTransform: 'uppercase', backdropFilter: 'blur(6px)', marginBottom: 6 }}>
              {campaign.type} . {campaign.brand}
            </div>
            <div style={{ color: '#fff', font: `800 18px/1.15 ${RZ.fontDisplay}`, letterSpacing: '-0.01em', marginBottom: 4, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{campaign.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.92)', font: `500 10.5px/1.3 ${RZ.fontUI}`, textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>{campaign.tagline}</div>
          </div>
          <div style={{ position: 'absolute', left: 16, top: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: '#fff', color: RZ.black, font: `900 10.5px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.01em', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span style={{ color: RZ.green }}>{campaign.pay}</span>
          </div>
        </div>

        <div style={{ font: `800 17px/1.2 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em', marginBottom: 4 }}>{campaign.title}</div>
        <div style={{ font: `500 12.5px/1.45 ${RZ.fontUI}`, color: RZ.body, marginBottom: 16 }}>
          Join this {campaign.type} campaign by <b style={{ color: RZ.black }}>{campaign.brand}</b>. {campaign.metric}.
        </div>

        {/* Slots & expiry */}
        <div style={{ background: RZ.canvas, borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ font: `600 10px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Slots left</span>
            <span style={{ font: `800 12.5px/1 ${RZ.fontDisplay}`, color: (campaign.slotsTotal - campaign.slotsTaken) <= 15 ? '#e8005a' : RZ.black }}>
              {campaign.slotsTotal - campaign.slotsTaken}/{campaign.slotsTotal}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((campaign.slotsTaken / campaign.slotsTotal) * 100)}%`, background: (campaign.slotsTotal - campaign.slotsTaken) <= 15 ? 'linear-gradient(90deg,#e8005a,#f5a623)' : RZ.green, borderRadius: 999 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: `500 11px/1 ${RZ.fontUI}`, color: RZ.body, marginTop: 10 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
            <span style={{ color: RZ.muted }}>Expires:</span>
            <span style={{ color: RZ.black, font: `700 11px/1 ${RZ.fontUI}` }}>{campaign.expires}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14,
            border: 0, cursor: 'pointer',
            background: RZ.green, color: RZ.white,
            font: `800 13.5px/1 ${RZ.fontUI}`, letterSpacing: '.04em',
            boxShadow: '0 6px 14px rgba(0,192,115,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          JOIN NOW
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function CampaignPage() {
  const [type, setType] = useState('All');
  const [explainOpen, setExplainOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const filtered = type === 'All' ? campaigns : campaigns.filter(c => c.type === type);

  return (
    <div style={{ flex: 1, background: RZ.canvas, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 0', background: RZ.white, borderBottom: `1px solid ${RZ.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ font: `800 26px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em' }}>Campaigns</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${RZ.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="search" size={18} color={RZ.body} />
            </div>
          </div>
        </div>

        {/* Explainer trigger */}
        <button
          onClick={() => setExplainOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            width: '100%', padding: '10px 12px', marginBottom: 14,
            background: RZ.canvas, border: `1px solid ${RZ.border}`,
            borderRadius: 12, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: RZ.white, border: `1px solid ${RZ.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <div>
              <div style={{ font: `700 12px/1.1 ${RZ.fontUI}`, color: RZ.black }}>Awareness . Affiliate . Store Visit</div>
              <div style={{ font: `500 11px/1.2 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>Tap to see what fits your channel</div>
            </div>
          </div>
          <Icon name="chevR" size={14} color={RZ.muted} />
        </button>

        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 14, overflowX: 'auto' }}>
          {types.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: '8px 14px', borderRadius: 999, flexShrink: 0,
              border: type === t ? 'none' : `1.5px solid ${RZ.border}`,
              background: type === t ? RZ.black : RZ.white,
              color: type === t ? RZ.white : RZ.body,
              font: `600 12px/1 ${RZ.fontUI}`, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 16px' }}>
        {filtered.map((c, i) => {
          const slotsLeft = c.slotsTotal - c.slotsTaken;
          const slotPct = Math.round((c.slotsTaken / c.slotsTotal) * 100);
          const urgent = slotsLeft <= 15;
          return (
            <div key={i} style={{
              background: RZ.white, border: `1.5px solid ${c.featured ? '#e8005a' : RZ.border}`,
              borderRadius: 18, marginBottom: 12, overflow: 'hidden',
              boxShadow: c.featured ? '0 8px 20px rgba(232,0,90,0.12)' : '0 2px 10px rgba(13,17,23,0.04)',
            }}>
              {/* Banner */}
              <div
                onClick={() => setSelectedCampaign(c)}
                style={{ position: 'relative', height: 120, cursor: 'pointer', background: toneGradient[c.tone], overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0) 70%)' }} />
                {c.featured && (
                  <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 9px', borderRadius: 999, background: '#fff', color: '#e8005a', font: `900 9px/1 ${RZ.fontUI}`, letterSpacing: '.08em', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.18)' }}>* Featured</div>
                )}
                <div style={{ position: 'absolute', left: 14, top: 12, right: 110, zIndex: 1 }}>
                  <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.22)', color: '#fff', font: `800 9px/1 ${RZ.fontUI}`, letterSpacing: '.08em', textTransform: 'uppercase', backdropFilter: 'blur(6px)', marginBottom: 6 }}>{c.type} . {c.brand}</div>
                  <div style={{ color: '#fff', font: `800 16px/1.15 ${RZ.fontDisplay}`, letterSpacing: '-0.01em', marginBottom: 4, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{c.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.92)', font: `500 10.5px/1.3 ${RZ.fontUI}`, textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>{c.tagline}</div>
                </div>
                <div style={{ position: 'absolute', left: 14, bottom: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: '#fff', color: RZ.black, font: `900 10.5px/1 ${RZ.fontDisplay}`, letterSpacing: '-0.01em', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  <span style={{ color: RZ.green }}>{c.pay}</span>
                </div>
              </div>

              {/* Meta */}
              <div style={{ padding: '12px 14px 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 5 }}>
                      <span style={{ font: `600 10px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Slot left:</span>
                      <span style={{ font: `800 12.5px/1 ${RZ.fontDisplay}`, color: urgent ? '#e8005a' : RZ.black, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{slotsLeft}/{c.slotsTotal}</span>
                    </div>
                    <div style={{ position: 'relative', height: 4, borderRadius: 999, background: RZ.canvas, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, right: 'auto', width: `${slotPct}%`, borderRadius: 999, background: urgent ? 'linear-gradient(90deg,#e8005a,#f5a623)' : RZ.green }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: `500 11px/1 ${RZ.fontUI}`, color: RZ.body, marginBottom: 10 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
                  <span style={{ color: RZ.muted }}>Campaign expired on:</span>
                  <span style={{ color: RZ.black, font: `700 11px/1 ${RZ.fontUI}` }}>{c.expires}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedCampaign(c); }}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12,
                    border: 0, cursor: 'pointer',
                    background: RZ.green, color: RZ.white,
                    font: `800 13px/1 ${RZ.fontUI}`, letterSpacing: '.04em',
                    boxShadow: '0 6px 14px rgba(0,192,115,0.32)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginBottom: 12,
                  }}
                >
                  JOIN NOW
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <TabBar active="campaign" />

      {/* Goal-type explainer sheet */}
      {explainOpen && (
        <div
          onClick={() => setExplainOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}
        >
          <style>{`
            @keyframes cgIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
            @keyframes cgFade { from { opacity: 0 } to { opacity: 1 } }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
              padding: '14px 18px 24px', maxHeight: '88vh', overflowY: 'auto',
              animation: 'cgIn .35s cubic-bezier(.2,1.2,.4,1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 14px' }} />
            <div style={{ font: `800 18px/1.2 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: '-0.01em', marginBottom: 4 }}>Which campaign fits you?</div>
            <div style={{ font: `500 12px/1.45 ${RZ.fontUI}`, color: RZ.muted, marginBottom: 16 }}>Different goals, different payouts. Pick the one your channel converts on.</div>

            {/* AWARENESS */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${RZ.border}`, marginBottom: 12 }}>
              <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg,#e8005a 0%,#f5a623 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `900 14px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.005em' }}>Awareness</div>
                  <div style={{ font: `600 10.5px/1.2 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.92)', marginTop: 3 }}>Branding exposure . pay per flat rate</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ font: `500 12px/1.5 ${RZ.fontUI}`, color: RZ.body, marginBottom: 10 }}>
                  Sellers want <b style={{ color: RZ.black }}>quality content + social proof</b>. They pay you a fixed fee for posting -- regardless of sales.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: RZ.canvas }}>
                    <div style={{ font: `700 9.5px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Payout</div>
                    <div style={{ font: `800 12px/1.2 ${RZ.fontDisplay}`, color: RZ.black }}>Flat rate . paid on delivery</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: RZ.canvas }}>
                    <div style={{ font: `700 9.5px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Best for</div>
                    <div style={{ font: `800 12px/1.2 ${RZ.fontDisplay}`, color: RZ.black }}>Strong storytelling, niche audience</div>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, font: `500 12px/1.5 ${RZ.fontUI}`, color: RZ.body }}>
                  <li>Guaranteed fee -- no sales risk</li>
                  <li>Builds your portfolio with brand-name work</li>
                </ul>
              </div>
            </div>

            {/* AFFILIATE */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${RZ.border}`, marginBottom: 12 }}>
              <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg,#009a5c 0%,#00c073 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `900 14px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.005em' }}>Affiliate</div>
                  <div style={{ font: `600 10.5px/1.2 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.92)', marginTop: 3 }}>Conversion . commission per sale</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ font: `500 12px/1.5 ${RZ.fontUI}`, color: RZ.body, marginBottom: 10 }}>
                  Sellers want <b style={{ color: RZ.black }}>conversion . GMV</b>. You earn a % of every sale through your link -- no cap, no slot lock.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: RZ.canvas }}>
                    <div style={{ font: `700 9.5px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Payout</div>
                    <div style={{ font: `800 12px/1.2 ${RZ.fontDisplay}`, color: RZ.black }}>% commission per sale</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: RZ.canvas }}>
                    <div style={{ font: `700 9.5px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Best for</div>
                    <div style={{ font: `800 12px/1.2 ${RZ.fontDisplay}`, color: RZ.black }}>High-conversion . review-style content</div>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, font: `500 12px/1.5 ${RZ.fontUI}`, color: RZ.body }}>
                  <li>Uncapped earnings -- scale with your views</li>
                  <li>Always-on links, no application slot needed</li>
                </ul>
              </div>
            </div>

            {/* STORE VISIT */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${RZ.border}`, marginBottom: 8 }}>
              <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg,#4b1d9e 0%,#9d5bf5 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `900 14px/1 ${RZ.fontDisplay}`, color: '#fff', letterSpacing: '-0.005em' }}>Store Visit</div>
                  <div style={{ font: `600 10.5px/1.2 ${RZ.fontUI}`, color: 'rgba(255,255,255,0.92)', marginTop: 3 }}>Foot traffic . flat fee + per-visit bonus</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ font: `500 12px/1.5 ${RZ.fontUI}`, color: RZ.body, marginBottom: 10 }}>
                  Sellers want <b style={{ color: RZ.black }}>real-world visits + check-in content</b>. Drop by their store, film a vlog, tag the location -- earn a base fee plus a bonus per verified check-in.
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, font: `500 12px/1.5 ${RZ.fontUI}`, color: RZ.body }}>
                  <li>Guaranteed base + bonus for each verified visit</li>
                  <li>Often paired with free product / store credit</li>
                </ul>
              </div>
            </div>

            <button onClick={() => setExplainOpen(false)} style={{
              width: '100%', padding: '14px 16px', marginTop: 8,
              borderRadius: 14, border: 0, cursor: 'pointer',
              background: RZ.black, color: '#fff',
              font: `800 13.5px/1 ${RZ.fontUI}`, letterSpacing: '.02em',
            }}>Got it</button>
          </div>
        </div>
      )}

      {/* Campaign detail sheet */}
      {selectedCampaign && (
        <CampaignDetailSheet campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
      )}
    </div>
  );
}
