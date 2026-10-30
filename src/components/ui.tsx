"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { Emblem, type Level } from "./emblems";
import { BrandLogo, type Brand } from "./brand-logos";
import { useDemo } from "./demo";

/** A small ⓘ beside a word; tap it to read the explanation (owner, 28 Oct 2026: tooltips instead of text on the page). */
export function Tip({ text, label = "What's this?", big = false }: { text: React.ReactNode; label?: string; big?: boolean }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // The bubble sits on top of the page and is kept inside the screen (owner, 29 Oct 2026: tips went off the phone's edge).
  useLayoutEffect(() => {
    if (!open) return setPos(null);
    const b = btn.current!.getBoundingClientRect();
    const w = bubble.current?.offsetWidth ?? 280;
    const h = bubble.current?.offsetHeight ?? 60;
    setPos({
      left: Math.min(Math.max(12, b.left - 8), window.innerWidth - w - 12),
      top: b.bottom + 6 + h > window.innerHeight - 8 ? Math.max(8, b.top - h - 6) : b.bottom + 6,
    });
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  return (
    <span className="v2-tipwrap">
      <button ref={btn} type="button" className={big ? "v2-tipbtn" : "v2-tipbtn sm"} aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)} onBlur={() => setOpen(false)}>
        <Icon name="info" size={big ? 18 : 15} />
      </button>
      {open && createPortal(<span ref={bubble} className="v2-tip v2-tipfix" role="note" style={pos ?? { left: 0, top: 0, visibility: "hidden" }}>{text}</span>, document.body)}
    </span>
  );
}

/**
 * Page title row: large title, optional actions on the right. The explanation (`sub`) hides behind a small ⓘ next to the
 * title and shows on tap (owner, 28 Oct 2026: no explaining on the page itself).
 */
export function Title({ title, sub, ai = false, children }: { title: string; sub?: React.ReactNode; ai?: boolean; children?: React.ReactNode }) {
  // Same floating bubble as every other ⓘ, so it stays on screen and on top (owner, 29 Oct 2026: the title tip couldn't be seen).
  return (
    <div className="v2-title">
      <div className="v2-title-main">
        <h1>
          {/* AI tool pages lead with the AI mark (owner, 30 Oct 2026). */}
          {ai && <AiMark size={34} />}
          {title}
          {sub && <Tip big text={sub} label={`About ${title}`} />}
        </h1>
      </div>
      {children && <div className="v2-row">{children}</div>}
    </div>
  );
}

