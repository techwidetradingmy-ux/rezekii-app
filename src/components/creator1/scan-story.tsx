"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Portal, ShareSheet } from "@/components/ui";
import { ANALYTICS, CREATOR, product, rm } from "@/lib/mock";

export type StoryItem = { id: string; productId: string; from: number; to: number };
const SLIDE_MS = 4200;
const LINK = `rezekii.com/c/${CREATOR.handle.replace(/^@/, "")}`;

/**
 * Scan recap (owner, 28 Oct 2026: social media vibes, made to go viral): after a scan, a tap-through story like a TikTok or
 * Instagram story. Products checked, how many pay more, the best raise, what they would have earned (from her own orders),
 * then add all, share the story card, or challenge a friend with her invite link.
 */
export function ScanStory({ checked, items, onAddAll, onClose }: { checked: number; items: StoryItem[]; onAddAll: () => void; onClose: () => void }) {
  const { toast } = useDemo();
  const [i, setI] = useState(0);
  const [share, setShare] = useState(false);
  // The best raise on a product rated 4★ or more: never cheer a product Risk check says to avoid.
  const ranked = [...items].sort((a, b) => b.to - b.from - (a.to - a.from));
  const best = ranked.find((it) => product(it.productId).rating >= 4) ?? ranked[0];
  // What these raises would have added last month: her own orders × price × the rate difference. An estimate, said so on screen.
  const extra = items.reduce((sum, it) => {
    const o = ANALYTICS.byProduct.find((b) => b.productId === it.productId)?.orders ?? 0;
    return sum + (o * product(it.productId).price * (it.to - it.from)) / 100;
  }, 0);
  const slides = ["intro", "checked", "found", "best", ...(extra > 0 ? ["money"] : []), "end"] as const;
  const last = slides.length - 1;
  const at = slides[i];

  useEffect(() => {
    if (i >= last || share) return;
    const t = window.setTimeout(() => setI((x) => Math.min(x + 1, last)), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [i, last, share]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, last));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [last, onClose]);

  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    const r = e.currentTarget.getBoundingClientRect();
    setI((x) => (e.clientX - r.left < r.width * 0.3 ? Math.max(x - 1, 0) : Math.min(x + 1, last)));
  };
  const caption = `Rezekii found ${items.length} better commissions hiding in my TikTok showcase 👀 Up to +${best ? best.to - best.from : 0}%. Check yours free 👉 ${LINK} #RezekiiScan #TikTokShopMY`;

  if (share) {
    return <ShareSheet onClose={() => setShare(false)} big={`${items.length} raises`} label="Found in my showcase" lines={[`Up to +${best ? best.to - best.from : 0}% commission`, `${checked.toLocaleString("en-MY")} products checked`]} kicker="Showcase scan" caption={caption} />;
  }

  return (
    <Portal>
      <div className="ss-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={`ss-frame ss-${at}`} role="dialog" aria-modal="true" aria-label="Your scan recap" onClick={tap}>
          <div className="ss-bars" aria-hidden="true">
            {slides.map((s, n) => <span key={s}><i className={n < i ? "full" : n === i ? "now" : ""} style={n === i ? { animationDuration: `${SLIDE_MS}ms` } : undefined} /></span>)}
          </div>
          <div className="ss-head">
            <span className="ss-ring">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={CREATOR.photo} alt="" /></span>
            <b>{CREATOR.handle}</b>
            <small>Rezekii scan · just now</small>
            <button type="button" className="ss-x" aria-label="Close" onClick={onClose}><Icon name="x" size={20} width={2.4} /></button>
          </div>

          <div key={at} className="ss-body">
            {at === "intro" && (
              <>
                <span className="ss-kick">Your scan is ready</span>
                <h2>Let&apos;s see what your showcase is hiding <span aria-hidden="true">👀</span></h2>
                <span className="ss-sticker" style={{ ["--r" as string]: "-6deg" }}>Tap to see</span>
              </>
            )}
            {at === "checked" && (
              <>
                <span className="ss-kick">We checked</span>
                <strong className="ss-big"><Count value={checked} ms={1400} /></strong>
                <h2>products in your showcase</h2>
                <span className="ss-thumbs" aria-hidden="true">
                  {items.slice(0, 5).map((it, n) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={it.id} src={product(it.productId).img} alt="" style={{ animationDelay: `${n * 120}ms`, ["--r" as string]: `${(n % 2 ? 1 : -1) * (4 + n * 2)}deg` }} />
                  ))}
                </span>
              </>
            )}
            {at === "found" && (
              <>
                <span className="ss-kick">Good news</span>
                <strong className="ss-big">{items.length}</strong>
                <h2>of them can pay you more</h2>
                <span className="ss-grid">
                  {items.slice(0, 6).map((it, n) => (
                    <span key={it.id} style={{ animationDelay: `${n * 140}ms` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product(it.productId).img} alt="" />
                      <em>+{it.to - it.from}%</em>
                    </span>
                  ))}
                </span>
              </>
            )}
            {at === "best" && best && (
              <>
                <span className="ss-kick">Your best raise</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ss-hero" src={product(best.productId).img} alt="" />
                <h2>{product(best.productId).name}</h2>
                <span className="ss-rate"><s>{best.from}%</s><Icon name="arrow" size={20} width={2.6} /><b>{best.to}%</b></span>
                <span className="ss-sticker" style={{ ["--r" as string]: "8deg" }}>+{best.to - best.from}% 🔥</span>
              </>
            )}
            {at === "money" && (
              <>
                <span className="ss-kick">Last 30 days</span>
                <h2>At these rates, your sales would have earned</h2>
                <strong className="ss-big"><Count value={extra} ms={1400} format={(n) => rm(n)} /></strong>
                <h2>more</h2>
                <small className="ss-note">Worked out from your own orders. Only you see this; it&apos;s never on your share card.</small>
              </>
            )}
            {at === "end" && (
              <>
                <span className="ss-kick">Your move</span>
                <h2>Lock in {items.length} better rates</h2>
                <button type="button" className="ss-btn main" onClick={() => { onAddAll(); onClose(); }}><Icon name="plus" size={18} width={2.6} /> Add all {items.length} in one tap</button>
                <button type="button" className="ss-btn" onClick={() => setShare(true)}><Icon name="share" size={18} /> Share my scan</button>
                <button type="button" className="ss-btn" onClick={() => toast(`Opening WhatsApp with your link: ${LINK}`)}><Icon name="users" size={18} /> Challenge a friend to scan</button>
                <small className="ss-note">+100 credits for every friend who joins with your link and links TikTok Shop.</small>
              </>
            )}
          </div>
          {i < last && <span className="ss-hint" aria-hidden="true">Tap for next</span>}
        </div>
      </div>
    </Portal>
  );
}
