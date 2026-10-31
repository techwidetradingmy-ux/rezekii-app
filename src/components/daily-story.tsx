"use client";

import { useDemo, useWho } from "@/components/demo";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Portal, Seg, ShareSheet } from "@/components/ui";
import { CREATOR } from "@/lib/mock";
import { STORY_SEEN, hoursLeft, storyDayKey, storyFor, type SampleDay, type StoryPage } from "@/lib/daily-story";
import "@/app/creator1.css";

const SLIDE_MS = 5200;
const TONE_TAG: Record<StoryPage["tone"], string> = { intro: "Daily Story", good: "Good news", heads: "Heads-up", steady: "Today", trend: "For you", total: "All-time", end: "Daily Story" };

/** Rimau the tiger cub, in a pose, moving to match the moment. */
export function Rimau({ pose, motion = "bounce", className = "" }: { pose: StoryPage["pose"]; motion?: StoryPage["motion"]; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`rm rm-${motion} ${className}`} src={`/mascot/rimau-${pose}.webp`} alt="" draggable={false} />;
}

/** Hides RM amounts on a page she shares (her choice, on by default for heads-ups). */
const mask = (s: string | undefined, hide: boolean) => (s && hide ? s.replace(/RM\s?[\d,]+(\.\d+)?/g, "RM •••") : s);

