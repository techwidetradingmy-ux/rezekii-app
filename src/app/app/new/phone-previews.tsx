"use client";

import { TikTok_Sans } from "next/font/google";
import { useState, type CSSProperties, type ReactNode } from "react";
import { hashtags, threadsLength, type Channel } from "@/modules/social/rules.ts";

/**
 * Phone previews laid out like each app after posting (Oct 2026: TikTok For You, Instagram Reels viewer, Facebook Reels
 * and Feed, Threads feed), from research/social-post-preview-layouts.md. Rendered in the browser only: captions are cut
 * where each app cuts them by measuring the text. "more" expands the caption and the comment button opens the comments,
 * as in each app.
 */
const tiktokSans = TikTok_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-tiktok" });
const PT = 280 / 393;

const P: Record<string, ReactNode> = {
  heartF: <path fill="currentColor" d="M12 21s-7.8-4.8-9.6-9.6C1.2 7.9 3.6 4.5 7.2 4.5c2.1 0 3.8 1.2 4.8 2.8 1-1.6 2.7-2.8 4.8-2.8 3.6 0 6 3.4 4.8 6.9C19.8 16.2 12 21 12 21z" />,
  heartO: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.2-9.2C1.7 7.9 3.9 4.8 7.2 4.8c2 0 3.7 1.1 4.8 2.7 1.1-1.6 2.8-2.7 4.8-2.7 3.3 0 5.5 3.1 4.4 6.5C19.5 15.9 12 20.5 12 20.5z" />,
  cmtF: <><path fill="currentColor" d="M12 3.5c-5.2 0-9.4 3.5-9.4 7.9 0 2.6 1.5 4.9 3.8 6.3l-.6 3.3 3.9-2c.7.1 1.5.2 2.3.2 5.2 0 9.4-3.5 9.4-7.8S17.2 3.5 12 3.5z" /><g fill="#000" fillOpacity=".38"><circle cx="8" cy="11.4" r="1.2" /><circle cx="12" cy="11.4" r="1.2" /><circle cx="16" cy="11.4" r="1.2" /></g></>,
  cmtO: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M20.7 16.6A9 9 0 1 0 17.2 20l3.8 1.1-1-4.5z" />,
  bookmarkF: <path fill="currentColor" d="M6.5 3h11c.6 0 1 .4 1 1v17l-6.5-4.3L5.5 21V4c0-.6.4-1 1-1z" />,
  shareF: <path fill="currentColor" d="M13.2 4.2 22 11.6l-8.8 7.6v-4.4c-5.7 0-9.2 1.7-11.2 5.6.8-5.9 4.2-11 11.2-11.8z" />,
  shareO: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M13.5 5 21 12l-7.5 7v-4c-5 0-8 1.5-10.5 5 1-5.5 4-9.6 10.5-10.3z" />,
  repost: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M17 3.5 20.5 7 17 10.5M20.5 7H8a4 4 0 0 0-4 4v1M7 20.5 3.5 17 7 13.5M3.5 17H16a4 4 0 0 0 4-4v-1" />,
  plane: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M21.5 3 3 10.4l7.2 2.9L13.4 21 21.5 3zM10.2 13.3 21.5 3" />,
  dots: <g fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></g>,
  search: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 20.5 20.5" /></g>,
  plus: <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M12 5v14M5 12h14" />,
  homeF: <path fill="currentColor" d="M3 10.6 12 3l9 7.6V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />,
  homeO: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M3.5 10.8 12 3.6l8.5 7.2V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z" />,
  user: <g fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8.5" r="4" /><path d="M4 21c.9-4 4.2-6 8-6s7.1 2 8 6" /></g>,
  inbox: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M4 5h16v11H9.5L4 20z" />,
  bag: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M5 8h14l-1.2 12.5H6.2zM9 8V6.5a3 3 0 0 1 6 0V8" />,
  live: <><g fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="6.5" width="19" height="13" rx="3" /><path d="M8 3l4 3.4L16 3" /></g><text x="12" y="15.6" fontSize="6.2" fontWeight="800" textAnchor="middle" fill="currentColor" fontFamily="Arial,Helvetica,sans-serif">LIVE</text></>,
  music: <g fill="currentColor"><path d="M8 6.4 20 4v11.5h-1.6V7.2L9.6 9v8.5H8z" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="17.3" cy="15.5" r="2.5" /></g>,
  reels: <><g fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M3 8.5h18M8.5 3l3 5.5M14.5 3l3 5.5" /></g><path fill="currentColor" d="M10 11.3v6l5.2-3z" /></>,
  thumb: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M7.5 10.5v9.5H4v-9.5zM7.5 10.5 11 3.5c1.6 0 2.6 1.1 2.3 2.7L12.8 9.5h6.1a2 2 0 0 1 2 2.4l-1.3 6.5a2 2 0 0 1-2 1.6H7.5" />,
  globe: <g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" /></g>,
  friends: <g fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2M15.5 5.3a3.3 3.3 0 0 1 0 6.4M17.5 14.9c2.2.5 3.6 2.2 4 5.1" /></g>,
  store: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M4 9.5V20h16V9.5M3 9.5 4.5 4h15L21 9.5a2.6 2.6 0 0 1-4.5 1.6A2.6 2.6 0 0 1 12 11a2.6 2.6 0 0 1-4.5.1A2.6 2.6 0 0 1 3 9.5zM9.5 20v-5h5v5" />,
  bell: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  menu: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />,
  menu2: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 9h16M4 15h10" />,
  messenger: <path fill="currentColor" d="M12 2.5C6.5 2.5 2.5 6.5 2.5 11.6c0 2.7 1.1 5 3 6.6v3.3l3-1.7c1.1.3 2.2.5 3.5.5 5.5 0 9.5-4 9.5-9.1S17.5 2.5 12 2.5zm1 12.1-2.4-2.6-4.7 2.6 5.2-5.5 2.5 2.6 4.6-2.6z" />,
  mute: <><path fill="currentColor" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  x: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />,
  threads: <text x="12" y="18.5" textAnchor="middle" fontSize="21" fontWeight="700" fill="currentColor" fontFamily="-apple-system,Arial,sans-serif">@</text>,
};
const Ic = ({ n, s = 24 }: { n: string; s?: number }) => <svg className="pv-ico" style={{ "--s": s } as CSSProperties} viewBox="0 0 24 24" aria-hidden="true">{P[n]}</svg>;

