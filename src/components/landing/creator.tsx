"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AI_PICKS, CREATOR, MISSIONS, PRODUCTS, REFERRAL_REWARD, product, short, type Product } from "@/lib/mock";
import { NOT_YET, WANTED } from "@/lib/mock-showcase";
import { NICHE_BEST, VIDEOS, daily } from "@/lib/mock-creator2";
import { AiMark, Tip } from "@/components/ui";
import { Emblem } from "@/components/emblems";
import { ReferralOffer } from "@/components/referral-offer";
import { useT } from "@/lib/i18n/client";
import { tx, type T } from "@/lib/i18n/lang";
import { App, Av, PLATS, PlatIcon, Rich, Ring, Swap, Thumb, v } from "./bits";
import { Bento, VideoTile, type Tile } from "./bento";
import { Journey, type DayStep } from "./journey";
import { type Note } from "./phone";
import { useOnScreen, useReducedMotion } from "./hooks";
import { AutoSlider } from "./slider";
import { AiText } from "./ai-text";
import { Compare, type CompareRow } from "./compare";
import { CREATOR_STORIES } from "./stories";
import { SeeRail, UspRail, type Usp } from "./usp";

/**
 * Creator landing, "Watch Rezekii Work" (owner, 29 Oct 2026): every animation is a real feature in miniature. Products, rates,
 * sold counts and ratings come from PRODUCTS; people and the rest are sample, and the page says so.
 * In her language (owner, 3 Nov 2026): lists that hold words are built with her translator `t`; product names stay as they are.
 */

/** Landing examples show a modest +1% (owner, 29 Oct 2026), not the biggest gap in the sample data. */
const example = (id: string) => { const p = product(id); return { ...p, tapRate: p.publicRate + 1 }; };
/** Every rate example on the page uses one product (owner, 29 Oct 2026): the RM 159.90 pot, 9% open plan, 10% on Rezekii. */
const POT = example("p08");
const TRACK = product("p01");
/** Free-sample examples: best sellers that really offer samples (owner, 30 Oct 2026: not the track pants, and show more). */
const SAMPLE_PICKS = ["p11", "p13", "p21"].map(product);
const POST_TODAY = MISSIONS.find((m) => m.id === "m7")!;
const WISH = NOT_YET[0];
const WANTED_N = WANTED[0].creators;
const n = (x: number) => x.toLocaleString("en-MY");

/* ---------------- Hero ---------------- */

const heroNotes = (t: T): Note[] => [
  { title: t("3 products have a better rate"), line: t("{name}: {from}% → {to}% on Rezekii", { name: POT.name, from: POT.publicRate, to: POT.tapRate }) },
  { title: t("AI pick: {name} is selling fast", { name: TRACK.name.replace(/ \(.*\)$/, "") }), line: t("{n} sold. Fits your Fashion videos", { n: short(TRACK.sold) }) },
  { title: t("Your viral time frame today: 8–10 pm"), line: t("When your followers watch most") },
  { title: t("Sample shipped. Post by 6 Nov"), line: t("{name} is on its way", { name: product("p05").name }) },
  { title: t("+{n} credits", { n: POST_TODAY.reward }), line: t("Mission done: you posted today") },
];

/**
 * Hero (owner, 29 Oct 2026, option A1): the product working, big enough to see at first glance. A scan runs down a sample
 * showcase, each rate goes up 1%, and the money for the RM 159.90 example adds up. Sample data, labelled for screen readers.
 */