/** Counts up to `value` once on first paint (skipped when the device asks for reduced motion). */
export function Count({ value, format = (n: number) => Math.round(n).toLocaleString("en-MY"), ms = 900 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const [n, setN] = useState(value);
  const rolled = useRef(false);
  useEffect(() => {
    // After the first full roll, follow new values straight away (range switches and the like). A roll that was cut short
    // (React runs effects twice in development) starts again, so the number always rolls once.
    if (rolled.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      rolled.current = true;
      setN(value);
      return;
    }
    const finish = () => {
      rolled.current = true;
      setN(value);
    };
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      // A frame's timestamp can be a little earlier than t0, so clamp at 0.
      const p = Math.max(0, Math.min(1, (t - t0) / ms));
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    // Background tabs pause frames: land on the real number anyway.
    const done = window.setTimeout(finish, ms + 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [value, ms]);
  return <span className="v2-num">{format(n)}</span>;
}

export function Stat({ label, value, note, tone }: { label: React.ReactNode; value: React.ReactNode; note?: React.ReactNode; tone?: "up" | "down" }) {
  return (
    <div className="v2-stat">
      <small>{label}</small>
      <b>{value}</b>
      {note && <em className={tone}>{note}</em>}
    </div>
  );
}

/** Horizontal bars: label, meter, value. */
export function Bars({ rows, tone }: { rows: { label: string; value: number; display?: string; tone?: "red" | "amber" | "blue"; onPick?: () => void; href?: string }[]; tone?: "red" | "amber" | "blue" }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="v2-bars">
      {rows.map((r, i) => (
        <div className="v2-bar" key={r.label}>
          {/* A product row opens the product: a link, so no underline (owner, 29 Oct 2026). */}
          {r.href ? <Link href={r.href} className="v2-bar-pick" title={r.label}>{r.label}</Link> : r.onPick ? <button type="button" className="v2-bar-pick" title={r.label} onClick={r.onPick}>{r.label}</button> : <span title={r.label}>{r.label}</span>}
          <span className="v2-meter"><i className={r.tone ?? tone} style={{ width: `${(r.value / max) * 100}%`, animationDelay: `${i * 60}ms` }} /></span>
          <b>{r.display ?? r.value}</b>
        </div>
      ))}
    </div>
  );
}

/** Column chart with an x-axis. */
export function Columns({ values, labels }: { values: number[]; labels?: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className="v2-colchart">
        {values.map((v, i) => (
          <span key={i} style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 40}ms` }} title={String(v)} />
        ))}
      </div>
      {labels && (
        <div className="v2-axis">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  return (
    <div className="v2-prog" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

/** iOS segmented control. */
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly T[] | T[]; onChange: (v: T) => void }) {
  return (
    <div className="np-seg" role="group">
      {options.map((o) => (
        <button key={o} type="button" className={o === value ? "on" : undefined} aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

/** − n + for small whole numbers (wish-list commitments, admin thresholds). */
export function Stepper({ value, onChange, label, min = 0, max = 99 }: { value: number; onChange: (n: number) => void; label: string; min?: number; max?: number }) {
  return (
    <span className="v2-stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Less: ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Icon name="minus" size={16} width={2.4} /></button>
      <b aria-live="polite">{value}</b>
      <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" size={16} width={2.4} /></button>
    </span>
  );
}

/** Renders children at the end of <body> once the page is in the browser. */
export function Portal({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  return host ? createPortal(children, host) : null;
}

/** Bottom sheet on phones, centred card on desktop (`wide` for two columns). Escape or a tap outside closes it. */
export function Sheet({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <Portal>
      <div className="v2-backdrop" onClick={onClose}>
        <div className={`v2-sheet ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
          <span className="v2-sheet-grab" />
          <h2>{title}</h2>
          <button type="button" className="v2-iconbtn v2-sheet-x" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
          {children}
        </div>
      </div>
    </Portal>
  );
}

/**
 * Before removing products from her showcase (owner, 28 Oct 2026): TikTok doesn't say whether videos already linking a product
 * keep working, so she sees the risk and confirms she takes responsibility. The Remove button works only after the tick.
 */
export function RemoveWarn({ items, onConfirm, onClose }: { items: { id: string; name: string; img: string }[]; onConfirm: () => void; onClose: () => void }) {
  const [ok, setOk] = useState(false);
  const many = items.length > 1;
  return (
    <Sheet title={many ? `Remove ${items.length} products?` : "Remove this product?"} onClose={onClose}>
      <div className="rw-items">
        {items.slice(0, 4).map((p) => (
          <span key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt="" />
            <b>{p.name}</b>
          </span>
        ))}
        {items.length > 4 && <small>+{items.length - 4} more</small>}
      </div>
      <ul className="rw-risk">
        <li><Icon name="alert" size={16} /> TikTok may also remove {many ? "their links" : "its link"} from your videos and LIVE. Those videos could stop earning.</li>
        <li><Icon name="alert" size={16} /> A locked commission rate may end.</li>
      </ul>
      <label className="rw-ok">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>I understand the risk and take responsibility for this.</span>
      </label>
      <div className="v2-row" style={{ gap: 8 }}>
        <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Keep</button>
        <button type="button" className="np-btn rw-go" style={{ flex: 1 }} disabled={!ok} onClick={onConfirm}>Remove</button>
      </div>
    </Sheet>
  );
}

/** A made-up QR pattern for the invite code on share cards. */
export function Qr() {
  const cells: [number, number][] = [];
  let seed = 7;
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) {
      seed = (seed * 9301 + 49297) % 233280;
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      if (finder) {
        const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y;
        if (fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5)) cells.push([x, y]);
      } else if (seed / 233280 > 0.55) cells.push([x, y]);
    }
  return (
    <span className="v2-qr" aria-label="Invite QR code">
      <svg viewBox="0 0 21 21" shapeRendering="crispEdges">
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0b1a13" />
        ))}
      </svg>
    </span>
  );
}

