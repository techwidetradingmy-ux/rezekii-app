"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Portal, ShareSheet } from "@/components/ui";
import { ANALYTICS, CREATOR, REFERRAL_REWARD, product, rm } from "@/lib/mock";

export type StoryItem = { id: string; productId: string; from: number; to: number; added?: boolean };
const SLIDE_MS = 4200;
const LINK = `rezekii.com/c/${CREATOR.handle.replace(/^@/, "")}`;

/**
 * Scan recap (owner, 28 Oct 2026: social media vibes, made to go viral): after a scan, a tap-through story like a TikTok or
 * Instagram story. Products checked, how many pay more, the best raise, what they would have earned (from her own orders),
 * then add all, share the story card, or challenge a friend with her invite link.
 */
export function ScanStory({ checked, items, onAdd, onClose }: { checked: number; items: StoryItem[]; onAdd: (ids: string[]) => void; onClose: () => void }) {
  const { toast } = useDemo();
  const [i, setI] = useState(0);
  // Which share card is open: the scan result, or the money she missed (owner, 28 Oct 2026: make it shareable).
  const [share, setShare] = useState<"scan" | "money" | null>(null);
  // Owner, 28 Oct 2026: show which products can pay more, and let her raise one, some or all. All are ticked to start,
  // except products rated under 4★ (Risk check says avoid them).
  const open = items.filter((it) => !it.added);
  const [pick, setPick] = useState<string[]>(() => open.filter((it) => product(it.productId).rating >= 4).map((it) => it.id));
  const flip = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  // The best raise on a product rated 4★ or more: never cheer a product Risk check says to avoid.
  const ranked = [...items].sort((a, b) => b.to - b.from - (a.to - a.from));
  const best = ranked.find((it) => product(it.productId).rating >= 4) ?? ranked[0];
  // What these raises would have added last month: her own orders × price × the rate difference. An estimate, said so on screen.
  const extra = items.reduce((sum, it) => {
    const o = ANALYTICS.byProduct.find((b) => b.productId === it.productId)?.orders ?? 0;
    return sum + (o * product(it.productId).price * (it.to - it.from)) / 100;
  }, 0);
  const slides = items.length ? (["intro", "checked", "found", "best", ...(extra > 0 ? ["money"] : []), "end"] as const) : (["intro", "checked", "end"] as const);
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

  const missed = rm(extra);
  if (share === "money") {
    return (
      <ShareSheet
        onClose={() => setShare(null)}
        big={missed}
        label="I missed out on this last month"
        lines={["in TikTok Shop commission", `Rezekii found ${items.length} better rates in my showcase`]}
        kicker="Money I missed"
        caption={`I was missing ${missed} a month in TikTok Shop commission 😭 Rezekii found ${items.length} better rates hiding in my showcase. See what you're missing, free 👉 ${LINK} #RezekiiScan #TikTokShopMY`}
      />
    );
  }
  if (share) {
    return <ShareSheet onClose={() => setShare(null)} big={`${items.length} raises`} label="Found in my showcase" lines={[`Up to +${best ? best.to - best.from : 0}% commission`, `${checked.toLocaleString("en-MY")} products checked`]} kicker="Showcase scan" caption={caption} />;
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
                <span className="ss-kick">You missed out on</span>
                <strong className="ss-big"><Count value={extra} ms={1400} format={(n) => rm(n)} /></strong>
                <h2>in commission last month</h2>
                <span className="ss-sticker" style={{ ["--r" as string]: "-5deg" }}>If you&apos;d found us earlier 😭</span>
                <small className="ss-note">Your own sales in the last 30 days, at the better rates we found. An estimate from your orders.</small>
                <button type="button" className="ss-btn ss-btn-fit" onClick={() => setShare("money")}><Icon name="share" size={18} /> Share this</button>
              </>
            )}
            {at === "end" && (
              <>
                <span className="ss-kick">Your move</span>
                <h2>{!items.length ? "Your rates are already the best we have" : open.length ? "Pick which ones to raise" : "All your raises are added"}</h2>
                {items.length > 0 && (
                  <div className="ss-pick">
                    {open.length > 1 && (
                      <button type="button" className="ss-pick-all" onClick={() => setPick(pick.length === open.length ? [] : open.map((it) => it.id))}>
                        {pick.length === open.length ? "Untick all" : "Tick all"}
                      </button>
                    )}
                    <ul>
                      {items.map((it) => {
                        const p = product(it.productId);
                        const on = pick.includes(it.id);
                        return (
                          <li key={it.id}>
                            <button type="button" className={`ss-row${it.added ? " added" : on ? " on" : ""}`} disabled={it.added} aria-pressed={it.added ? undefined : on} onClick={() => flip(it.id)}>
                              <i className="ss-tick" aria-hidden="true">{(on || it.added) && <Icon name="check" size={13} width={3.4} />}</i>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.img} alt="" />
                              <span>{p.rating < 4 && <i className="ss-low">{p.rating.toFixed(1)}★</i>}{p.name}</span>
                              <em>{it.added ? "Added" : <>{it.from}% → <b>{it.to}%</b></>}</em>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {open.length > 0 && (
                  <button type="button" className="ss-btn main" disabled={!pick.length} onClick={() => { onAdd(pick); onClose(); }}>
                    <Icon name="plus" size={18} width={2.6} /> {!pick.length ? "Tick at least one" : pick.length === open.length && open.length > 1 ? `Add all ${pick.length}` : `Add ${pick.length} selected`}
                  </button>
                )}
                {!items.length && <small className="ss-note">We scan your showcase every day and tell you when a better rate comes up.</small>}
                <span className="ss-two">
                  <button type="button" className="ss-btn" onClick={() => setShare("scan")}><Icon name="share" size={18} /> Share</button>
                  <button type="button" className="ss-btn" onClick={() => toast(`Opening WhatsApp with your link: ${LINK}`)}><Icon name="users" size={18} /> Challenge a friend</button>
                </span>
                <small className="ss-note">+{REFERRAL_REWARD.inviter} credits for you and +{REFERRAL_REWARD.friend} for your friend when they join with your link and run their first scan.</small>
              </>
            )}
          </div>
          {i < last && <span className="ss-hint" aria-hidden="true">Tap for next</span>}
        </div>
      </div>
    </Portal>
  );
}