const HERO_ROWS = ["p08", "p13", "p24", "p21"].map(example);
export function CreatorHeroScan() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref, 0.12);
  const still = useReducedMotion();
  const [count, setCount] = useState(0);
  const [money, setMoney] = useState(0);
  const extra = Math.round(PER_SALE * 1000);
  useEffect(() => {
    const to = CREATOR.showcaseSize;
    if (still) {
      setCount(to);
      return setMoney(extra);
    }
    if (!on) return;
    let raf = 0;
    let every = 0;
    let done = 0;
    const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
    // Every scan pass counts again (owner, 30 Oct 2026), in step with the scan line: products checked while it sweeps down,
    // then the extra commission adds up. Same 6 s loop as the line, and the same 0.4 s start.
    const run = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const tick = (time: number) => {
        const ms = time - t0;
        setCount(Math.round(to * ease(ms / 2400)));
        setMoney(Math.round(extra * ease((ms - 1000) / 2200)));
        if (ms < 3300) raf = requestAnimationFrame(tick);
        else { setCount(to); setMoney(extra); }
      };
      raf = requestAnimationFrame(tick);
      // Animation frames pause in a hidden tab; this still lands on the full numbers.
      window.clearTimeout(done);
      done = window.setTimeout(() => { setCount(to); setMoney(extra); }, 3400);
    };
    const first = window.setTimeout(() => { run(); every = window.setInterval(run, 6000); }, 400);
    return () => { window.clearTimeout(first); window.clearTimeout(done); window.clearInterval(every); cancelAnimationFrame(raf); };
  }, [on, still, extra]);
  return (
    <div ref={ref} className="hs lp-live" data-on={on ? "" : undefined}>
      <div className="hs-card">
        <div className="hs-head" aria-hidden="true">
          <AiMark size={34} busy={on} />
          <span>
            <b>{t("Scanning your showcase")}</b>
            <small><Rich text={t("{n} products checked")} parts={{ n: <span className="hs-n">{n(count)}</span> }} /></small>
          </span>
        </div>
        <ul className="hs-rows" aria-hidden="true">
          {HERO_ROWS.map((p, i) => (
            <li key={p.id} style={v({ i })}>
              <Thumb src={p.img} size={42} />
              <span>{p.name}<small>{p.shop}</small></span>
              <span className="hs-rate"><s>{p.publicRate}%</s><b>{p.tapRate}%</b></span>
            </li>
          ))}
          <i className="hs-beam" />
        </ul>
        {/* The extra, at scale (owner, 29 Oct 2026): what joining adds over 1,000 sales of the RM 159.90 example. */}
        <div className="hs-total">
          <small>
            {t("Estimated extra commission")}
            {/* What the example is, and that it isn't a promise (owner, 29 Oct 2026). */}
            <Tip label={t("About this example")} text={t("Example only: the {name} (RM {price}) at {from}% on the open plan vs {to}% on Rezekii, over 1,000 orders. It doesn't mean your account will earn this; it depends on your products, rates and sales.", { name: POT.name, price: POT.price.toFixed(2), from: POT.publicRate, to: POT.tapRate })} />
          </small>
          <b><span>+RM</span>{n(money)}</b>
          <span className="hs-sum"><Rich text={t("≈ +RM {amount} extra a sale {times} 1,000 orders", { amount: PER_SALE.toFixed(2) })} parts={{ times: <i>×</i> }} /></span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Mini app screens (A Day With Rezekii) ---------------- */

/* Screens fill top to bottom from the first frame and keep moving (owner, 29 Oct 2026, option A). Sample data only. */

const rm = (x: number) => `RM${x.toFixed(2)}`;
const earn = (p: Product, rate: number) => (p.price * rate) / 100;

/**
 * Showcase Scan with the app's own radar (owner, 29 Oct 2026: the real scanner, same classes as Home's): her product photos
 * fly in while it scans, then the better rates pop out on the ring. Loops while on screen; reduced motion shows the result.
 */
const SCAN = ["p08", "p13", "p24"].map(example);
const FLY = PRODUCTS.slice(0, 13).map((p) => p.img);
function ScanScreen() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref, 0.3);
  const still = useReducedMotion();
  const [scan, setScan] = useState(false);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!on || still) return setScan(false);
    let timer = 0;
    const run = () => {
      setScan(true);
      setK((x) => x + 1);
      timer = window.setTimeout(() => {
        setScan(false);
        timer = window.setTimeout(run, 4600);
      }, 4200);
    };
    timer = window.setTimeout(run, 1200);
    return () => window.clearTimeout(timer);
  }, [on, still]);
  return (
    <App title={t("Showcase Scanner")} ai>
      <div ref={ref} className="lp-s-radar">
        <p className="lp-s-rh">{scan ? t("Scanning your showcase…") : <Rich text={t("{n} products checked")} parts={{ n: <b>{n(CREATOR.showcaseSize)}</b> }} />}</p>
        <div className="sh-radar" style={{ "--sweep": scan ? "1.2s" : "4s" } as React.CSSProperties}>
          <span className="sh-rings" />
          <span className="sh-sweep" />
          <span className="sh-core"><Icon name="scan" size={26} /><small>{scan ? t("Scanning") : t("Scan")}</small></span>
          {scan && <span key={`burst-${k}`} className="sh-burst" />}
          {scan &&
            FLY.map((src, i) => {
              const a = (i * 137.5 * Math.PI) / 180;
              // eslint-disable-next-line @next/next/no-img-element
              return <img key={`${k}-${i}`} className="sh-fly" src={src} alt="" style={{ "--x0": `${50 + Math.sin(a) * 64}%`, "--y0": `${50 - Math.cos(a) * 64}%`, animationDelay: `${i * 0.25}s` } as React.CSSProperties} />;
            })}
          {!scan &&
            SCAN.map((p, i, ring) => {
              const rad = ((i * 360) / ring.length + 30) * (Math.PI / 180);
              return (
                <span key={`${p.id}-${k}`} className="sh-blip pop" style={{ left: `${50 + Math.sin(rad) * 0.8 * 46}%`, top: `${50 - Math.cos(rad) * 0.8 * 46}%`, "--d": `${i * 0.22}s` } as React.CSSProperties}>
                  <span className="sh-bin">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                  </span>
                  <em>{p.publicRate}→{p.tapRate}%</em>
                  {k > 0 && <span className="sh-cf">{Array.from({ length: 8 }, (_, j) => <i key={j} style={{ "--a": `${j * 45}deg` } as React.CSSProperties} />)}</span>}
                </span>
              );
            })}
        </div>
        <div className="lp-s-stats">
          <span><b>{SCAN.length}</b><small>{t("can pay more")}</small></span>
          <span><b>+1%</b><small>{t("each, same product")}</small></span>
        </div>
      </div>
      <span className="lp-s-btn"><span>{t("Add All {n}", { n: SCAN.length })}</span></span>
    </App>
  );
}

/** AI Picks: a light sweeps a grid of products, then the three that suit her light up. */
const PICK_TAG: Record<string, string> = { p01: tx("Selling fast"), p20: tx("Fits your videos"), p21: tx("Your #2 category") };
const READS = [tx("Your videos and sales"), tx("What sells in Malaysia")];
const GRID = ["p01", "p06", "p20", "p10", "p12", "p21", "p15", "p07", "p02"].map(product);
function PicksScreen() {
  const t = useT();
  return (
    <App title={t("AI Picks")} ai>
      <ul className="lp-s-read">
        {READS.map((x, i) => (
          <li key={x} style={v({ i })}>
            <Swap at={0.3 + i * 0.4} from={<span className="lp-spin" />} to={<span className="lp-ok"><Icon name="check" size={10} width={3.4} /></span>} />
            {t(x)}
          </li>
        ))}
      </ul>
      <div className="lp-s-grid">
        {GRID.map((p, i) => (
          <span key={p.id} className={PICK_TAG[p.id] ? "pick" : ""} style={v({ i })}>
            <Thumb src={p.img} size={72} />
            <small>{t("{n} sold", { n: short(p.sold) })}</small>
            {PICK_TAG[p.id] && <em>{t(PICK_TAG[p.id])}</em>}
          </span>
        ))}
        <i className="lp-s-sweep" />
      </div>
      <p className="lp-s-hit ai"><AiMark size={18} /> {t("3 picks that suit you")}</p>
    </App>
  );
}

