"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Count, Portal, ShareSheet } from "@/components/ui";
import { ANALYTICS, CREATOR, product, rm, short } from "@/lib/mock";
import { ORDER_HISTORY } from "@/lib/mock-creator1";

export type StoryItem = { id: string; productId: string; from: number; to: number; added?: boolean };
const SLIDE_MS = 4200;
const LINK = `rezekii.com/c/${CREATOR.handle.replace(/^@/, "")}`;
const ISSUE = "Issue 28 Oct 2026";

/** The coin mascot's mood on each cover (owner, 29 Oct 2026: cute, cartoon, made to share). */
type Mood = "happy" | "wow" | "sad" | "proud";
type CoverProps = {
  mood: Mood;
  /** A product photo shown as a small card on the cover (the best raise). */
  product?: string;
  photo: string;
  kick: string;
  big: React.ReactNode;
  head: string;
  sub?: string;
  /** Her own video this cover is about: title and views. */
  video?: { title: string; views: number };
  label: string;
};

/** Rezi, the Rezekii coin: a cute gold coin whose face and arms change with the mood. */
function Rezi({ mood }: { mood: Mood }) {
  const g = `rz-coin-${mood}`;
  const arms = mood === "sad" ? ["M26 74 L14 90", "M94 74 L106 90"] : mood === "proud" ? ["M24 70 L10 66", "M96 70 L110 66"] : ["M24 62 L10 42", "M96 62 L110 42"];
  return (
    <svg className="rz-coin" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={g} cx="35%" cy="28%" r="78%">
          <stop offset="0" stopColor="#fff4bf" />
          <stop offset="0.45" stopColor="#ffd34d" />
          <stop offset="1" stopColor="#f0a020" />
        </radialGradient>
      </defs>
      {arms.map((d) => <path key={d} d={d} stroke="#d98a10" strokeWidth="6" strokeLinecap="round" fill="none" />)}
      <circle cx="60" cy="64" r="42" fill={`url(#${g})`} stroke="#d98a10" strokeWidth="3" />
      <circle cx="60" cy="64" r="34" fill="none" stroke="#f7c04d" strokeWidth="2" strokeDasharray="3 4" />
      <ellipse cx="44" cy="40" rx="10" ry="5" fill="#ffffff" opacity="0.6" />
      <ellipse cx="38" cy="76" rx="6" ry="3.5" fill="#ff8fa3" opacity="0.7" />
      <ellipse cx="82" cy="76" rx="6" ry="3.5" fill="#ff8fa3" opacity="0.7" />
      {mood === "happy" && <>
        <path d="M40 62 q6 -8 12 0 M68 62 q6 -8 12 0" stroke="#5a2d00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M46 74 q14 16 28 0 z" fill="#5a2d00" /><path d="M54 80 q6 4 12 0" fill="#ff6b81" />
      </>}
      {mood === "wow" && <>
        <path d="M46 52 l2 5 5 .5 -4 3.5 1.2 5 -4.2-2.8 -4.2 2.8 1.2-5 -4-3.5 5-.5z M74 52 l2 5 5 .5 -4 3.5 1.2 5 -4.2-2.8 -4.2 2.8 1.2-5 -4-3.5 5-.5z" fill="#ff5a5f" />
        <ellipse cx="60" cy="80" rx="7" ry="8" fill="#5a2d00" />
      </>}
      {mood === "sad" && <>
        <path d="M37 56 l13 -6 M83 56 l-13 -6" stroke="#5a2d00" strokeWidth="3" strokeLinecap="round" />
        <circle cx="46" cy="64" r="4" fill="#5a2d00" /><circle cx="74" cy="64" r="4" fill="#5a2d00" />
        <path d="M48 86 q12 -10 24 0" stroke="#5a2d00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path className="rz-tear" d="M44 70 q-4 7 0 9 q4 -2 0 -9z" fill="#5ab8ff" />
      </>}
      {mood === "proud" && <>
        <path d="M40 62 q6 6 12 0 M68 62 q6 6 12 0" stroke="#5a2d00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M50 78 q10 8 20 0" stroke="#5a2d00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </>}
    </svg>
  );
}

/** A banknote with little wings, for money flying away. */
const Bill = () => (
  <svg viewBox="0 0 60 34" aria-hidden="true">
    <path d="M6 12 q-6 -10 -2 -12 q6 2 8 10z M54 12 q6 -10 2 -12 q-6 2 -8 10z" fill="#ffffff" opacity="0.9" />
    <rect x="8" y="8" width="44" height="24" rx="4" fill="#35c27f" stroke="#1d8f5a" strokeWidth="2" />
    <circle cx="30" cy="20" r="6" fill="#1d8f5a" />
    <text x="30" y="23" textAnchor="middle" fontSize="7" fontWeight="900" fill="#d7ffe9">RM</text>
  </svg>
);

/**
 * A scan-recap cover (owner, 29 Oct 2026): cartoon style made to share. Rezi the coin shows the mood (happy, wow, sad,
 * proud) on a bright gradient; her photo sits small by her handle so it's still her story; the Rezekii mark stays small.
 */
export function Cover({ mood, product: prod, photo, kick, big, head, sub, label }: CoverProps) {
  return (
    <div className={`mg ill ${mood}`} role="img" aria-label={label}>
      <div className="mg-safe">
        <span className="il-fx" aria-hidden="true">{Array.from({ length: 9 }, (_, k) => <i key={k} />)}</span>
        <div className="mg-top">
          <span className="mg-mast">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/master-logo-transparent.png" alt="" />
            REZEKII
          </span>
          <span className="mg-issue">{ISSUE}</span>
        </div>
        <div className="il-art">
          <Rezi mood={mood} />
          {mood === "sad" && <span className="il-bills"><Bill /><Bill /><Bill /></span>}
          {prod && (
            <span className="il-prod">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prod} alt="" />
            </span>
          )}
        </div>
        <div className="mg-lines">
          <span className="mg-kick">{kick}</span>
          <strong className="mg-big">{big}</strong>
          <span className="mg-head">{head}</span>
          {sub && <span className="mg-sub">{sub}</span>}
        </div>
        <span className="mg-mark">
          <b>rezekii.com</b>
          <span className="il-me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" />
            {CREATOR.handle}
          </span>
        </span>
      </div>
    </div>
  );
}