function StatusBar({ color }: { color: string }) {
  return (
    <>
      <span className="pv-di" />
      <div className="pv-sb" style={{ color }}>
        <span>9:41</span>
        <span className="ic">
          <svg className="pv-ico" style={{ "--s": 17 } as CSSProperties} viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><rect x="1" y="14" width="3.5" height="6" rx="1" /><rect x="6.5" y="11" width="3.5" height="9" rx="1" /><rect x="12" y="7.5" width="3.5" height="12.5" rx="1" /><rect x="17.5" y="4" width="3.5" height="16" rx="1" /></g></svg>
          <svg className="pv-ico" style={{ "--s": 17 } as CSSProperties} viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M3 9.5a13 13 0 0 1 18 0M6.5 13a8 8 0 0 1 11 0M10 16.5a3 3 0 0 1 4 0" /></svg>
          <svg className="pv-ico" style={{ "--s": 27 } as CSSProperties} viewBox="0 0 30 24" aria-hidden="true"><rect x="1" y="6" width="24" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" /><rect x="3" y="8" width="19" height="8" rx="2" fill="currentColor" /><rect x="26.5" y="10" width="2" height="4" rx="1" fill="currentColor" fillOpacity=".45" /></svg>
        </span>
      </div>
    </>
  );
}

let canvas: CanvasRenderingContext2D | null = null;
function wrapCount(str: string, font: string, width: number): number {
  if (typeof document === "undefined") return 1;
  canvas ??= document.createElement("canvas").getContext("2d");
  if (!canvas) return 1;
  canvas.font = font;
  let n = 0;
  for (const para of str.split("\n")) {
    let line = "";
    n++;
    for (const w of para.split(/(?<=\s)/)) {
      if (line && canvas.measureText(line + w).width > width) { n++; line = w; } else line += w;
      while (line.length > 1 && canvas.measureText(line).width > width) {
        let i = line.length;
        while (i > 1 && canvas.measureText(line.slice(0, i)).width > width) i--;
        n++;
        line = line.slice(i);
      }
    }
  }
  return n;
}
/** Cuts `text` to `lines` lines at `width` px, leaving room for the app's "… more" label. */
function clamp(text: string, font: string, width: number, lines: number, suffix: string): { text: string; cut: boolean } {
  if (wrapCount(text, font, width) <= lines) return { text, cut: false };
  const ch = Array.from(text);
  let lo = 0, hi = ch.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (wrapCount(ch.slice(0, mid).join("").trimEnd() + suffix, font, width) <= lines) lo = mid; else hi = mid - 1;
  }
  return { text: ch.slice(0, lo).join("").trimEnd(), cut: true };
}
const SYS = '-apple-system, "SF Pro Text", Roboto, Arial, sans-serif';