/** Free Samples: a shop of free samples scrolling past, open to new creators (the open pool needs no streak). */
const OPEN = PRODUCTS.filter((p) => p.samples === 0);
const SHOP = [...OPEN].sort((a, b) => b.sold - a.sold).slice(0, 12);
function SamplesScreen() {
  const t = useT();
  return (
    <App title={t("Free Samples")}>
      <p className="lp-s-open"><Icon name="gift" size={16} width={2.2} /><Rich text={OPEN.length === 1 ? t("**{n} free sample** open now", { n: OPEN.length }) : t("**{n} free samples** open now", { n: OPEN.length })} /></p>
      <p className="lp-s-free"><span><Icon name="check" size={11} width={3.2} /> {t("Open to new creators")}</span><span><Icon name="check" size={11} width={3.2} /> {t("Best sellers included")}</span></p>
      <div className="lp-s-shop">
        <div>
          {[...SHOP, ...SHOP].map((p, i) => (
            <span key={i}>
              <Thumb src={p.img} size={72} />
              <em>{t("Free")}</em>
              <small>{t("{n} sold", { n: short(p.sold) })}</small>
            </span>
          ))}
        </div>
      </div>
    </App>
  );
}

/** Viral Time Frame (owner, 29 Oct 2026: everyone wants the FYP) as a clock: the hand moves round to her 8–10 pm, which lights up; another creator's 12–2 pm in grey. */
const TICKS = Array.from({ length: 12 }, (_, h) => h * 30);
const pt = (deg: number, r: number) => [100 + r * Math.sin((deg * Math.PI) / 180), 100 - r * Math.cos((deg * Math.PI) / 180)];
const at = (deg: number, r: number) => pt(deg, r).map((x) => x.toFixed(2)).join(" ");
const arc = (from: number, to: number) => `M${at(from * 30, 80)} A80 80 0 0 1 ${at(to * 30, 80)}`;
const NUMS: [string, number][] = [["12", 0], ["3", 90], ["6", 180], ["9", 270]];
function BestTimeScreen() {
  const t = useT();
  return (
    <App title={t("Viral Time Frame")} ai>
      <div className="lp-s-clock">
        <svg viewBox="0 0 200 200" width="200" height="200">
          <circle cx="100" cy="100" r="96" className="face" />
          {TICKS.map((d) => <path key={d} d={`M${at(d, 89)} L${at(d, 94)}`} className="tick" />)}
          {NUMS.map(([num, d]) => {
            const [x, y] = pt(d, 58);
            return <text key={num} x={x.toFixed(2)} y={(y + 5).toFixed(2)} textAnchor="middle">{num}</text>;
          })}
          <path d={arc(0, 2)} className="arc b" />
          <path d={arc(8, 10)} className="arc a" />
          <line x1="100" y1="100" x2="100" y2="56" className="hand h" />
          <line x1="100" y1="100" x2="100" y2="36" className="hand m" />
          <circle cx="100" cy="100" r="5" className="pin" />
        </svg>
      </div>
      <p className="lp-s-when"><b>{t("Your golden time: 8–10 pm")}</b><small>{t("Your best shot at FYP, when your followers watch most")}</small></p>
      <p className="lp-s-other"><i /> {t("Another creator: 12–2 pm")}</p>
      <small className="lp-s-fine">{t("Everyone's time is different.")}</small>
    </App>
  );
}

const HEALTH = ["p05", "p17", "p21", "p22"].map(product);


const LEVELS = ["Bronze", "Silver", "Gold"] as const;
function RewardsScreen() {
  const t = useT();
  return (
    <App title={t("Rewards")}>
      <div className="lp-s-lvl">
        <Ring size={84} from={POST_TODAY.progress / POST_TODAY.goal} to={(POST_TODAY.progress + 1) / POST_TODAY.goal}>
          <Swap at={1.3} from={`${POST_TODAY.progress}/${POST_TODAY.goal}`} to={`${POST_TODAY.progress + 1}/${POST_TODAY.goal}`} />
        </Ring>
        <span>
          <b>{t("Post Today")}</b>
          <small>{t("Posts with a Rezekii product")}</small>
          <Swap className="lp-s-cred" at={1.5} from={t("{n} credits", { n: n(CREATOR.credits) })} to={t("{n} credits", { n: n(CREATOR.credits + POST_TODAY.reward) })} />
        </span>
        <span className="lp-s-plus">+{POST_TODAY.reward}</span>
      </div>
      <ol className="lp-s-medals">
        {LEVELS.map((l, i) => (
          <li key={l} className={l === CREATOR.level ? "on" : i < 1 ? "done" : ""} style={v({ i })}>
            {/* The app's own level emblems (owner, 29 Oct 2026: same as in the app). */}
            <Emblem level={l.toLowerCase() as "bronze" | "silver" | "gold"} size={l === CREATOR.level ? 84 : 68} animate={l === CREATOR.level} dim={i > LEVELS.indexOf(CREATOR.level)} />
            <span>{t(l)}</span>
          </li>
        ))}
      </ol>
      <p className="lp-s-fine">{t("Better rates as you level up.")}</p>
    </App>
  );
}