const CONFETTI = ["#00c073", "#22dc95", "#f5a623", "#e8005a", "#25f4ee", "#ffd34d"];

/** Full-screen celebration: medal, what was earned, one line of encouragement, share or continue. */
export function Celebrate({ title, line, cheer, onShare, onClose, tone = "gold", icon = "trophy" }: {
  title: string; line: string; cheer: string; onShare?: () => void; onClose: () => void; tone?: "gold" | "green"; icon?: Parameters<typeof Icon>[0]["name"];
}) {
  return (
    <Portal>
    <div className="v2-celebrate" onClick={onClose}>
      <div className="v2-cele-card" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="v2-confetti" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 7) * 90}ms`, transform: `rotate(${i * 23}deg)` }} />
          ))}
        </div>
        <span className={`v2-medal ${tone === "green" ? "green" : ""}`}><Icon name={icon} size={46} width={2.2} /></span>
        <h2>{title}</h2>
        <p style={{ fontWeight: 800, color: "var(--gink)" }}>{line}</p>
        <p>{cheer}</p>
        <div className="v2-stack" style={{ width: "100%", marginTop: 6 }}>
          {onShare && (
            <button type="button" className="np-btn" onClick={onShare}>
              <Icon name="share" size={18} /> Share this moment
            </button>
          )}
          <button type="button" className="btn-outline" onClick={onClose}>Continue</button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

const SHARE_TO: (Brand | "More")[] = ["TikTok", "WhatsApp", "Instagram", "Facebook", "Telegram", "X", "More"];

/** Where a card goes, and its real size there. Portrait or landscape only (owner, 30 Oct 2026): more sizes squeezed the words. */
const FORMATS = [
  { key: "story", label: "Portrait", ratio: "9 / 16" },
  { key: "wide", label: "Landscape", ratio: "16 / 9" },
] as const;
const DESIGNS = ["Pastel", "Certificate", "Night"] as const;
/** What is being shared. Every moment gets its own hero inside the same branded frame (owner, 28 Oct 2026). */
export type MomentKind = "streak" | "level" | "badge" | "credits" | "mission" | "sample" | "invite";
/** An invite card's own details (owner, 30 Oct 2026): her code, what the friend gets, her own invite link and photo. */
export type InviteInfo = { code: string; reward: number; link: string; photo?: string; kick?: string; tag?: string };

/**
 * The invite card, made like a story (owner, 30 Oct 2026): Rimau waving them in, one big line, what they get and her code on a
 * ticket. Her photo shows once, at the bottom. Few words so nothing is squeezed. Same frame, sizes and styles as other cards.
 */
function InviteCard({ invite, big, handle, fmt, design, video, ratio }: { invite: InviteInfo; big: string; handle: string; fmt: string; design: number; video: boolean; ratio: string }) {
  const initials = handle.replace("@", "").slice(0, 2).toUpperCase();
  return (
    <div className={`v2-story ds${design} ${fmt} ${video ? "vid" : ""} inv-card`} style={{ aspectRatio: ratio }} role="img" aria-label={`${big}. Use code ${invite.code} for +${invite.reward} credits. ${invite.link}`}>
      {video && <span className="v2-vbar" aria-hidden="true"><span /></span>}
      <span className="st-head">
        <span className="st-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/master-logo-transparent.png" alt="" />
          Rezekii
        </span>
        <span className="st-partner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" />
        </span>
      </span>
      <span className="inv-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="inv-rimau" src="/mascot/rimau-wave.webp" alt="" />
        <span className="inv-text">
          <span className="inv-kick">{invite.kick ?? "You're invited"}</span>
          <strong className="inv-h">{big}</strong>
          {invite.tag && <span className="inv-tag">{invite.tag}</span>}
          <span className="inv-tk">
            <span className="l"><b>+{invite.reward}</b><small>credits for you</small></span>
            <span className="r"><small>Code</small><b>{invite.code}</b></span>
          </span>
        </span>
      </span>
      <span className="st-foot">
        {invite.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="inv-foot-av" src={invite.photo} alt="" />
        ) : <span className="v2-av">{initials}</span>}
        <span className="st-foot-txt"><b>{handle}</b><small>{invite.link}</small></span>
        <Qr />
      </span>
    </div>
  );
}
const num = (s: string) => Number(/\d+/.exec(s.replace(/,/g, ""))?.[0] ?? 0);

/** The picture in the middle of a share card: a flame, a podium, a rosette, a receipt, a stamp card, a parcel label or a ticket. */
function MomentHero({ moment, big, lines, level, size }: { moment: MomentKind; big: string; lines: string[]; level?: Level; size: number }) {
  const n = num(big);
  if (moment === "streak") return (
    <span className="mo-streak">
      <span className="mo-flame">
        <svg viewBox="0 0 64 80" aria-hidden="true">
          <defs><linearGradient id="mo-fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff3d00" /><stop offset="0.55" stopColor="#ff8a00" /><stop offset="1" stopColor="#ffd23f" /></linearGradient></defs>
          <path d="M32 2c4 16 22 24 22 46a22 22 0 0 1-44 0c0-10 5-16 10-21 0 8 4 13 8 14-4-14 2-28 4-39z" fill="url(#mo-fl)" />
          <path d="M32 40c2 7 10 10 10 19a10 10 0 0 1-20 0c0-5 3-8 5-10 0 3 2 5 3 5-1-5 1-10 2-14z" fill="#fff3c4" opacity="0.55" />
        </svg>
        <b>{n}</b>
      </span>
      <span className="mo-week" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} className={i < Math.min(7, n) ? "on" : undefined} />)}</span>
    </span>
  );
  if (moment === "level") return (
    <span className="mo-podium">
      <span className="mo-emb">{level ? <Emblem level={level} size={size} animate /> : <span className="st-medal"><Icon name="medal" size={30} width={2.2} /></span>}</span>
      <span className="mo-steps" aria-hidden="true"><i>2</i><i className="top">1</i><i>3</i></span>
    </span>
  );
  if (moment === "badge") return (
    <span className="mo-rosette">
      <span className="mo-tails" aria-hidden="true"><i /><i /></span>
      <span className="st-medal"><Icon name="medal" size={30} width={2.2} /></span>
    </span>
  );
  if (moment === "credits") return (
    <span className="mo-receipt">
      <b className="mo-rc-h">Credits earned</b>
      {lines.map((l) => <span key={l} className="mo-rc-row"><span>{l}</span><Icon name="check" size={12} width={3} /></span>)}
      <span className="mo-rc-total"><span>Total</span><b>{big}</b></span>
    </span>
  );
  if (moment === "mission") return (
    <span className="mo-stamps" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <i key={i} className={i < n ? "on" : undefined}>{i < n && <Icon name="check" size={14} width={3} />}</i>)}
    </span>
  );
  if (moment === "sample") return (
    <span className="mo-label">
      <span className="mo-lb-top"><Icon name="box" size={16} /><b>Free sample</b></span>
      <span className="mo-bars" aria-hidden="true" />
      <span className="mo-lb-stamp"><Icon name="check" size={12} width={3} /> Delivered on time</span>
    </span>
  );
  return (
    <span className="mo-ticket">
      <Icon name="users" size={22} />
      <b>Invite</b>
      <small>Admit one</small>
    </span>
  );
}
/** The blessing line on every card, from V1. */
const BLESS = [
  "Rezeki tak pernah salah alamat. Today it found you.",
  "May every post bring more rezeki, and every sale bring more joy.",
  "Semoga rezeki terus melimpah dan usaha dipermudahkan.",
  "Small steps, big blessings. Keep shining, keep sharing.",
  "Your hard work became someone else's good find. Thank you for sharing it.",
];

/**
 * "Share your proud moment" (V1's share window): the card in 3 designs, sized for each platform, as an image or a 5-second
 * video, with a blessing, a caption and the apps to send it to. Shows achievements, never sales.
 */
export function ShareSheet({ onClose, big, label, lines, handle = "@aisyah.glow", level, kicker = "Proud moment", caption: captionInit, onShared, title, card, moment, extra, invite }: {
  onClose: () => void; big: string; label: string; lines: string[]; handle?: string; level?: Level; kicker?: string; caption?: string;
  /** An invite: the card shows her code and reward, and Copy link copies her own invite link. */
  invite?: InviteInfo;
  /** Which hero the card shows; without one it keeps the medal. */
  moment?: MomentKind;
  /** Extra choices shown above the caption, for a ready-made card. */
  extra?: React.ReactNode;
  title?: string;
  /** A ready-made 9:16 card (like a recap cover) shared as it is, instead of the achievement card and its styles. */
  card?: React.ReactNode;
  /** Called once the card has gone out to an app (on a phone: when the share menu reports it was sent). */
  onShared?: (where: string) => void;
}) {
  const { toast } = useDemo();
  const [fmt, setFmt] = useState<(typeof FORMATS)[number]["key"]>("story");
  const [design, setDesign] = useState(0);
  const [video, setVideo] = useState(false);
  const [bless, setBless] = useState(0);
  const [caption, setCaption] = useState(
    captionInit ??
      (invite
        ? `${big}! Use my code ${invite.code} and get +${invite.reward} credits. ${label}. https://${invite.link} #RezekiiAffiliate #RezekiiMY`
        : `Alhamdulillah! ${label}: ${big} on Rezekii 🎉 #RezekiiAffiliate #RezekiiMY`),
  );
  // Copy link copies the link that is hers: her invite link on an invite card, else her profile (owner, 30 Oct 2026).
  const link = invite ? `https://${invite.link}` : `https://rezekii.com/c/${handle.replace("@", "")}`;
  const copyLink = () => {
    try {
      void navigator.clipboard?.writeText(link).catch(() => {});
    } catch {}
    toast(`Link copied: ${link.replace("https://", "")}`);
  };
  const f = FORMATS.find((x) => x.key === fmt)!;
  const initials = handle.startsWith("@") ? handle.slice(1, 3).toUpperCase() : handle.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const send = (app: string) => {
    toast(app === "More" ? "Opening your phone's share menu…" : `Opening ${app} with your ${video ? "video" : "image"} and caption…`);
    // Preview: the share counts a moment later, as if the app confirmed it was posted.
    if (onShared) window.setTimeout(() => onShared(app), 1200);
  };

  return (
    <Sheet title={title ?? (invite ? "Share your invite" : "Share your proud moment")} onClose={onClose} wide>
      <div className="v2-shgrid">
        <div className="v2-shleft">
          {/* Size as two small icons above the card (owner, 30 Oct 2026), not a big row. */}
          {!card && (
            <div className="v2-shsize" role="group" aria-label="Size">
              {FORMATS.map((x) => (
                <button key={x.key} type="button" className={fmt === x.key ? "on" : undefined} aria-pressed={fmt === x.key} aria-label={`${x.label} ${x.ratio.replace(" / ", ":")}`} title={`${x.label} ${x.ratio.replace(" / ", ":")}`} onClick={() => setFmt(x.key)}>
                  <i className={x.key} />
                </button>
              ))}
            </div>
          )}
          {card ? <div className="v2-shcover">{card}</div> : invite ? (
            <InviteCard invite={invite} big={big} handle={handle} fmt={fmt} design={design} video={video} ratio={f.ratio} />
          ) : (
          <div className={`v2-story ds${design} ${fmt} ${video ? "vid" : ""} ${moment ? `mo mo-${moment}-card` : ""}`} style={{ aspectRatio: f.ratio }} role="img" aria-label={`${label}: ${big}. ${BLESS[bless]}`}>
            {video && <span className="v2-vbar" aria-hidden="true"><span /></span>}
            <span className="st-head">
              <span className="st-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/master-logo-transparent.png" alt="" />
                Rezekii
              </span>
              <span className="st-partner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" />
              </span>
            </span>
            <span className="st-mid">
              <span className="st-hero">
                {moment ? <MomentHero moment={moment} big={big} lines={lines} level={level} size={fmt === "wide" ? 52 : 64} /> : level ? <Emblem level={level} size={fmt === "wide" ? 60 : 78} animate /> : <span className="st-medal"><Icon name="medal" size={30} width={2.2} /></span>}
              </span>
              <span className="st-body">
                <span className="st-kick st-t">{kicker} · Oct 2026</span>
                <span className="st-lbl st-t">{label}</span>
                <strong className="st-big st-t">{big}</strong>
                {lines.length > 0 && <span className="st-pills st-t">{lines.map((l) => <span key={l}>{l}</span>)}</span>}
              </span>
            </span>
            {fmt === "story" && <span className="st-quote">&ldquo;{BLESS[bless]}&rdquo;</span>}
            <span className="st-foot">
              <span className="v2-av">{initials}</span>
              <span className="st-foot-txt"><b>{handle}</b><small>Join me on Rezekii</small></span>
              <Qr />
            </span>
          </div>
          )}
        </div>

        <div className="v2-shright">
          {!card && <Seg value={DESIGNS[design]} options={DESIGNS} onChange={(d) => setDesign(DESIGNS.indexOf(d))} />}
          {extra}
          {!extra && <Seg value={video ? "Video · 5 sec" : "Image"} options={["Image", "Video · 5 sec"] as const} onChange={(v) => setVideo(v !== "Image")} />}
          {!card && !invite && <div className="v2-bless">
            <span aria-hidden="true">✨</span>
            <span><b>Blessing on your card</b><small>{BLESS[bless]}</small></span>
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => setBless((b) => (b + 1) % BLESS.length)}>Another</button>
          </div>}
          <label className="v2-field">
            Caption
            <textarea className="np-input v2-caption" rows={5} value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))} />
          </label>
          <div className="v2-apps" role="group" aria-label="Share to">
            {/* Real logos only, no names (owner, 30 Oct 2026); the name is still read out and shown on hover. */}
            {SHARE_TO.map((name) => (
              <button key={name} type="button" className="v2-app" onClick={() => send(name)} aria-label={`Share to ${name}`} title={name}>
                <span className={name === "More" ? "ic more" : "ic"}>
                  {name === "More" ? <Icon name="share" size={20} /> : <BrandLogo name={name} size={42} />}
                </span>
              </button>
            ))}
          </div>
          <div className="v2-row" style={{ gap: 8 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={copyLink}><Icon name="link" size={17} /> Copy link</button>
            <button type="button" className="np-btn" style={{ flex: 1 }} onClick={() => toast(video ? "Video saved" : "Image saved")}><Icon name="arrow" size={17} /> Save {video ? "video" : "image"}</button>
          </div>
          {!card && <p className="v2-small" style={{ margin: 0 }}>Shows your achievement and invite QR, never your sales.</p>}
        </div>
      </div>
    </Sheet>
  );
}