/** Links and hashtags styled the way each app shows them. */
function Rich({ text, links, tags, at, names = [], handles = true }: { text: string; links?: boolean; tags?: "bold" | "link"; at?: "bold" | "link"; names?: string[]; handles?: boolean }) {
  // @mentions (and mentioned Facebook Pages, shown by name) are highlighted the way each app shows them; Facebook only links mentioned Pages.
  const named = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(https?:\\/\\/\\S+|#[\\p{L}\\p{N}_]+|@[\\p{L}\\p{N}._]+${named.length ? `|${named.join("|")}` : ""})`, "u"));
  const style = (kind: "bold" | "link" | undefined, s: string, i: number) => (kind === "bold" ? <b key={i}>{s}</b> : kind === "link" ? <a key={i} href="#" onClick={(e) => e.preventDefault()}>{s}</a> : s);
  return <>{parts.map((s, i) => (/^https?:\/\//.test(s) ? (links ? style("link", s, i) : s) : /^#/.test(s) ? style(tags, s, i) : (handles && /^@./.test(s)) || names.includes(s) ? style(at, s, i) : s))}</>;
}

export type Who = { name: string; username: string; avatar: string | null };
export type PreviewProps = { channel: Channel; caption: string; comment: string; video: string | null; who: Who; fbView: "reels" | "feed"; theme: "light" | "dark"; topic?: string; collaborators?: string[]; names?: string[] };

function Video({ src }: { src: string | null }) {
  return src ? <video src={src} muted loop autoPlay playsInline /> : <span className="ph">Your video shows here</span>;
}
const Pic = ({ src, className, style }: { src: string | null; className?: string; style?: CSSProperties }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img className={className} src={src ?? undefined} alt="" style={style} />
);
const Av = ({ who, size }: { who: Who; size: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img className="pv-av" src={who.avatar ?? undefined} alt="" style={{ width: `calc(${size} * var(--p))`, height: `calc(${size} * var(--p))` }} />
);
const Nav = ({ n, label, on, s = 26 }: { n: string; label?: string; on?: boolean; s?: number }) => <span className={`b${on ? " on" : ""}`}><Ic n={n} s={s} />{label && <span>{label}</span>}</span>;
const NavAv = ({ who, label }: { who: Who; label?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <span className="b"><img className="av" src={who.avatar ?? undefined} alt="" />{label && <span>{label}</span>}</span>
);

/** The app's "more" label as a button: it expands the caption, as tapping it does in the app. */
const More = ({ label, onClick }: { label: ReactNode; onClick: () => void }) => <button type="button" className="pv-more" onClick={(e) => { e.stopPropagation(); onClick(); }}>{label}</button>;

/** The comments panel Instagram and Facebook Reels open from the comment button, with the first comment when there is one. */
function CommentSheet({ app, comment, who, onClose }: { app: "instagram" | "facebook"; comment: string; who: Who; onClose: () => void }) {
  const ig = app === "instagram";
  return (
    <>
      <div className="pv-cs-dim" onClick={onClose} />
      <div className={`pv-cs${ig ? " ig" : ""}`} role="dialog" aria-label="Comments">
        <span className="grab" />
        <div className="hd"><b>Comments</b><button type="button" className="x" onClick={onClose} aria-label="Close comments"><Ic n="x" s={18} /></button></div>
        <div className="list">
          {comment ? (
            <div className="row"><Av who={who} size={32} /><div className="tx"><span className="nm">{ig ? who.username : who.name}<small>{ig ? "1m" : "Just now"}</small></span><span className="body"><Rich text={comment} links at="link" /></span><small className="act">{ig ? "Reply" : "Like · Reply"}</small></div>{ig && <Ic n="heartO" s={14} />}</div>
          ) : <p className="empty"><b>No comments yet</b><span>{ig ? "Start the conversation." : "Be the first to comment."}</span></p>}
        </div>
        <div className="add"><Av who={who} size={28} /><span>Add a comment…</span></div>
      </div>
    </>
  );
}

function TikTok({ caption, video, who }: PreviewProps) {
  const [open, setOpen] = useState(false);
  const c = clamp(caption, `400 ${14.5 * PT}px ${tiktokSans.style.fontFamily}`, 280 - 98 * PT, 2, " more");
  return (
    <div className={`pv-scr pv-tt ${tiktokSans.variable}`}>
      <StatusBar color="#fff" />
      <div className="pv-vid" style={{ bottom: "calc(83 * var(--p))" }}><Video src={video} /></div>
      <div className="pv-tt-top pv-sh"><span className="pv-tt-live"><Ic n="live" s={27} /></span><div className="pv-tt-tabs"><span>Following</span><b>For You</b></div><span className="pv-tt-srch"><Ic n="search" s={25} /></span></div>
      <div className="pv-rail pv-sh" style={{ "--rr": 25 } as CSSProperties}>
        <span className="it" style={{ top: "45%" }}><span className="pv-tt-av"><Pic src={who.avatar} /><i>+</i></span></span>
        <span className="it" style={{ top: "55.2%" }}><Ic n="heartF" s={35} /><span>0</span></span>
        <span className="it" style={{ top: "62.8%" }}><Ic n="cmtF" s={33} /><span>0</span></span>
        <span className="it" style={{ top: "70.3%" }}><Ic n="bookmarkF" s={31} /><span>0</span></span>
        <span className="it" style={{ top: "77.8%" }}><Ic n="shareF" s={32} /><span>0</span></span>
        <span className="it" style={{ top: "85.7%" }}><span className="pv-disc"><Pic src={who.avatar} /></span></span>
      </div>
      {open && <div className="pv-dim" onClick={() => setOpen(false)} />}
      <div className={`pv-tt-txt pv-sh${open ? " open" : ""}`}>
        <div className="nm">{who.name} <small>· Just now</small></div>
        {open ? <div className="cp" onClick={() => setOpen(false)}><Rich text={caption} tags="bold" at="bold" /> <More label={<b>less</b>} onClick={() => setOpen(false)} /></div>
          : <div className="cp"><Rich text={c.text} tags="bold" at="bold" />{c.cut && <> <More label={<b>more</b>} onClick={() => setOpen(true)} /></>}</div>}
        <div className="snd"><Ic n="music" s={13} /><span>original sound - {who.name}</span></div>
      </div>
      <div className="pv-bar pv-tt-bar"><Nav n="homeF" label="Home" on /><Nav n="bag" label="Shop" /><span className="b"><span className="pv-tt-create"><Ic n="plus" s={19} /></span></span><Nav n="inbox" label="Inbox" /><Nav n="user" label="Profile" /></div>
      <span className="pv-hi" style={{ color: "#fff" }} />
    </div>
  );
}

function Instagram({ caption, comment, video, who, collaborators }: PreviewProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const c = clamp(caption, `400 ${14 * PT}px ${SYS}`, 280 - 78 * PT, 1, "… more");
  return (
    <div className="pv-scr">
      <StatusBar color="#fff" />
      <div className="pv-vid" style={{ bottom: "calc(74 * var(--p))" }}><Video src={video} /></div>
      <div className="pv-ig-top pv-sh"><span className="plus"><Ic n="plus" s={26} /></span><b>Reels</b><span>Friends</span></div>
      <div className="pv-rail pv-sh" style={{ "--rr": 22 } as CSSProperties}>
        <span className="it" style={{ top: "52.4%" }}><Ic n="heartO" s={28} /><span>0</span></span>
        <button type="button" className="it pv-btn" style={{ top: "60%" }} onClick={() => setSheet(true)} aria-label="Comments"><Ic n="cmtO" s={27} /><span>{comment ? 1 : 0}</span></button>
        <span className="it" style={{ top: "67.6%" }}><Ic n="repost" s={27} /><span>0</span></span>
        <span className="it" style={{ top: "75.2%" }}><Ic n="plane" s={26} /><span>0</span></span>
        <span className="it" style={{ top: "82.4%" }}><Ic n="dots" s={24} /></span>
        <span className="it" style={{ top: "87.6%" }}><span className="pv-ig-tile"><Pic src={who.avatar} /></span></span>
      </div>
      {open && <div className="pv-dim" onClick={() => setOpen(false)} />}
      <div className={`pv-ig-txt pv-sh${open ? " open" : ""}`}>
        <div className="u"><Av who={who} size={32} /><span className="un">{who.username}{collaborators?.length ? <> and {collaborators.length === 1 ? collaborators[0] : `${collaborators.length} others`}</> : null}</span><span className="pv-follow">Follow</span></div>
        <div className="au"><Ic n="music" s={12} />{who.username} · Original audio</div>
        {open ? <div className="cp" onClick={() => setOpen(false)}><Rich text={caption} at="bold" /></div> : <div className="cp"><Rich text={c.text} at="bold" />{c.cut && <More label={<em>… more</em>} onClick={() => setOpen(true)} />}</div>}
      </div>
      <div className="pv-bar pv-ig-bar"><Nav n="homeO" s={27} /><Nav n="reels" on s={27} /><Nav n="plane" s={27} /><Nav n="search" s={27} /><NavAv who={who} /></div>
      {sheet && <CommentSheet app="instagram" comment={comment} who={who} onClose={() => setSheet(false)} />}
      <span className="pv-hi" style={{ color: "#fff" }} />
    </div>
  );
}

function Facebook({ caption, comment, video, who, fbView, theme, names }: PreviewProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  if (fbView === "reels") {
    const c = clamp(caption, `400 ${14 * PT}px ${SYS}`, 280 - 74 * PT, 1, "… See more");
    return (
      <div className="pv-scr">
        <StatusBar color="#fff" />
        <div className="pv-vid" style={{ bottom: "calc(76 * var(--p))" }}><Video src={video} /></div>
        <div className="pv-fbr-top pv-sh"><Ic n="menu" /><span>Reels</span><Ic n="plus" /><Ic n="search" s={23} /></div>
        <div className="pv-rail pv-sh" style={{ "--rr": 21 } as CSSProperties}>
          <span className="it" style={{ top: "64.6%" }}><Ic n="thumb" s={28} /><span>0</span></span>
          <button type="button" className="it pv-btn" style={{ top: "72.6%" }} onClick={() => setSheet(true)} aria-label="Comments"><Ic n="cmtO" s={27} /><span>{comment ? 1 : 0}</span></button>
          <span className="it" style={{ top: "80.6%" }}><Ic n="shareO" s={27} /><span>0</span></span>
          <span className="it" style={{ top: "87.7%" }}><Ic n="dots" s={24} /></span>
        </div>
        {open && <div className="pv-dim" onClick={() => setOpen(false)} />}
        <div className={`pv-fbr-txt pv-sh${open ? " open" : ""}`}>
          <div className="u"><Av who={who} size={32} />{who.name} <Ic n="globe" s={12} /><span className="pv-follow">Follow</span></div>
          {open ? <div className="cp" onClick={() => setOpen(false)}><Rich text={caption} at="bold" names={names} handles={false} /></div> : <div className="cp"><Rich text={c.text} at="bold" names={names} handles={false} />{c.cut && <More label={<em>… See more</em>} onClick={() => setOpen(true)} />}</div>}
        </div>
        <div className="pv-bar pv-fbr-bar"><Nav n="homeO" label="Home" /><Nav n="friends" label="Friends" /><Nav n="reels" label="Reels" on /><Nav n="store" label="Marketplace" /><Nav n="bell" label="Notifications" /><NavAv who={who} label="Profile" /></div>
        {sheet && <CommentSheet app="facebook" comment={comment} who={who} onClose={() => setSheet(false)} />}
        <span className="pv-hi" style={{ color: "#fff" }} />
      </div>
    );
  }
  const dark = theme === "dark";
  const c = clamp(caption, `400 ${15 * PT}px ${SYS}`, 280 - 28 * PT, 3, "… See more");
  return (
    <div className={`pv-scr pv-fb${dark ? " dark" : ""}`}>
      <StatusBar color={dark ? "#E4E6EB" : "#050505"} />
      <div className="pv-fb-hd"><Ic n="menu" s={22} /><span className="wm">facebook</span><span className="rc"><Ic n="plus" s={20} /></span><span className="rc"><Ic n="search" s={19} /></span><span className="rc"><Ic n="messenger" s={20} /></span></div>
      <div className="pv-fb-card">
        <div className="pv-fb-ph"><Av who={who} size={40} /><span className="n"><b>{who.name}</b><small>Just now · <Ic n="globe" s={12} /></small></span><span className="x"><Ic n="dots" s={20} /><Ic n="x" s={20} /></span></div>
        <div className="pv-fb-tx">{open ? <Rich text={caption} links tags="link" at="link" names={names} handles={false} /> : <><Rich text={c.text} links tags="link" at="link" names={names} handles={false} />{c.cut && <More label={<span className="sm">… See more</span>} onClick={() => setOpen(true)} />}</>}</div>
        <div className="pv-fb-vid"><Video src={video} /><span className="pv-mute"><Ic n="mute" s={16} /></span></div>
        <div className="pv-fb-act"><span><Ic n="thumb" s={19} /></span><span><Ic n="cmtO" s={18} /></span><span><Ic n="shareO" s={18} /></span></div>
        {comment && <div className="pv-fb-cm"><Av who={who} size={32} /><div><span className="bub"><b>{who.name}</b><span><Rich text={comment} links at="link" /></span></span><small>Just now · Like · Reply</small></div></div>}
      </div>
      <div className="pv-bar pv-fb-bar"><Nav n="homeF" label="Home" on /><Nav n="friends" label="Friends" /><Nav n="reels" label="Reels" /><Nav n="store" label="Marketplace" /><Nav n="bell" label="Notifications" /><NavAv who={who} label="Profile" /></div>
      <span className="pv-hi" style={{ color: dark ? "#E4E6EB" : "#050505" }} />
    </div>
  );
}

function Threads({ caption, comment, video, who, theme, topic: topicIn }: PreviewProps) {
  const dark = theme === "dark";
  const topic = topicIn ?? hashtags(caption)[0]?.slice(1);
  let head = caption, tail = "";
  if (threadsLength(caption) > 500) {
    let n = 0, i = 0;
    const ch = Array.from(caption);
    for (; i < ch.length; i++) { n += threadsLength(ch[i]); if (n > 500) break; }
    head = ch.slice(0, i).join("");
    tail = ch.slice(i).join("");
  }
  return (
    <div className={`pv-scr pv-th${dark ? " dark" : ""}`}>
      <StatusBar color={dark ? "#F3F5F7" : "#000"} />
      <div className="pv-th-top"><Ic n="menu2" /><Ic n="threads" s={30} /><Ic n="search" s={23} /></div>
      <div className="pv-th-cmp"><Av who={who} size={36} />What&apos;s new?</div>
      <div className="pv-th-post">
        <div className="pv-th-av"><Av who={who} size={36} />{comment && <span className="pv-th-line" />}</div>
        <div>
          <div className="pv-th-h"><b>{who.username}</b>{topic && <span className="topic">› {topic}</span>}<small>1m</small><span className="dots"><Ic n="dots" s={18} /></span></div>
          <div className="pv-th-tx"><Rich text={head} links at="link" />{tail && <span className="cut">{tail}</span>}</div>
          <div className="pv-th-media"><Video src={video} /><span className="pv-mute"><Ic n="mute" s={14} /></span></div>
          <div className="pv-th-act"><span><Ic n="heartO" s={20} /></span><span><Ic n="cmtO" s={19} /></span><span><Ic n="repost" s={19} /></span><span><Ic n="plane" s={19} /></span></div>
        </div>
        {comment && (
          <>
            <div className="pv-th-av"><Av who={who} size={36} /></div>
            <div><div className="pv-th-h"><b>{who.username}</b><small>1m</small><span className="dots"><Ic n="dots" s={18} /></span></div><div className="pv-th-tx"><Rich text={comment} links at="link" /></div></div>
          </>
        )}
      </div>
      <div className="pv-bar pv-th-bar"><Nav n="homeF" on s={27} /><Nav n="plane" /><span className="b"><span className="pv-th-new"><Ic n="plus" s={20} /></span></span><Nav n="heartO" /><Nav n="user" /></div>
      <span className="pv-hi" style={{ color: dark ? "#F3F5F7" : "#000" }} />
    </div>
  );
}

export function PhonePreview(props: PreviewProps) {
  const C = props.channel === "tiktok" ? TikTok : props.channel === "instagram" ? Instagram : props.channel === "facebook" ? Facebook : Threads;
  return <div className="pv-phone"><C {...props} /></div>;
}
