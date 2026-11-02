"use client";

import "@/app/join-board.css";
import { useEffect, useState } from "react";
import { Tip, withParts } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

type Joiner = { name: string; role: "Creator" | "Seller"; state: string; gap: number; img?: string };

/**
 * Sample entries. The real board uses each person's TikTok profile picture; we only have one avatar image here,
 * so the rest are coloured initials. `gap` = minutes after the one before it joined.
 */
const JOINERS: Joiner[] = [
  { name: "@aisyah.glow", role: "Creator", state: "Selangor", gap: 2, img: "/avatars/aisyah.jpg" },
  { name: "Kopi Senja", role: "Seller", state: "Johor", gap: 3 },
  { name: "@danial.vlogs", role: "Creator", state: "Johor", gap: 1 },
  { name: "@nurul.beauty", role: "Creator", state: "Kuala Lumpur", gap: 4 },
  { name: "Batik Laila", role: "Seller", state: "Terengganu", gap: 2 },
  { name: "@farah.home", role: "Creator", state: "Perak", gap: 3 },
  { name: "@ahmad.fitlife", role: "Creator", state: "Penang", gap: 2 },
  { name: "Halia Herbs", role: "Seller", state: "Pahang", gap: 5 },
  { name: "@siti.deco", role: "Creator", state: "Kedah", gap: 1 },
  { name: "Kraf Rotan", role: "Seller", state: "Kelantan", gap: 3 },
];
const BG = ["linear-gradient(135deg,#22dc95,#00a862)", "linear-gradient(135deg,#7aa2ff,#1d4ed8)", "linear-gradient(135deg,#ffb35c,#f08a00)", "linear-gradient(135deg,#ff7aa8,#e8005a)", "linear-gradient(135deg,#b28dff,#6d28d9)", "linear-gradient(135deg,#5ee7df,#0e9488)"];
const ROWS = 5;
const EVERY = 3200;

/** Hides a name after its first 3 characters: "@aisyah.glow" → "@ais••••", "Kopi Senja" → "Kop••••". Always 4 dots, so the length stays hidden. */
export function maskName(name: string) {
  const at = name.startsWith("@") ? "@" : "";
  return `${at}${name.slice(at.length, at.length + 3)}••••`;
}

const pick = (i: number) => JOINERS[((i % JOINERS.length) + JOINERS.length) % JOINERS.length];

/**
 * Who's Joining (owner, 29 Oct 2026): social proof that real TikTok Shop sellers and creators use Rezekii.
 * Picture, masked name, Creator or Seller, state and time; a new person slides in every few seconds (still for reduced motion).
 * PDPA: only people who agreed to be shown appear, and names are never shown in full.
 */
/** A new person every few seconds, and the totals count up with them (still for reduced motion). */
function useJoins(creators: number, sellers: number) {
  const [tick, setTick] = useState({ step: 0, creators, sellers });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setTick((s) => {
      const next = pick(s.step + 1);
      return { step: s.step + 1, creators: s.creators + (next.role === "Creator" ? 1 : 0), sellers: s.sellers + (next.role === "Seller" ? 1 : 0) };
    }), EVERY);
    return () => window.clearInterval(id);
  }, []);
  return tick;
}

const n = (v: number) => v.toLocaleString("en-MY");

function Avatar({ j, className }: { j: Joiner; className: string }) {
  return j.img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={j.img} alt="" />
  ) : (
    <span className={className} style={{ background: BG[JOINERS.indexOf(j) % BG.length] }} aria-hidden="true">{j.name.replace(/^@/, "")[0].toUpperCase()}</span>
  );
}

/**
 * Who's Joining as one line along the top of the landing pages (owner, 29 Oct 2026): the newest person slides up into place;
 * the totals show on wider screens. Same people and rules as the board.
 */
export function JoinBar({ creators = 1248, sellers = 312 }: { creators?: number; sellers?: number }) {
  const t = useT();
  const tick = useJoins(creators, sellers);
  const j = pick(tick.step);
  const who = <b>{maskName(j.name)}</b>;
  return (
    <div className="jbar">
      <div className="site-wrap jbar-in">
        <span className="jb-live"><i aria-hidden="true" /> {t("Live")}</span>
        <span className="jbar-win">
          <span key={tick.step} className="jbar-msg">
            <Avatar j={j} className="jbar-av" />
            {withParts(j.role === "Seller" ? t("{name} from {state} joined as a seller") : t("{name} from {state} joined as a creator"), { name: who, state: j.state })}
          </span>
        </span>
        <span className="jbar-tot">{withParts(t("{creators} creators · {sellers} sellers"), { creators: <b>{n(tick.creators)}</b>, sellers: <b>{n(tick.sellers)}</b> })}</span>
      </div>
    </div>
  );
}

export function JoinBoard({ title, creators = 1248, sellers = 312 }: { title?: string; creators?: number; sellers?: number }) {
  const t = useT();
  const tick = useJoins(creators, sellers);

  // Newest first. One extra row sits below the window so the list can slide down by one.
  let mins = 0;
  const rows = Array.from({ length: ROWS + 1 }, (_, k) => {
    const id = tick.step - k;
    const j = pick(id);
    if (k) mins += pick(id + 1).gap;
    return { id, j, mins };
  });
  return (
    <div className="jb">
      <div className="jb-head">
        {title && <h2 className="v2-h2">{title}</h2>}
        <span className="jb-note">{t("Names hidden")}<Tip text={t("Only people who agreed to be shown appear here. Names are hidden.")} label={t("About this list")} /></span>
        <span className="jb-live"><i aria-hidden="true" /> {t("Live")}</span>
      </div>
      <div className="jb-body">
        <p className="jb-tot">
          <span>{withParts(t("{n} creators"), { n: <b>{n(tick.creators)}</b> })}</span>
          <span>{withParts(t("{n} sellers"), { n: <b>{n(tick.sellers)}</b> })}</span>
          <small>{t("TikTok Shop people on Rezekii")}</small>
        </p>
        <div className="jb-win">
          <ol key={tick.step} className={`jb-list ${tick.step ? "go" : ""}`} aria-label={t("People who joined recently")}>
            {rows.map(({ id, j, mins: m }, k) => (
              <li key={id} className="jb-row" aria-hidden={k === ROWS || undefined}>
                <Avatar j={j} className="jb-av" />
                <span className="jb-who">
                  <b>{maskName(j.name)}</b>
                  <small>{j.state} · {m ? t("{n} min ago", { n: m }) : t("Just now")}</small>
                </span>
                <span className={`badge ${j.role === "Seller" ? "badge-blue" : ""}`}>{t(j.role)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