const day = (t: T): DayStep[] => {
  const notes = heroNotes(t);
  return [
    { id: "scan", time: "9:00", title: t("Showcase Scan"), ai: true, problem: t("Checking 500 products one by one."), fix: t("One scan shows where Rezekii pays more. Add All in one tap."), note: { title: t("Scan done: 3 better rates"), line: t("Tap to see them and add all") }, screen: <ScanScreen /> },
    { id: "picks", time: "10:00", title: t("AI Picks"), ai: true, problem: t("Scrolling TikTok for hours to find products."), fix: t("Rezekii AI picks trending best sellers that suit you."), note: notes[1], screen: <PicksScreen /> },
    { id: "samples", time: "13:00", title: t("Free Samples"), problem: t("Best sellers rarely give samples. Others turn new creators down."), fix: t("Free samples, even on best sellers. Each one is tracked to your video, so sellers trust you."), note: { title: OPEN.length === 1 ? t("{n} free sample open now", { n: OPEN.length }) : t("{n} free samples open now", { n: OPEN.length }), line: t("Open to new creators") }, screen: <SamplesScreen /> },
    { id: "time", time: "19:00", title: t("Viral Time Frame"), ai: true, problem: t("Posting when your followers aren't watching."), fix: t("Rezekii AI learns when YOUR followers watch."), note: notes[2], screen: <BestTimeScreen /> },
    { id: "rewards", time: "21:00", title: t("Rewards & Levels"), problem: t("Doing well, with nothing extra for it."), fix: t("Credits for posting. Better rates as you level up."), note: notes[4], screen: <RewardsScreen /> },
  ];
};
export function CreatorDay() {
  const t = useT();
  return <Journey steps={day(t)} label={t("A day with Rezekii")} />;
}

/* ---------------- Bento widgets (Everything in One App) ---------------- */

/*
 * Feature cards (owner, 29 Oct 2026): each shows the job from start to finish, so it reads without the words. Sample data.
 */