/** Blurs key numbers until TikTok Shop is linked (blueprint 7.3); everything else stays usable. */
export function Lock({ children, what = "commission" }: { children: React.ReactNode; what?: string }) {
  const { linked, setLinked } = useDemo();
  if (linked) return <>{children}</>;
  return (
    <div className="v2-lock" style={{ borderRadius: 22 }}>
      <div className="v2-blur" aria-hidden="true">{children}</div>
      <div className="v2-lock-cover">
        <Icon name="lock" size={26} />
        <b>Link TikTok Shop to see {what}</b>
        <span className="v2-small">It also proves you're a real creator.</span>
        <button type="button" className="np-btn v2-btn-sm" onClick={() => setLinked(true)}>Link TikTok Shop</button>
      </div>
    </div>
  );
}

/** Small blurred number for inline use. */
export function Hidden({ children }: { children: React.ReactNode }) {
  const { linked } = useDemo();
  return linked ? <>{children}</> : <span className="v2-blur" style={{ display: "inline-block" }}>{children}</span>;
}

export function Empty({ title, line, href, cta }: { title: string; line: string; href?: string; cta?: string }) {
  return (
    <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
      <b>{title}</b>
      <span className="v2-muted">{line}</span>
      {href && cta && <Link href={href} className="np-btn v2-btn-sm">{cta}</Link>}
    </div>
  );
}