type Slide = "found" | "best" | "money" | "checked" | "end";

/**
 * Scan recap: magazine covers made to share (owner, 28 Oct 2026). Opens straight on the results: how many products can pay
 * more, the best raise (her own video), and what she left on the table since she started. Every cover has its own Share.
 * The last page is where she picks which raises to add.
 */
export function ScanStory({ checked, items, onAdd, onClose }: { checked: number; items: StoryItem[]; onAdd: (ids: string[]) => void; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [share, setShare] = useState<Slide | null>(null);
  // Invite affiliate friends to try the scan, free (owner, 29 Oct 2026).
  const [invite, setInvite] = useState(false);
  // All are ticked to start; she can raise one, some or all. Ratings stay out of the recap (Risk Check covers them).
  const open = items.filter((it) => !it.added);
  const [pick, setPick] = useState<string[]>(() => open.map((it) => it.id));
  const flip = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Money per raise: her own orders since she started × price × the extra %. An estimate, and the cover says from when.
  const orders = (id: string) => ORDER_HISTORY.byProduct.find((b) => b.productId === id)?.orders ?? 0;
  const worth = (it: StoryItem) => (orders(it.productId) * product(it.productId).price * (it.to - it.from)) / 100;
  const extra = items.reduce((sum, it) => sum + worth(it), 0);
  // Best raise = the one worth the most to her. No sales on any: the biggest jump, unless every jump is the same.
  const byMoney = [...items].sort((a, b) => worth(b) - worth(a));
  const jumps = new Set(items.map((it) => it.to - it.from));
  const best = byMoney[0] && worth(byMoney[0]) > 0 ? byMoney[0] : jumps.size > 1 ? [...items].sort((a, b) => b.to - b.from - (a.to - a.from))[0] : null;
  const bestVideo = best ? ANALYTICS.videos.find((v) => v.productId === best.productId) : undefined;

  const slides: Slide[] = items.length ? ["found", ...(best ? (["best"] as const) : []), ...(extra > 0 ? (["money"] as const) : []), "end"] : ["checked", "end"];
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

  /** Each cover's words, the share caption, and whether the big number counts up in the story. */
  const cover = (s: Slide, live: boolean): (CoverProps & { caption: string }) | null => {
    const n = (v: number, f?: (x: number) => string) => (live ? <Count value={v} ms={1200} format={f} /> : f ? f(v) : v.toLocaleString("en-MY"));
    if (s === "found") return {
      mood: "happy", photo: CREATOR.photo, kick: "Showcase scan", big: n(items.length), head: `product${items.length === 1 ? "" : "s"} can pay me more`, sub: `Out of ${checked.toLocaleString("en-MY")} I promote`,
      label: `${items.length} products in my showcase can pay me more`,
      caption: `Rezekii found ${items.length} products in my showcase that can pay me more 👀 Check yours free 👉 ${LINK} #RezekiiScan #TikTokShopMY`,
    };
    if (s === "best" && best) {
      const p = product(best.productId);
      return {
        mood: "wow", product: p.img, photo: CREATOR.photo, video: bestVideo ? { title: bestVideo.title, views: bestVideo.views } : undefined, kick: "Best raise", big: `${best.to}%`, head: p.name, sub: `Up from ${best.from}%`,
        label: `Best raise: ${p.name}, ${best.from}% to ${best.to}%`,
        caption: `${p.name}: ${best.from}% → ${best.to}% commission with Rezekii 🙌 Check yours free 👉 ${LINK} #RezekiiScan #TikTokShopMY`,
      };
    }
    if (s === "money") return {
      mood: "sad", photo: CREATOR.photo, kick: `Since ${ORDER_HISTORY.since}`, big: n(extra, (x) => rm(x, 0)), head: "commission I never got 😢", sub: "My sales at the better rates · estimate",
      label: `${rm(extra, 0)} left on the table since ${ORDER_HISTORY.since}`,
      caption: `I left ${rm(extra, 0)} on the table since ${ORDER_HISTORY.since} 😭 Rezekii found it. See yours free 👉 ${LINK} #RezekiiScan #TikTokShopMY`,
    };
    if (s === "checked") return {
      mood: "proud", photo: CREATOR.photo, kick: "Showcase scan", big: n(checked), head: "products checked", sub: "All at the best rate",
      label: `${checked} products checked, all at the best rate`,
      caption: `Rezekii checked all ${checked.toLocaleString("en-MY")} products in my showcase ✅ Check yours free 👉 ${LINK} #RezekiiScan #TikTokShopMY`,
    };
    return null;
  };

  if (invite) {
    return (
      <ShareSheet
        title="Invite Friends for Free Scan"
        onClose={() => setInvite(false)}
        moment="invite"
        big="Scan your showcase free"
        label="Find better commission on Rezekii"
        lines={["Same products, better rates", "Free for TikTok creators"]}
        caption={`I just scanned my TikTok Shop showcase and found better commission on products I already sell 💸 Free to try for affiliates: ${LINK} #RezekiiScan #TikTokShopMY`}
      />
    );
  }
  const shared = share ? cover(share, false) : null;
  if (shared) {
    const { caption, ...card } = shared;
    return <ShareSheet title="Share this cover" onClose={() => setShare(null)} big="" label={card.label} lines={[]} caption={caption} card={<Cover {...card} />} />;
  }
  const now = cover(at, true);

  return (
    <Portal>
      <div className="ss-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={`ss-frame ss-${at === "end" ? "end" : "mag"}`} role="dialog" aria-modal="true" aria-label="Your scan recap" onClick={tap}>
          <div className="ss-bars" aria-hidden="true">
            {slides.map((s, n) => <span key={s}><i className={n < i ? "full" : n === i ? "now" : ""} style={n === i ? { animationDuration: `${SLIDE_MS}ms` } : undefined} /></span>)}
          </div>
          <div className="ss-head">
            <span className="ss-ring">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={CREATOR.photo} alt="" /></span>
            <b>{CREATOR.handle}</b>
            <small>Rezekii scan · just now</small>
            <button type="button" className="ss-x" aria-label="Close" onClick={onClose}><Icon name="x" size={20} width={2.4} /></button>
          </div>

          {now ? (
            <>
              <div key={at} className="ss-cover"><Cover {...now} /></div>
              <div className="ss-foot">
                <button type="button" className="ss-share" onClick={() => setShare(at)}><Icon name="share" size={17} /> Share</button>
                {i < last && <span className="ss-hint" aria-hidden="true">Tap for next</span>}
              </div>
            </>
          ) : (
            <div key={at} className="ss-body">
              <span className="ss-kick">Your move</span>
              <h2>{!items.length ? "Your rates are already the best" : open.length ? "Pick which ones to raise" : "All your raises are added"}</h2>
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
                            <span>{p.name}</span>
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
                  <Icon name="plus" size={18} width={2.6} /> {!pick.length ? "Tick at least one" : pick.length === open.length && open.length > 1 ? `Add all ${pick.length}` : `Add ${pick.length}`}
                </button>
              )}
              <button type="button" className="ss-btn" onClick={() => setInvite(true)}><Icon name="users" size={18} /> Invite Friends for Free Scan</button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