/** Rezekii's own risk level from ratings and refunds (TikTok's health score isn't in any API): remove the risky one, risk drops. */
const RISKY = product("p17");
function HealthTile() {
  const t = useT();
  return (
    <div className="lp-w-risk" aria-hidden="true">
      <div className="lp-w-level">
        <small>{t("Showcase risk")}</small>
        <span><b className="watch">{t("Watch")}</b><b className="low">{t("Low")}</b></span>
      </div>
      <span className="lp-w-meter"><i /><i /><i /><em /></span>
      <ul>
        {[product("p05"), RISKY, product("p21")].map((p) => (
          <li key={p.id} className={p.id === RISKY.id ? "bad" : ""}>
            <Thumb src={p.img} size={26} />
            <span>{p.name}</span>
            <b>★ {p.rating}</b>
            {p.id === RISKY.id && <em>{t("Remove")}</em>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Paste a product you want, see how many creators want it too, and Rezekii asks the seller. */
function WishTile() {
  const t = useT();
  return (
    <div className="lp-w-wish" aria-hidden="true">
      <span className="lp-w-link"><Icon name="link" size={12} width={2.4} /><span className="lp-type">…/bento-box-set</span></span>
      <span className="lp-w-wishrow">
        <Thumb src={WISH.img} size={44} />
        <span><b>{WISH.name}</b><small>{WANTED_N === 1 ? t("{n} creator wants this", { n: WANTED_N }) : t("{n} creators want this", { n: WANTED_N })}</small></span>
      </span>
      {/* What she asks for (owner, 29 Oct 2026): a free sample, or a better rate on a top seller. */}
      <span className="lp-w-asks"><span><Icon name="gift" size={13} width={2.4} /> {t("Free sample")}</span><span><Icon name="trend" size={13} width={2.4} /> {t("Better rate")}</span></span>
      <span className="lp-w-next"><Icon name="users" size={13} width={2.4} /> {t("Our team talks to the seller")}</span>
    </div>
  );
}

/** A personal rate card for every creator (owner, 29 Oct 2026): three sample creators' cards fanned out. Sample prices. */
const RATE_CARDS: { handle: string; level: string; photo?: string; rows: [string, string][] }[] = [
  { handle: "@kak.ros.kitchen", level: "Gold", rows: [[tx("TikTok video"), "RM 450"], [tx("TikTok LIVE"), "RM 300"]] },
  { handle: "@hafiz.tech", level: "Bronze", rows: [[tx("TikTok video"), "RM 180"], [tx("Threads post"), "RM 50"]] },
  { handle: CREATOR.handle, level: CREATOR.level, photo: CREATOR.photo, rows: [[tx("TikTok video"), "RM 350"], [tx("Instagram Reel"), "RM 300"], [tx("Ad rights, 30 days"), "RM 400"]] },
];
function RateTile() {
  const t = useT();
  return (
    <div className="lp-w-rcx" aria-hidden="true">
      {RATE_CARDS.map((c, i) => (
        <div key={c.handle} className="lp-rcx" style={v({ i })}>
          <span className="lp-rcx-h">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/master-logo-transparent.png" alt="" />Rezekii<em>{t("Rate card")}</em>
          </span>
          <span className="lp-rcx-me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.photo ? <img src={c.photo} alt="" /> : <Av name={c.handle} size={34} />}
            <span><b>{c.handle}</b><small>{t("{level} creator", { level: t(c.level) })}</small></span>
          </span>
          <ul>{c.rows.map(([k, p]) => <li key={k}><span>{t(k)}</span><b>{p}</b></li>)}</ul>
          <span className="lp-rcx-f">{t("Book me on Rezekii")}</span>
        </div>
      ))}
    </div>
  );
}

/** The app's own referral offer (owner, 29 Oct 2026: a better presentation), with the share link under it. */
function InviteTile() {
  const t = useT();
  return (
    <div className="lp-w-ref2">
      {/* Sharing is a favour to a friend (owner, 29 Oct 2026): what they'd send. */}
      <span className="lp-w-msg">“{t("Check your TikTok showcase on Rezekii. It found me better rates on the same products, free.")}”</span>
      <ReferralOffer />
      <span className="lp-w-link2"><Icon name="link" size={14} width={2.4} /> rezekii.com/r/{CREATOR.handle.replace(/^@/, "")}<b>{t("Share")}</b></span>
    </div>
  );
}

const CLIPS = [
  { src: "try-on", label: tx("Try-On") },
  { src: "pov-demo", label: tx("POV") },
  { src: "review", label: tx("Review") },
  { src: "expert", label: tx("Expert") },
  { src: "drama", label: tx("Drama") },
  { src: "home-demo", label: tx("At Home") },
];

const tiles = (t: T): Tile[] => [
  { key: "video", title: t("AI Video"), ai: true, soon: true, icon: "video", tint: "linear-gradient(135deg,#25f4ee,#0e7490)", size: "tall", tip: t("Make product videos with Rezekii AI. These are real examples made with it."), body: <VideoTile clips={CLIPS.map((c) => ({ ...c, label: t(c.label) }))} /> },
  { key: "health", title: t("Showcase Health"), ai: true, icon: "shield", tint: "linear-gradient(135deg,#ff8a80,#e14b3b)", size: "wide", tip: t("Rezekii AI checks ratings and refunds in your showcase and flags risky products. Remove them in one tap."), body: <HealthTile /> },
  { key: "wish", title: t("Wish List"), icon: "bag", tint: "linear-gradient(135deg,#22dc95,#00a862)", size: "wide", tip: t("Want a free sample, or a better rate on a top seller? Add it to your Wish List. When many creators want it, our team talks to the seller for you."), body: <WishTile /> },
  { key: "rate", title: t("Rate Card"), icon: "tag", tint: "linear-gradient(135deg,#5ee7df,#0e9488)", tip: t("Rezekii makes a personal rate card for every creator: your photo, your prices, your packages. Share it with sellers in one tap."), body: <RateTile /> },
  { key: "invite", title: t("Earn with Referral"), icon: "users", tint: "linear-gradient(135deg,#ff7aa8,#e8005a)", size: "wide", tip: t("Do a friend a favour: they can check their showcase too and may earn more. You each get {n} credits once they get started.", { n: REFERRAL_REWARD.inviter }), body: <InviteTile /> },
];
export function CreatorBento() {
  const t = useT();
  // In order, a few at a time, on every screen (owner, 1 Nov 2026: not every feature in one frame on desktop).
  return <Bento tiles={tiles(t)} label={t("Rezekii features")} slides />;
}

/* ---------------- Why Rezekii (USP banners) ---------------- */

/** The extra on one sale, in sen as it's paid (RM 1.60), so 1,000 orders add up to exactly RM 1,600 (owner, 29 Oct 2026). */
const PER_SALE = Math.round(POT.price * (POT.tapRate - POT.publicRate)) / 100;
const rmn = (x: number) => x.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const AI_PICK = product("p20");
const FEED = ["p02", "p11", "p23", "p04", "p18", "p12"].map(product);
const TREND = ["p01", "p13", "p20"].map(product);
const usps = (t: T): Usp[] => [
  {
    title: t("Stop Scrolling for Products"), tint: "#6d5efc",
    line: t("Rezekii AI shows what's trending and suits you, before you buy or shoot."),
    demo: (
      <div className="lp-u-scroll">
        <span className="lp-u-feed"><span className="lp-u-feedin">{[...FEED, ...FEED].map((p, i) => <Thumb key={i} src={p.img} size={44} />)}</span></span>
        <span className="lp-u-aim"><AiMark size={30} /></span>
        <ul className="lp-u-trend">
          {TREND.map((p, i) => (
            <li key={p.id} style={v({ i })}>
              <Thumb src={p.img} size={30} />
              <span><b>{p.name}</b><svg viewBox="0 0 48 14" preserveAspectRatio="none"><path d="M1 13 L12 10 L22 11 L33 5 L47 1" pathLength={100} /></svg></span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    title: t("More Commission, Same Products"), tint: "#00c073",
    line: t("Rezekii AI finds higher rates for products already in your showcase."),
    demo: (
      <div className="lp-u-col">
        <div className="lp-u-row">
          <Thumb src={POT.img} size={44} />
          <span>{POT.name}<small>{t("Already in your showcase")}</small></span>
          <span className="lp-u-flip"><span className="was">{POT.publicRate}%</span><b>{POT.tapRate}% <s>{POT.publicRate}%</s></b></span>
        </div>
        <span className="lp-u-chip">{t("Example: RM {price} item, +RM {extra} a sale", { price: POT.price.toFixed(2), extra: PER_SALE.toFixed(2) })}</span>
      </div>
    ),
  },
  {
    // TikTok samples are free too; sellers there often set strict rules (owner, 29 Oct 2026). The difference is who gets in.
    // TikTok has free samples too, but best sellers rarely offer them and sellers fear no-shows (owner, 29 Oct 2026). Rezekii
    // tracks every sample to a posted video, so sellers can trust the creator.
    title: t("Free Samples, Even on Best Sellers"), tint: "#1d4ed8",
    line: t("Sellers worry samples never become videos. Rezekii tracks each one to your post, so they can trust you."),
    demo: (
      // A best seller with no free sample on TikTok flips to a free sample on Rezekii (owner, 30 Oct 2026).
      <div className="lp-u-samp">
        <span className="lp-u-trio">
          {SAMPLE_PICKS.map((p, i) => (
            <span key={p.id} className="lp-u-tile" style={v({ i })}>
              <Thumb src={p.img} size={52} />
              <small>{t("{n} sold", { n: short(p.sold) })}</small>
              <em><Icon name="gift" size={11} width={2.6} /> {t("Free")}</em>
            </span>
          ))}
        </span>
        <span className="lp-u-flipbox">
          <span className="no"><Icon name="lock" size={14} width={2.4} /> {t("On TikTok: no free sample")}</span>
          <span className="yes"><Icon name="gift" size={14} width={2.4} /> {t("On Rezekii: free sample")}</span>
        </span>
      </div>
    ),
  },
  {
    // One video, four apps, one tap (owner, 29 Oct 2026): each app's own icon so it reads at a glance.
    // Four apps means four places to earn (owner, 29 Oct 2026), not a promise of 4× the commission.
    // Before: one app to earn on. Now: the same video and caption, 3 more apps to earn on (owner, 29 Oct 2026).
    title: t("Same Video, 4 Places to Earn"), tint: "#f08a00",
    line: t("Same videos, same captions. Rezekii posts them to 3 more apps where you can earn too."),
    demo: (
      <div className="lp-u-hub">
        <span className="lp-u-src">
          <Thumb src="/ai-videos/try-on.jpg" size={52} />
          <b>{t("1 video")}</b>
          <small>{t("1 → 4 places")}</small>
        </span>
        <span className="lp-u-mid">
          <svg className="lp-u-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {[12.5, 37.5, 62.5, 87.5].map((y, i) => <path key={y} d={`M0 50 C50 50 50 ${y} 100 ${y}`} pathLength={100} style={v({ i })} />)}
          </svg>
          {[12.5, 37.5, 62.5, 87.5].map((y, i) => <i key={y} className="lp-u-dollar" style={v({ y: `${y}%`, i })}>$</i>)}
        </span>
        <ul>
          {PLATS.map((p, i) => (
            <li key={p} className={i === 0 ? "" : "new"} style={v({ i })}>
              <PlatIcon name={p} size={28} />
              <span>{p}</span>
              <em>{i === 0 ? t("Today") : t("+ New")}</em>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

export function CreatorUsps() {
  const t = useT();
  return <UspRail items={usps(t)} label={t("Why Rezekii")} />;
}

/* ---------------- Without vs With ---------------- */

const rows = (t: T): CompareRow[] => [
  { label: t("Commission on a RM {price} product", { price: POT.price.toFixed(2) }), without: t("{rate}% open plan, RM {amount}/sale", { rate: POT.publicRate, amount: earn(POT, POT.publicRate).toFixed(2) }), with: <span className="lp-cmp-money"><span>{t("{rate}% on Rezekii, RM {amount}/sale", { rate: POT.tapRate, amount: earn(POT, POT.tapRate).toFixed(2) })}</span><b>{t("+RM {amount}/sale", { amount: PER_SALE.toFixed(2) })}</b><small><span>{t("× 1,000 orders")}</span><span>= <b>{t("+RM {amount} extra", { amount: rmn(PER_SALE * 1000) })}</b></span></small></span> },
  { label: t("Finding viral products"), without: t("Hours a day scrolling TikTok, then guessing"), with: t("Rezekii AI shows what's trending for you") },
  { label: t("Captions"), without: t("A new caption for every app, every post"), with: t("Write once, fitted to each app") },
  { label: t("Posting"), without: t("Upload to each app, one by one"), with: <span className="lp-cmp-apps">{t("Multi-platform in one click")}<span>{PLATS.map((p) => <PlatIcon key={p} name={p} size={26} />)}</span><span className="lp-sr">{t("TikTok, Facebook, Instagram and Threads")}</span></span> },
  { label: t("Free samples"), without: t("Sample requests often get rejected"), with: t("Higher approval through Rezekii, even on best sellers") },
  { label: t("When to post"), without: t("Post anytime and hope for FYP"), with: t("Rezekii AI finds your Viral Time Frame") },
];
export function CreatorCompare() {
  const t = useT();
  return <Compare rows={rows(t)} note={t("Example: {name} at RM {price}. Rates differ by product and level; some products have no better rate.", { name: POT.name, price: POT.price.toFixed(2) })} />;
}

/* ---------------- What You'll See ---------------- */

export function CreatorSee() {
  const t = useT();
  return <SeeRail items={[]} stories={CREATOR_STORIES} label={t("What creators say")} />;
}

/* ---------------- Banner, product strip and pain-point posters (owner, 29 Oct 2026: some banners, not all animation) ---------------- */

const COLLAGE = ["p08", "p01", "p13", "p24", "p21"].map(example);
/** A bold banner right after the hero: the promise in big type over the products it applies to. */
export function CreatorBanner() {
  const t = useT();
  return (
    <section className="lp-banner" aria-label={t("Same products, more commission")}>
      <div className="lp-banner-t">
        <h2><Rich text={t("Same Products. *More Commission.*")} /></h2>
        {/* 1% sounds small; at volume it isn't (owner, 29 Oct 2026). */}
        <p>{t("1% sounds small. On about RM 160,000 of sales, it's RM 1,600 more.")}</p>
      </div>
      <div className="lp-banner-c" aria-hidden="true">
        {COLLAGE.map((p, i) => (
          <span key={p.id} style={v({ i })}>
            <Thumb src={p.img} size={84} />
            <em>+1%</em>
          </span>
        ))}
      </div>
    </section>
  );
}

/** A slow strip of what Rezekii gives you, between sections (owner, 30 Oct 2026, option 2A: benefits, not more products). */
const PERKS: { icon: IconName; text: string; tone?: "gold" }[] = [
  { icon: "trend", text: tx("+1% commission") },
  { icon: "gift", text: tx("Free samples") },
  { icon: "spark", text: tx("AI Viral Product Sourcing") },
  { icon: "clock", text: tx("Golden time to go FYP"), tone: "gold" },
  { icon: "share", text: tx("4 places to earn") },
  { icon: "tag", text: tx("Rate cards") },
];
export function CreatorStrip() {
  const t = useT();
  return (
    <div className="lp-strip perks" aria-hidden="true">
      <div>
        {[...PERKS, ...PERKS, ...PERKS].map((x, i) => (
          <span key={i} className={x.tone}>
            {/* The AI tag brings its own spark, so no second icon. */}
            {x.icon !== "spark" && <Icon name={x.icon} size={18} width={2.4} />}
            <b><AiText text={t(x.text)} /></b>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The pains affiliates feel, one poster each (owner, 29 Oct 2026). Every fix is something Rezekii can do from real data:
 * ratings and refunds per product and video (not TikTok's own health score, which no API gives), weekly sold counts, live
 * orders from TikTok Shop.
 */
/** Lowest-rated products in her showcase, with how many of her videos sell them (sample). */
const RISK_ROWS = [{ p: product("p17"), videos: 2 }, { p: product("p22"), videos: 1 }, { p: product("p23"), videos: 1 }];
const WEEK = [tx("Mon"), tx("Tue"), tx("Wed"), tx("Thu"), tx("Fri"), tx("Sat"), tx("Sun")];
/** Ideas from Rezekii AI: products that fit her account best, with the match score from AI Picks (sample). */
const FIT_PICKS = AI_PICKS.slice(0, 3);
const HOT = NICHE_BEST[0];
const HOT_P = product(HOT.productId);
const WAVE = ((d) => d.map((x) => Math.round((x / Math.max(...d)) * 100)))(daily(HOT.weekSold, HOT.trend));
const TT_FEED = ["try-on", "pov-demo", "review", "expert", "drama", "home-demo"].map((x) => `/ai-videos/${x}.jpg`);
// Winner in the middle, a good one and a weak one either side, so the gap between videos is plain to see.
const BY_EARN = [...VIDEOS].sort((x, y) => y.commission - x.commission);
const SEEN = BY_EARN.filter((x) => x.views !== null);
const VID_ROW = [SEEN[1], SEEN[0], SEEN[SEEN.length - 1]];
/** Video covers that look like TikTok videos, not product photos (owner, 30 Oct 2026). Sample. */
const VID_COVERS = ["/ai-videos/home-demo.jpg", "/ai-videos/pov-demo.jpg", "/ai-videos/review.jpg"];
type Pain = { key: string; tint: string; pain: string; why: string; fix: string; art: React.ReactNode; tag?: string };
const pains = (t: T): Pain[] => [
  {
    key: "health", tint: "linear-gradient(160deg,#3b0d12,#b4232c)",
    pain: t("Scared Your Account Gets Frozen?"),
    why: t("Violations can mean low traffic, a shadow ban, even frozen commission you can't withdraw."),
    fix: t("Rezekii AI flags risky products and the videos selling them, so you fix them early."),
    art: (
      // The low-rated products behind the risk (owner, 30 Oct 2026), flagged one by one.
      <div className="lp-pa-risk">
        <span className="lp-pa-tag"><Rich text={RISK_ROWS.length === 1 ? t("Showcase risk · **{n} product**", { n: RISK_ROWS.length }) : t("Showcase risk · **{n} products**", { n: RISK_ROWS.length })} /></span>
        {RISK_ROWS.map((r, i) => (
          <div key={r.p.id} className="lp-pa-row lp-pa-rk" style={v({ i })}>
            <Thumb src={r.p.img} size={36} />
            <span>{r.p.name}<small>{t("★ {rating} · in {n} of your videos", { rating: r.p.rating.toFixed(1), n: r.videos })}</small></span>
            <em className={r.p.rating < 3 ? "high" : "watch"}>{r.p.rating < 3 ? t("High risk") : t("Watch")}</em>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "source", tint: "linear-gradient(160deg,#1e1452,#6d5efc)",
    pain: t("Saw It Trending? You're Already Late."),
    why: t("By the time your sample arrives, about a week later, the wave has passed."),
    fix: t("AI Viral Product Sourcing reads real sales and your account, and tells you what to shoot next. Trust data, not trends."),
    art: (
      <div className="lp-pa-chart">
        <span className="lp-pa-tag"><Thumb src={HOT_P.img} size={28} /> <Rich text={t("{n} sold this week **↑**", { n: short(HOT.weekSold) })} /></span>
        <span className="lp-pa-bars lp-pa-wave">
          {WAVE.map((h, i) => <i key={i} className={i === 1 ? "early" : undefined} style={v({ h: `${h}%`, i })} />)}
          {/* The label sits above the chart, with a line down to the exact green bar (owner, 30 Oct 2026). */}
          <span className="pin-line" style={{ bottom: `${WAVE[1]}%` }} />
          <em className="pin early">{t("✦ Rezekii AI spots it")}</em>
          <em className="pin late">{t("Everyone else")}</em>
        </span>
        <span className="lp-pa-days">{WEEK.map((d) => <i key={d}>{t(d)}</i>)}</span>
        <small>{t("Rising early, before the wave")}</small>
      </div>
    ),
  },
  {
    key: "ideas", tint: "linear-gradient(160deg,#4a2a00,#e8a400)",
    pain: t("Out of Ideas Today?"),
    why: t("Scrolling TikTok for hours to find what to film, then copying what's already old."),
    fix: t("Rezekii AI gives ideas made for your account, not copied from others."),
    // Before: endless TikTok scrolling. After: today's ideas, ready (owner, 29 Oct 2026).
    art: (
      <div className="lp-pa-swap">
        <div className="lp-pa-feed">
          <div>{[...TT_FEED, ...TT_FEED].map((src, i) => <Thumb key={i} src={src} size={60} />)}</div>
          <span className="lp-pa-tag"><Icon name="clock" size={14} width={2.4} /> {t("2 hours of scrolling…")}</span>
        </div>
        {/* Ideas from AI analysis, scored by how well each product fits her (owner, 30 Oct 2026): a better fit, a better chance to go FYP. */}
        <div className="lp-pa-ideas">
          <span className="lp-pa-tag"><Icon name="spark" size={14} width={2.4} /> {t("Rezekii AI checked your videos and buyers")}</span>
          {FIT_PICKS.map((a, i) => {
            const p = product(a.productId);
            return (
              <div key={a.productId} className="lp-pa-row lp-pa-fit" style={v({ i, m: `${a.match}%` })}>
                <Thumb src={p.img} size={36} />
                <span>{p.name}<small><i className="lp-pa-meter"><b /></i>{t("Fits you {n}%", { n: a.match })}</small></span>
                {i === 0 && <em>{t("Best fit")}</em>}
              </div>
            );
          })}
          <small className="lp-pa-note">{t("A better fit means a better chance to go FYP.")}</small>
        </div>
      </div>
    ),
  },
  {
    // What they care about: which videos earn, not where the data comes from (owner, 29 Oct 2026).
    key: "live", tint: "linear-gradient(160deg,#04291a,#00a862)",
    pain: t("Which Video Is Actually Making You Money?"),
    why: t("Copying others is a guess. What sells is different for every account, and sometimes a repost wins."),
    fix: t("See commission per video and product as it happens, so you post more of what earns."),
    art: (
      // Option 1A (owner, 30 Oct 2026): three video covers, commission bars filling up, the winner crowned and worth reposting.
      <div className="lp-pa-risk">
        <div className="lp-pa-vids">
          {VID_ROW.map((x, i) => {
            const top = x.id === BY_EARN[0].id;
            return (
              <div key={x.id} className={`lp-pa-vid${top ? " top" : ""}`} style={v({ h: `${Math.round((x.commission / BY_EARN[0].commission) * 100)}%` })}>
                {top && <span className="lp-pa-crown">{t("Top earner")}</span>}
                <span className="lp-pa-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={VID_COVERS[i]} alt="" />
                  <span className="lp-pa-play" />
                  <span className="lp-pa-acts"><svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2 0 3.6 1.1 4.3 2.6.7-1.5 2.3-2.6 4.3-2.6 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#ffffff" /></svg><svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 3C6.5 3 2 6.9 2 11.6c0 2.4 1.2 4.6 3.1 6.1L4.5 21l3.9-1.9c1.1.3 2.3.5 3.6.5 5.5 0 10-3.9 10-8.6S17.5 3 12 3z" fill="#ffffff" /></svg></span>
                  <span className="lp-pa-views">▶ {short(x.views ?? 0)}</span>
                </span>
                <span className="lp-pa-bar"><i /></span>
                <b>RM {Math.round(x.commission)}</b>
              </div>
            );
          })}
        </div>
        <span className="lp-pa-again"><Icon name="refresh" size={15} width={2.6} /> {t("Post it again")}</span>
      </div>
    ),
  },
  {
    key: "plan", tint: "linear-gradient(160deg,#0b2246,#2f80ed)",
    pain: t("Posting Whenever You Can?"),
    why: t("Copying others' posting time rarely works. The right time for your own account does far better."),
    fix: t("Plan the week in Content Calendar, timed to your golden hours."),
    // Posting time as a clock (owner, 29 Oct 2026): her golden windows lit up; there can be more than one (owner, 30 Oct 2026).
    art: (
      <div className="lp-pa-clock">
        <svg viewBox="0 0 200 200" width="170" height="170">
          <circle cx="100" cy="100" r="96" className="face" />
          {TICKS.map((d) => <path key={d} d={`M${at(d, 89)} L${at(d, 94)}`} className="tick" />)}
          {NUMS.map(([num, d]) => {
            const [x, y] = pt(d, 58);
            return <text key={num} x={x.toFixed(2)} y={(y + 5).toFixed(2)} textAnchor="middle">{num}</text>;
          })}
          <path d={arc(0, 1)} className="arc" />
          <path d={arc(8, 10)} className="arc" />
          <line x1="100" y1="100" x2="100" y2="56" className="hand h" />
          <line x1="100" y1="100" x2="100" y2="36" className="hand m" />
          <circle cx="100" cy="100" r="5" className="pin" />
        </svg>
        <span className="lp-pa-tag">{t("Your golden times: 12–1 pm · 8–10 pm")}</span>
      </div>
    ),
  },
];
export function CreatorPains({ items, label }: { items?: Pain[]; label?: string } = {}) {
  const t = useT();
  return (
    <AutoSlider label={label ?? t("Affiliate problems Rezekii solves")} every={5000} className="three lp-pains">
      {(items ?? pains(t)).map((x) => (
        <article key={x.key} className="lp-poster" style={{ background: x.tint }}>
          {x.tag && <span className="lp-poster-tag">{x.tag}</span>}
          <h3>{x.pain}</h3>
          <p className="lp-poster-why">{x.why}</p>
          <div className="lp-poster-art" aria-hidden="true">{x.art}</div>
          <p className="lp-poster-fix"><Icon name="check" size={14} width={3} /><span><AiText text={x.fix} /></span></p>
        </article>
      ))}
    </AutoSlider>
  );
}

/* ---------------- Your free report (owner, 1 Nov 2026, option D): the three main tools as the three parts of a free report ---------------- */

const report = (t: T): Pain[] => {
  const all = pains(t);
  return [
    {
      key: "r-scan", tag: t("Part 1 · Showcase Scanner"), tint: "linear-gradient(160deg,#04291a,#00a862)",
      pain: t("Better Rates on What You Already Sell"),
      why: t("Every product in your showcase, checked in one scan."),
      fix: t("Only higher rates, never lower. Add them all in one tap."),
      art: (
        <div className="lp-pa-risk">
          <span className="lp-pa-tag"><Rich text={t("Scan done · **{n} can pay more**", { n: SCAN.length })} /></span>
          {SCAN.map((p, i) => (
            <div key={p.id} className="lp-pa-row lp-pa-rk" style={v({ i })}>
              <Thumb src={p.img} size={36} />
              <span>{p.name}<small className="up">{t("Already in your showcase")}</small></span>
              <em className="up">{p.publicRate}% → {p.tapRate}%</em>
            </div>
          ))}
        </div>
      ),
    },
    { ...all.find((x) => x.key === "ideas")!, key: "r-picks", tag: t("Part 2 · AI Picks"), tint: "linear-gradient(160deg,#1e1452,#6d5efc)", pain: t("What to Sell Next, Picked for You"), why: t("From your own sales and videos, not copied from others."), fix: t("Rezekii AI picks best sellers that fit your account.") },
    { ...all.find((x) => x.key === "health")!, key: "r-health", tag: t("Part 3 · Health Scanner"), pain: t("Risky Products, Found Early"), why: t("Low ratings can mean low traffic, a shadow ban, even frozen commission."), fix: t("Remove products under 3.0★ in one tap, before they hurt your account.") },
  ];
};
export function CreatorReport() {
  const t = useT();
  return <CreatorPains items={report(t)} label={t("Your free report")} />;
}