/**
 * The one AI header (owner, 29 Oct 2026): AI icon, the section's name with the Rezekii AI chip, and an optional line under it.
 * Every AI section uses it, once per card. `children` sit on the right (a button or a pill).
 */
export function AiHead({ title, sub, tip, busy = false, children }: { title: React.ReactNode; sub?: React.ReactNode; tip?: React.ReactNode; busy?: boolean; children?: React.ReactNode }) {
  return (
    <div className="v2-aihead">
      <AiMark size={40} busy={busy} />
      <span className="v2-aihead-main">
        <span className="v2-aihead-t">
          <h2 className="v2-h2">{title}{tip}</h2>
          <AiTag label="Rezekii AI" bare />
        </span>
        {sub && <small>{sub}</small>}
      </span>
      {children}
    </div>
  );
}

/** The AI chip. Next to the AI icon it's text only (`bare`), so a section never shows two AI icons (owner, 29 Oct 2026). */
export function AiTag({ label = "AI", bare = false, inline = false }: { label?: string; bare?: boolean; inline?: boolean }) {
  return (
    <span className={`v2-aitag ${inline ? "inl" : ""}`} aria-label={label}>
      {!bare && (
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <path d="M11 3Q12 11 20 12Q12 13 11 21Q10 13 2 12Q10 11 11 3Z" fill="currentColor" />
          <path d="M19 1.5Q19.3 4.7 22.5 5Q19.3 5.3 19 8.5Q18.7 5.3 15.5 5Q18.7 4.7 19 1.5Z" fill="currentColor" />
        </svg>
      )}
      {label}
    </span>
  );
}

/** The AI mark: a turning colour orb with a sparkle, shown wherever the AI speaks. `busy` spins faster while it works. */
export function AiMark({ size = 44, busy = false }: { size?: number; busy?: boolean }) {
  return (
    <span className={`v2-aimark ${busy ? "busy" : ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.54)} height={Math.round(size * 0.54)}>
        <path d="M11 3Q12 11 20 12Q12 13 11 21Q10 13 2 12Q10 11 11 3Z" fill="currentColor" />
        <path className="s2" d="M19 1.5Q19.3 4.7 22.5 5Q19.3 5.3 19 8.5Q18.7 5.3 15.5 5Q18.7 4.7 19 1.5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

type FlowStep = { icon: Parameters<typeof Icon>[0]["name"]; title: string; note?: string; tone?: "red" | "dark" };
/** A picture instead of a paragraph: steps with icons, joined by arrows (a column on phones). */
export function Flow({ steps, label }: { steps: FlowStep[]; label: string }) {
  return (
    <ol className="v2-flow" aria-label={label}>
      {steps.map((s) => (
        <li key={s.title} className={s.tone}>
          <span className="ic"><Icon name={s.icon} size={20} /></span>
          <b>{s.title}</b>
        </li>
      ))}
    </ol>
  );
}