/** One story page as a 9:16 card: Rimau up top, the news below, her handle and the Rezekii mark at the foot. */
export function StoryCard({ page, hide = false, date }: { page: StoryPage; hide?: boolean; date: string }) {
  const you = useWho();
  const h = hide && page.money;
  return (
    <div className={`dsc dsc-${page.tone}`} role="img" aria-label={`${page.kick}: ${mask(page.big, !!h)} ${mask(page.head, !!h)}`}>
      <div className="dsc-safe">
        <span className="dsc-fx" aria-hidden="true">{Array.from({ length: 8 }, (_, k) => <i key={k} />)}</span>
        <div className="dsc-top">
          <span className="dsc-mast">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/master-logo-transparent.png" alt="" />
            REZEKII
          </span>
          <span className="dsc-date">{TONE_TAG[page.tone]} · {date}</span>
        </div>
        <div className="dsc-art">
          <Rimau key={page.id} pose={page.pose} motion={page.motion} />
          {page.img && (
            <span className="dsc-prod">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.img} alt="" />
            </span>
          )}
        </div>
        <div className="dsc-lines">
          <span className="dsc-kick">{page.kick}</span>
          <strong className="dsc-big">{mask(page.big, !!h)}</strong>
          <span className="dsc-head">{mask(page.head, !!h)}</span>
          {page.sub && <span className="dsc-sub">{mask(page.sub, !!h)}</span>}
          {page.lines && (
            <ul className="dsc-list">
              {page.lines.map((l) => <li key={l.tag}><b className={l.tag.toLowerCase()}>{l.tag}</b>{l.text}</li>)}
            </ul>
          )}
        </div>
        <span className="dsc-mark">
          <b>rezekii.com</b>
          <span className="dsc-me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={you.photo} alt="" />
            {you.handle}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * The Daily Story viewer (owner, 30 Oct 2026): like a story app, it plays page by page. Tap the right side for next, the left
 * side for back, hold to pause. Each page has its own button and Share.
 */
export function DailyStory({ day = "good", onClose, pages }: { day?: SampleDay; onClose: () => void; pages?: StoryPage[] | null }) {
  // Signed in (owner, 31 Oct 2026): her real story of yesterday, made on the server (or already read by the header).
  const { live } = useDemo();
  const [real, setReal] = useState<StoryPage[] | null>(pages?.length ? pages : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!live || pages?.length) return;
    fetch("/api/v2/story", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { pages?: StoryPage[] } | null) => (d?.pages?.length ? setReal(d.pages) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [live, pages]);
  if (!live) return <StoryPlayer pages={storyFor(day)} onClose={onClose} />;
  if (real) return <StoryPlayer pages={real} onClose={onClose} />;
  return (
    <Portal>
      <div className="ss-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ss-frame ds-frame" role="dialog" aria-modal="true" aria-label="Your Daily Story" style={{ display: "grid", placeItems: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <Rimau pose={failed ? "sad" : "think"} motion={failed ? "sway" : "float"} />
          <b>{failed ? "Rimau couldn't get your story" : "Rimau is reading your day…"}</b>
          {failed && <button type="button" className="np-btn v2-btn-sm" onClick={onClose}>Close</button>}
        </div>
      </div>
    </Portal>
  );
}

/** The story itself: one page at a time, moving on by itself. */
function StoryPlayer({ pages, onClose }: { pages: StoryPage[]; onClose: () => void }) {
  const you = useWho();
  const last = pages.length - 1;
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [share, setShare] = useState<StoryPage | null>(null);
  const [hide, setHide] = useState(false);
  const [left, setLeft] = useState(0);
  const page = pages[i];
  const date = page.kick.startsWith("Your day") ? page.kick.slice(11) : "Yesterday";

  useEffect(() => setLeft(hoursLeft()), []);
  useEffect(() => {
    try { localStorage.setItem(STORY_SEEN, storyDayKey()); } catch {}
  }, []);
  useEffect(() => {
    if (held || share || i >= last) return;
    const t = window.setTimeout(() => setI((x) => Math.min(x + 1, last)), page.tone === "intro" ? SLIDE_MS + 2500 : SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [i, last, held, share, page.tone]);
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
  const openShare = useCallback((p: StoryPage) => { setHide(p.tone === "heads" && !!p.money); setShare(p); }, []);

  if (share) {
    return (
      <ShareSheet
        key={String(hide)}
        title="Share this page"
        onClose={() => setShare(null)}
        big=""
        label={share.head}
        lines={[]}
        caption={mask(share.caption, hide && !!share.money)}
        card={<StoryCard page={share} hide={hide} date={date} />}
        extra={share.money ? <Seg value={hide ? "Hide amounts" : "Show amounts"} options={["Show amounts", "Hide amounts"] as const} onChange={(v) => setHide(v === "Hide amounts")} /> : undefined}
      />
    );
  }

  return (
    <Portal>
      <div className="ss-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div
          className="ss-frame ds-frame"
          role="dialog"
          aria-modal="true"
          aria-label="Your Daily Story"
          onClick={tap}
          onPointerDown={(e) => { if (!(e.target as HTMLElement).closest("button, a")) setHeld(true); }}
          onPointerUp={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
        >
          <div className="ss-bars" aria-hidden="true">
            {pages.map((p, n) => (
              <span key={p.id}>
                <i className={n < i ? "full" : n === i ? "now" : ""} style={n === i ? { animationDuration: `${p.tone === "intro" ? SLIDE_MS + 2500 : SLIDE_MS}ms`, animationPlayState: held ? "paused" : "running" } : undefined} />
              </span>
            ))}
          </div>
          <div className="ss-head">
            <span className="ss-ring ds-ring"><Rimau pose="wave" motion="pop" /></span>
            <b>Rimau&apos;s Daily Story</b>
            <small>{you.handle} · {left ? `ends in ${left}h` : "today"}</small>
            <button type="button" className="ss-x" aria-label="Close" onClick={onClose}><Icon name="x" size={20} width={2.4} /></button>
          </div>

          <div key={page.id} className="ss-cover"><StoryCard page={page} date={date} /></div>

          <div className="ss-foot ds-foot">
            {page.tone === "end" ? (
              <>
                <button type="button" className="ss-share" onClick={() => openShare(page)}><Icon name="users" size={17} /> Invite a Friend</button>
                <button type="button" className="ds-cta" onClick={onClose}>Done</button>
              </>
            ) : (
              <>
                {page.cta && <Link href={page.cta.href} className="ds-cta" onClick={onClose}>{page.cta.label}</Link>}
                <button type="button" className="ss-share" onClick={() => openShare(page)}><Icon name="share" size={17} /> Share</button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
