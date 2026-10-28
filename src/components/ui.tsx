"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { Emblem, SHARE_APPS, type Level } from "./emblems";
import { useDemo } from "./demo";

/** Page title row: large title, one line under it, optional actions on the right. */
export function Title({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="v2-title">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="v2-row">{children}</div>}
    </div>
  );
}

/** Counts up to `value` once on first paint (skipped when the device asks for reduced motion). */
export function Count({ value, format = (n: number) => Math.round(n).toLocaleString("en-MY"), ms = 900 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const [n, setN] = useState(value);
  const started = useRef(false);
  useEffect(() => {
    // After the first roll, follow new values straight away (range switches and the like).
    if (started.current) {
      setN(value);
      return;
    }
    started.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      // A frame's timestamp can be a little earlier than t0, so clamp at 0.
      const p = Math.max(0, Math.min(1, (t - t0) / ms));
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    // Background tabs pause frames: land on the real number anyway.
    const done = window.setTimeout(() => setN(value), ms + 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [value, ms]);
  return <span className="v2-num">{format(n)}</span>;
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: "up" | "down" }) {
  return (
    <div className="v2-stat">
      <small>{label}</small>
      <b>{value}</b>
      {note && <em className={tone}>{note}</em>}
    </div>
  );
}

/** Horizontal bars: label, meter, value. */
export function Bars({ rows, tone }: { rows: { label: string; value: number; display?: string; tone?: "red" | "amber" | "blue" }[]; tone?: "red" | "amber" | "blue" }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="v2-bars">
      {rows.map((r, i) => (
        <div className="v2-bar" key={r.label}>
          <span title={r.label}>{r.label}</span>
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

/** Where a card goes, and its real size there. */
const FORMATS = [
  { key: "story", label: "Story", ratio: "9 / 16", size: "1080 × 1920", where: "TikTok, Instagram and WhatsApp stories" },
  { key: "post", label: "Post", ratio: "4 / 5", size: "1080 × 1350", where: "Instagram and Facebook feed" },
  { key: "square", label: "Square", ratio: "1 / 1", size: "1080 × 1080", where: "Threads, X and chats" },
  { key: "wide", label: "Wide", ratio: "1.91 / 1", size: "1200 × 630", where: "Facebook and X link posts" },
] as const;
const DESIGNS = ["Pastel", "Certificate", "Night"] as const;
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
export function ShareSheet({ onClose, big, label, lines, handle = "@aisyah.glow", level, kicker = "Proud moment" }: {
  onClose: () => void; big: string; label: string; lines: string[]; handle?: string; level?: Level; kicker?: string;
}) {
  const { toast } = useDemo();
  const [fmt, setFmt] = useState<(typeof FORMATS)[number]["key"]>("story");
  const [design, setDesign] = useState(0);
  const [video, setVideo] = useState(false);
  const [bless, setBless] = useState(0);
  const [caption, setCaption] = useState(`Alhamdulillah! ${label}: ${big} on Rezekii 🎉 #RezekiiCreator #TikTokShopMY`);
  const f = FORMATS.find((x) => x.key === fmt)!;
  const initials = handle.startsWith("@") ? handle.slice(1, 3).toUpperCase() : handle.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const send = (app: string) => toast(app === "More" ? "Opening your phone's share menu…" : `Opening ${app} with your ${video ? "video" : "image"} and caption…`);

  return (
    <Sheet title="Share your proud moment" onClose={onClose} wide>
      <div className="v2-shgrid">
        <div className="v2-shleft">
          <div className={`v2-story ds${design} ${fmt} ${video ? "vid" : ""}`} style={{ aspectRatio: f.ratio }} role="img" aria-label={`${label}: ${big}. ${BLESS[bless]}`}>
            {video && <span className="v2-vbar" aria-hidden="true"><span /></span>}
            <span className="st-bub" aria-hidden="true" style={{ width: 90, height: 90, left: -24, top: "12%" }} />
            <span className="st-bub b2" aria-hidden="true" style={{ width: 120, height: 120, right: -40, top: "48%" }} />
            <span className="st-bub b3" aria-hidden="true" style={{ width: 70, height: 70, left: "12%", bottom: "16%" }} />
            <span className="st-hero">
              {level ? <Emblem level={level} size={fmt === "wide" ? 70 : 84} animate /> : <span className="st-medal"><Icon name="medal" size={34} width={2.2} /></span>}
            </span>
            <span className="st-body">
              <span className="st-chip st-t">✦ {kicker.toUpperCase()} · OCT 2026</span>
              <span className="st-who st-t"><span className="v2-av">{initials}</span>{handle}</span>
              <span className="st-lbl st-t">{label}</span>
              <strong className="st-big st-t">{big}</strong>
              {lines.map((l) => <span key={l} className="st-line st-t">{l}</span>)}
              {fmt !== "wide" && <span className="st-quote">&ldquo;{BLESS[bless]}&rdquo;</span>}
            </span>
            <span className="st-cobrand">
              <span className="st-cb-side">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/master-logo-transparent.png" alt="" className="st-cb-logo" />
                <span className="st-cb-txt"><b>Rezekii</b><small>Join with my link</small></span>
              </span>
              <span className="st-cb-side st-cb-tt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="st-cb-plogo" src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" />
              </span>
              <Qr />
            </span>
          </div>
          <span className="v2-small" style={{ textAlign: "center" }}>{f.size} px · {f.where}</span>
        </div>

        <div className="v2-shright">
          <div className="v2-shfmt" role="group" aria-label="Size">
            {FORMATS.map((x) => (
              <button key={x.key} type="button" className={fmt === x.key ? "on" : undefined} aria-pressed={fmt === x.key} onClick={() => setFmt(x.key)}>
                <i style={{ aspectRatio: x.ratio }} />
                <b>{x.label}</b>
                <small>{x.ratio.replace(" / ", ":")}</small>
              </button>
            ))}
          </div>
          <Seg value={DESIGNS[design]} options={DESIGNS} onChange={(d) => setDesign(DESIGNS.indexOf(d))} />
          <Seg value={video ? "Video · 5 sec" : "Image"} options={["Image", "Video · 5 sec"] as const} onChange={(v) => setVideo(v !== "Image")} />
          <div className="v2-bless">
            <span aria-hidden="true">✨</span>
            <span><b>Blessing on your card</b><small>{BLESS[bless]}</small></span>
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => setBless((b) => (b + 1) % BLESS.length)}>Another</button>
          </div>
          <label className="v2-field">
            Caption
            <textarea className="np-input" rows={2} value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))} />
          </label>
          <div className="v2-apps" role="group" aria-label="Share to">
            {SHARE_APPS.map(([name, bg, d, fill, stroke, sw]) => (
              <button key={name} type="button" className="v2-app" onClick={() => send(name)}>
                <span className="ic" style={{ background: bg }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {name}
              </button>
            ))}
          </div>
          <div className="v2-row" style={{ gap: 8 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => toast("Link copied: rezekii.com/c/aisyah.glow")}><Icon name="link" size={17} /> Copy link</button>
            <button type="button" className="np-btn" style={{ flex: 1 }} onClick={() => toast(video ? "Video saved" : "Image saved")}><Icon name="arrow" size={17} /> Save {video ? "video" : "image"}</button>
          </div>
          <p className="v2-small" style={{ margin: 0 }}>On a phone, Share opens your phone&apos;s own share menu with the {video ? "video" : "image"} attached. The card shows your achievement and invite QR, never your sales.</p>
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
