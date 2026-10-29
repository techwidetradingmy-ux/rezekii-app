"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { CREATOR, MISSIONS, PRODUCTS, REFERRAL_REWARD, product, short, type Product } from "@/lib/mock";
import { NOT_YET, WANTED } from "@/lib/mock-showcase";
import { NICHE_BEST, VIDEOS, daily } from "@/lib/mock-creator2";
import { AiMark, Tip } from "@/components/ui";
import { Emblem } from "@/components/emblems";
import { ReferralOffer } from "@/components/referral-offer";
import { App, Av, Flip, PLATS, PlatIcon, Ring, Swap, Thumb, v, type Plat } from "./bits";
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
 */

/** Landing examples show a modest +1% (owner, 29 Oct 2026), not the biggest gap in the sample data. */
const example = (id: string) => { const p = product(id); return { ...p, tapRate: p.publicRate + 1 }; };
/** Every rate example on the page uses one product (owner, 29 Oct 2026): the RM 159.90 pot, 9% open plan, 10% on Rezekii. */
const POT = example("p08");
const TRACK = product("p01");
const POST_TODAY = MISSIONS.find((m) => m.id === "m7")!;
const WISH = NOT_YET[0];
const WANTED_N = WANTED[0].creators;
const n = (x: number) => x.toLocaleString("en-MY");

/* ---------------- Hero ---------------- */

const HERO_NOTES: Note[] = [
  { title: "3 products have a better rate", line: `${POT.name}: ${POT.publicRate}% → ${POT.tapRate}% on Rezekii` },
  { title: `AI pick: ${TRACK.name.replace(/ \(.*\)$/, "")} is selling fast`, line: `${short(TRACK.sold)} sold. Fits your Fashion videos` },
  { title: "Your viral time frame today: 8–10 pm", line: "When your followers watch most" },
  { title: "Sample shipped. Post by 6 Nov", line: `${product("p05").name} is on its way` },
  { title: `+${POST_TODAY.reward} credits`, line: "Mission done: you posted today" },
];

/**
 * Hero (owner, 29 Oct 2026, option A1): the product working, big enough to see at first glance. A scan runs down a sample
 * showcase, each rate goes up 1%, and the money for the RM 159.90 example adds up. Sample data, labelled for screen readers.
 */
const HERO_ROWS = ["p08", "p13", "p24", "p21"].map(example);
export function CreatorHeroScan() {
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
    const t0 = performance.now();
    const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
    // Products checked first, then the extra commission counts up to its full amount (owner, 29 Oct 2026: show the money).
    const tick = (t: number) => {
      const ms = t - t0;
      setCount(Math.round(to * ease(ms / 1600)));
      setMoney(Math.round(extra * ease((ms - 500) / 2000)));
      if (ms < 2600) raf = requestAnimationFrame(tick);
      else setMoney(extra);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, still, extra]);
  return (
    <div ref={ref} className="hs lp-live" data-on={on ? "" : undefined}>
      <div className="hs-card">
        <div className="hs-head" aria-hidden="true">
          <AiMark size={34} busy={on} />
          <span>
            <b>Scanning your showcase</b>
            <small><span className="hs-n">{n(count)}</span> products checked</small>
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
            Extra commission on Rezekii
            {/* What the example is, and that it isn't a promise (owner, 29 Oct 2026). */}
            <Tip label="About this example" text={`Example only: the ${POT.name} (RM ${POT.price.toFixed(2)}) at ${POT.publicRate}% on the open plan vs ${POT.tapRate}% on Rezekii, over 1,000 orders. It doesn't mean your account will earn this; it depends on your products, rates and sales.`} />
          </small>
          <b><span>RM</span>{n(money)}</b>
          <span className="hs-sum">+RM {PER_SALE.toFixed(2)} extra a sale <i>×</i> 1,000 orders</span>
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
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref, 0.3);
  const still = useReducedMotion();
  const [scan, setScan] = useState(false);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!on || still) return setScan(false);
    let t = 0;
    const run = () => {
      setScan(true);
      setK((x) => x + 1);
      t = window.setTimeout(() => {
        setScan(false);
        t = window.setTimeout(run, 4600);
      }, 4200);
    };
    t = window.setTimeout(run, 1200);
    return () => window.clearTimeout(t);
  }, [on, still]);
  return (
    <App title="Showcase Scanner" ai>
      <div ref={ref} className="lp-s-radar">
        <p className="lp-s-rh">{scan ? "Scanning your showcase…" : <><b>{n(CREATOR.showcaseSize)}</b> products checked</>}</p>
        <div className="sh-radar" style={{ "--sweep": scan ? "1.2s" : "4s" } as React.CSSProperties}>
          <span className="sh-rings" />
          <span className="sh-sweep" />
          <span className="sh-core"><Icon name="scan" size={26} /><small>{scan ? "Scanning" : "Scan"}</small></span>
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
          <span><b>{SCAN.length}</b><small>can pay more</small></span>
          <span><b>+1%</b><small>each, same product</small></span>
        </div>
      </div>
      <span className="lp-s-btn"><span>Add All {SCAN.length}</span></span>
    </App>
  );
}

/** AI Picks: a light sweeps a grid of products, then the three that suit her light up. */
const PICK_TAG: Record<string, string> = { p01: "Selling fast", p20: "Fits your videos", p21: "Your #2 category" };
const GRID = ["p01", "p06", "p20", "p10", "p12", "p21", "p15", "p07", "p02"].map(product);
function PicksScreen() {
  return (
    <App title="AI Picks" ai>
      <ul className="lp-s-read">
        {["Your videos and sales", "What sells in Malaysia"].map((t, i) => (
          <li key={t} style={v({ i })}>
            <Swap at={0.3 + i * 0.4} from={<span className="lp-spin" />} to={<span className="lp-ok"><Icon name="check" size={10} width={3.4} /></span>} />
            {t}
          </li>
        ))}
      </ul>
      <div className="lp-s-grid">
        {GRID.map((p, i) => (
          <span key={p.id} className={PICK_TAG[p.id] ? "pick" : ""} style={v({ i })}>
            <Thumb src={p.img} size={72} />
            <small>{short(p.sold)} sold</small>
            {PICK_TAG[p.id] && <em>{PICK_TAG[p.id]}</em>}
          </span>
        ))}
        <i className="lp-s-sweep" />
      </div>
      <p className="lp-s-hit ai"><AiMark size={18} /> 3 picks that suit you</p>
    </App>
  );
}

/** Free Samples: a shop of free samples scrolling past, open to new creators (the open pool needs no streak). */
const OPEN = PRODUCTS.filter((p) => p.samples === "open");
const SHOP = [...OPEN].sort((a, b) => b.sold - a.sold).slice(0, 12);
function SamplesScreen() {
  return (
    <App title="Free Samples">
      <p className="lp-s-open"><Icon name="gift" size={16} width={2.2} /><b>{OPEN.length} free samples</b> open now</p>
      <p className="lp-s-free"><span><Icon name="check" size={11} width={3.2} /> Open to new creators</span><span><Icon name="check" size={11} width={3.2} /> Best sellers included</span></p>
      <div className="lp-s-shop">
        <div>
          {[...SHOP, ...SHOP].map((p, i) => (
            <span key={i}>
              <Thumb src={p.img} size={72} />
              <em>Free</em>
              <small>{short(p.sold)} sold</small>
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
  return (
    <App title="Viral Time Frame" ai>
      <div className="lp-s-clock">
        <svg viewBox="0 0 200 200" width="200" height="200">
          <circle cx="100" cy="100" r="96" className="face" />
          {TICKS.map((d) => <path key={d} d={`M${at(d, 89)} L${at(d, 94)}`} className="tick" />)}
          {NUMS.map(([t, d]) => {
            const [x, y] = pt(d, 58);
            return <text key={t} x={x.toFixed(2)} y={(y + 5).toFixed(2)} textAnchor="middle">{t}</text>;
          })}
          <path d={arc(0, 2)} className="arc b" />
          <path d={arc(8, 10)} className="arc a" />
          <line x1="100" y1="100" x2="100" y2="56" className="hand h" />
          <line x1="100" y1="100" x2="100" y2="36" className="hand m" />
          <circle cx="100" cy="100" r="5" className="pin" />
        </svg>
      </div>
      <p className="lp-s-when"><b>Your golden time: 8–10 pm</b><small>Your best shot at FYP, when your followers watch most</small></p>
      <p className="lp-s-other"><i /> Another creator: 12–2 pm</p>
      <small className="lp-s-fine">Everyone&apos;s time is different.</small>
    </App>
  );
}

const HEALTH = ["p05", "p17", "p21", "p22"].map(product);


function RewardsScreen() {
  return (
    <App title="Rewards">
      <div className="lp-s-lvl">
        <Ring size={84} from={POST_TODAY.progress / POST_TODAY.goal} to={(POST_TODAY.progress + 1) / POST_TODAY.goal}>
          <Swap at={1.3} from={`${POST_TODAY.progress}/${POST_TODAY.goal}`} to={`${POST_TODAY.progress + 1}/${POST_TODAY.goal}`} />
        </Ring>
        <span>
          <b>Post Today</b>
          <small>Posts with a Rezekii product</small>
          <Swap className="lp-s-cred" at={1.5} from={`${n(CREATOR.credits)} credits`} to={`${n(CREATOR.credits + POST_TODAY.reward)} credits`} />
        </span>
        <span className="lp-s-plus">+{POST_TODAY.reward}</span>
      </div>
      <ol className="lp-s-medals">
        {(["Bronze", "Silver", "Gold"] as const).map((l, i) => (
          <li key={l} className={l === CREATOR.level ? "on" : i < 1 ? "done" : ""} style={v({ i })}>
            {/* The app's own level emblems (owner, 29 Oct 2026: same as in the app). */}
            <Emblem level={l.toLowerCase() as "bronze" | "silver" | "gold"} size={l === CREATOR.level ? 84 : 68} animate={l === CREATOR.level} dim={i > (["Bronze", "Silver", "Gold"] as const).indexOf(CREATOR.level)} />
            <span>{l}</span>
          </li>
        ))}
      </ol>
      <p className="lp-s-fine">Better rates as you level up.</p>
    </App>
  );
}

const DAY: DayStep[] = [
  { id: "scan", time: "9:00", title: "Showcase Scan", ai: true, problem: "Checking 500 products one by one.", fix: "One scan shows where Rezekii pays more. Add All in one tap.", note: { title: "Scan done: 3 better rates", line: "Tap to see them and add all" }, screen: <ScanScreen /> },
  { id: "picks", time: "10:00", title: "AI Picks", ai: true, problem: "Scrolling TikTok for hours to find products.", fix: "Rezekii AI picks trending best sellers that suit you.", note: HERO_NOTES[1], screen: <PicksScreen /> },
  { id: "samples", time: "13:00", title: "Free Samples", problem: "Best sellers rarely give samples. Others turn new creators down.", fix: "Free samples, even on best sellers. Each one is tracked to your video, so sellers trust you.", note: { title: `${OPEN.length} free samples open now`, line: "Open to new creators" }, screen: <SamplesScreen /> },
  { id: "time", time: "19:00", title: "Viral Time Frame", ai: true, problem: "Posting when your followers aren't watching.", fix: "Rezekii AI learns when YOUR followers watch.", note: HERO_NOTES[2], screen: <BestTimeScreen /> },
  { id: "rewards", time: "21:00", title: "Rewards & Levels", problem: "Doing well, with nothing extra for it.", fix: "Credits for posting. Better rates as you level up.", note: HERO_NOTES[4], screen: <RewardsScreen /> },
];
export function CreatorDay() {
  return <Journey steps={DAY} label="A day with Rezekii" />;
}

/* ---------------- Bento widgets (Everything in One App) ---------------- */

/*
 * Feature cards (owner, 29 Oct 2026): each shows the job from start to finish, so it reads without the words. Sample data.
 */

/** Rezekii's own risk level from ratings and refunds (TikTok's health score isn't in any API): remove the risky one, risk drops. */
const RISKY = product("p17");
function HealthTile() {
  return (
    <div className="lp-w-risk" aria-hidden="true">
      <div className="lp-w-level">
        <small>Showcase risk</small>
        <span><b className="watch">Watch</b><b className="low">Low</b></span>
      </div>
      <span className="lp-w-meter"><i /><i /><i /><em /></span>
      <ul>
        {[product("p05"), RISKY, product("p21")].map((p) => (
          <li key={p.id} className={p.id === RISKY.id ? "bad" : ""}>
            <Thumb src={p.img} size={26} />
            <span>{p.name}</span>
            <b>★ {p.rating}</b>
            {p.id === RISKY.id && <em>Remove</em>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Paste a product you want, see how many creators want it too, and Rezekii asks the seller. */
function WishTile() {
  return (
    <div className="lp-w-wish" aria-hidden="true">
      <span className="lp-w-link"><Icon name="link" size={12} width={2.4} /><span className="lp-type">…/bento-box-set</span></span>
      <span className="lp-w-wishrow">
        <Thumb src={WISH.img} size={44} />
        <span><b>{WISH.name}</b><small>{WANTED_N} creators want this</small></span>
      </span>
      {/* What she asks for (owner, 29 Oct 2026): a free sample, or a better rate on a top seller. */}
      <span className="lp-w-asks"><span><Icon name="gift" size={13} width={2.4} /> Free sample</span><span><Icon name="trend" size={13} width={2.4} /> Better rate</span></span>
      <span className="lp-w-next"><Icon name="users" size={13} width={2.4} /> Our team talks to the seller</span>
    </div>
  );
}

/** A personal rate card for every creator (owner, 29 Oct 2026): three sample creators' cards fanned out. Sample prices. */
const RATE_CARDS: { handle: string; level: string; photo?: string; rows: [string, string][] }[] = [
  { handle: "@kak.ros.kitchen", level: "Gold", rows: [["TikTok video", "RM 450"], ["TikTok LIVE", "RM 300"]] },
  { handle: "@hafiz.tech", level: "Bronze", rows: [["TikTok video", "RM 180"], ["Threads post", "RM 50"]] },
  { handle: CREATOR.handle, level: CREATOR.level, photo: CREATOR.photo, rows: [["TikTok video", "RM 350"], ["Instagram Reel", "RM 300"], ["Ad rights, 30 days", "RM 400"]] },
];
function RateTile() {
  return (
    <div className="lp-w-rcx" aria-hidden="true">
      {RATE_CARDS.map((c, i) => (
        <div key={c.handle} className="lp-rcx" style={v({ i })}>
          <span className="lp-rcx-h">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/master-logo-transparent.png" alt="" />Rezekii<em>Rate card</em>
          </span>
          <span className="lp-rcx-me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.photo ? <img src={c.photo} alt="" /> : <Av name={c.handle} size={34} />}
            <span><b>{c.handle}</b><small>{c.level} creator</small></span>
          </span>
          <ul>{c.rows.map(([k, p]) => <li key={k}><span>{k}</span><b>{p}</b></li>)}</ul>
          <span className="lp-rcx-f">Book me on Rezekii</span>
        </div>
      ))}
    </div>
  );
}

/** The app's own referral offer (owner, 29 Oct 2026: a better presentation), with the share link under it. */
function InviteTile() {
  return (
    <div className="lp-w-ref2">
      {/* Sharing is a favour to a friend (owner, 29 Oct 2026): what they'd send. */}
      <span className="lp-w-msg">“Check your TikTok showcase on Rezekii. It found me better rates on the same products, free.”</span>
      <ReferralOffer />
      <span className="lp-w-link2"><Icon name="link" size={14} width={2.4} /> rezekii.com/r/{CREATOR.handle.replace(/^@/, "")}<b>Share</b></span>
    </div>
  );
}

const CLIPS = [
  { src: "try-on", label: "Try-On" },
  { src: "pov-demo", label: "POV" },
  { src: "review", label: "Review" },
  { src: "expert", label: "Expert" },
  { src: "drama", label: "Drama" },
  { src: "home-demo", label: "Home" },
];

const TILES: Tile[] = [
  { key: "video", title: "AI Video", ai: true, soon: true, icon: "video", tint: "linear-gradient(135deg,#25f4ee,#0e7490)", size: "tall", tip: "Make product videos with Rezekii AI. These are real examples made with it.", body: <VideoTile clips={CLIPS} /> },
  { key: "health", title: "Showcase Health", ai: true, icon: "shield", tint: "linear-gradient(135deg,#ff8a80,#e14b3b)", size: "wide", tip: "Rezekii AI checks ratings and refunds in your showcase and flags risky products. Remove them in one tap.", body: <HealthTile /> },
  { key: "wish", title: "Wish List", icon: "bag", tint: "linear-gradient(135deg,#22dc95,#00a862)", size: "wide", tip: "Want a free sample, or a better rate on a top seller? Add it to your Wish List. When many creators want it, our team talks to the seller for you.", body: <WishTile /> },
  { key: "rate", title: "Rate Card", icon: "tag", tint: "linear-gradient(135deg,#5ee7df,#0e9488)", tip: "Rezekii makes a personal rate card for every creator: your photo, your prices, your packages. Share it with sellers in one tap.", body: <RateTile /> },
  { key: "invite", title: "Earn with Referral", icon: "users", tint: "linear-gradient(135deg,#ff7aa8,#e8005a)", size: "wide", tip: `Do a friend a favour: they can check their showcase too and may earn more. You get ${REFERRAL_REWARD.inviter} credits and they get ${REFERRAL_REWARD.friend} when they get started.`, body: <InviteTile /> },
];
export function CreatorBento() {
  return <Bento tiles={TILES} label="Rezekii features" />;
}

/* ---------------- Why Rezekii (USP banners) ---------------- */

/** The extra on one sale, in sen as it's paid (RM 1.60), so 1,000 orders add up to exactly RM 1,600 (owner, 29 Oct 2026). */
const PER_SALE = Math.round(POT.price * (POT.tapRate - POT.publicRate)) / 100;
const rmn = (x: number) => x.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const AI_PICK = product("p20");
const FEED = ["p02", "p11", "p23", "p04", "p18", "p12"].map(product);
const TREND = ["p01", "p13", "p20"].map(product);
const USPS: Usp[] = [
  {
    title: "Stop Scrolling for Products", tint: "#6d5efc",
    line: "Rezekii AI shows what's trending and suits you, before you buy or shoot.",
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
    title: "More Commission, Same Products", tint: "#00c073",
    line: "Rezekii AI finds higher rates for products already in your showcase.",
    demo: (
      <div className="lp-u-col">
        <div className="lp-u-row">
          <Thumb src={POT.img} size={44} />
          <span>{POT.name}<small>Already in your showcase</small></span>
          <span className="lp-u-flip"><span className="was">{POT.publicRate}%</span><b>{POT.tapRate}% <s>{POT.publicRate}%</s></b></span>
        </div>
        <span className="lp-u-chip">Example: RM {POT.price.toFixed(2)} item, +RM {PER_SALE.toFixed(2)} a sale</span>
      </div>
    ),
  },
  {
    // TikTok samples are free too; sellers there often set strict rules (owner, 29 Oct 2026). The difference is who gets in.
    // TikTok has free samples too, but best sellers rarely offer them and sellers fear no-shows (owner, 29 Oct 2026). Rezekii
    // tracks every sample to a posted video, so sellers can trust the creator.
    title: "Free Samples, Even on Best Sellers", tint: "#1d4ed8",
    line: "Sellers worry samples never become videos. Rezekii tracks each one to your post, so they can trust you.",
    demo: (
      <div className="lp-u-col">
        <div className="lp-u-track">
          <span className="lp-u-line"><i /></span>
          <span className="lp-u-parcel"><Icon name="box" size={16} width={2.2} /></span>
          <ol>{["Approved", "Received", "Video posted"].map((t, i) => <li key={t} style={v({ i })}><i />{t}</li>)}</ol>
        </div>
        <span className="lp-u-spent"><s><Icon name="lock" size={13} width={2.2} /> No sample</s><b>Free sample · {short(TRACK.sold)} sold</b></span>
      </div>
    ),
  },
  {
    // One video, four apps, one tap (owner, 29 Oct 2026): each app's own icon so it reads at a glance.
    // Four apps means four places to earn (owner, 29 Oct 2026), not a promise of 4× the commission.
    // Before: one app to earn on. Now: the same video and caption, 3 more apps to earn on (owner, 29 Oct 2026).
    title: "Same Video, 4 Places to Earn", tint: "#f08a00",
    line: "Same videos, same captions. Rezekii posts them to 3 more apps where you can earn too.",
    demo: (
      <div className="lp-u-hub">
        <span className="lp-u-src">
          <Thumb src="/ai-videos/try-on.jpg" size={52} />
          <b>1 video</b>
          <small>1 → 4 places</small>
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
              <em>{i === 0 ? "Today" : "+ New"}</em>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

export function CreatorUsps() {
  return <UspRail items={USPS} label="Why Rezekii" />;
}

/* ---------------- Without vs With ---------------- */

const ROWS: CompareRow[] = [
  { label: `Commission on a RM ${POT.price.toFixed(2)} product`, without: `${POT.publicRate}% open plan, RM ${earn(POT, POT.publicRate).toFixed(2)} a sale`, with: <span className="lp-cmp-money"><span>{POT.tapRate}% on Rezekii, RM {earn(POT, POT.tapRate).toFixed(2)} a sale</span><b>+RM {PER_SALE.toFixed(2)} extra a sale</b><small>+RM {PER_SALE.toFixed(2)} × 1,000 orders = +RM {rmn(PER_SALE * 1000)} extra</small></span> },
  { label: "Finding viral products", without: "Hours a day scrolling TikTok, then guessing", with: "Rezekii AI shows what's trending for you" },
  { label: "Captions", without: "A new caption for every app, every post", with: "Write once, fitted to each app" },
  { label: "Posting", without: "Same video uploaded 4 times", with: <span className="lp-cmp-apps">Post once to<span>{PLATS.map((p) => <PlatIcon key={p} name={p} size={26} />)}</span><span className="lp-sr">TikTok, Facebook, Instagram and Threads</span></span> },
  { label: "Free samples", without: "Sellers often say no, and best sellers rarely offer samples", with: "Free samples, even on best sellers" },
  { label: "When to post", without: "Post anytime and hope for FYP", with: "Rezekii AI finds your Viral Time Frame" },
];
export function CreatorCompare() {
  return <Compare rows={ROWS} note={`Example: ${POT.name} at RM ${POT.price.toFixed(2)}. Rates differ by product and level; some products have no better rate.`} />;
}

/* ---------------- What You'll See ---------------- */

export function CreatorSee() {
  return <SeeRail items={[]} stories={CREATOR_STORIES} label="What creators say" />;
}

/* ---------------- Banner, product strip and pain-point posters (owner, 29 Oct 2026: some banners, not all animation) ---------------- */

const COLLAGE = ["p08", "p01", "p13", "p24", "p21"].map(example);
/** A bold banner right after the hero: the promise in big type over the products it applies to. */
export function CreatorBanner() {
  return (
    <section className="lp-banner" aria-label="Same products, more commission">
      <div className="lp-banner-t">
        <h2>Same Products. <em>More Commission.</em></h2>
        {/* 1% sounds small; at volume it isn't (owner, 29 Oct 2026). */}
        <p>1% sounds small. On about RM 160,000 of sales, it's RM 1,600 more.</p>
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

/** A slow strip of products with their better rate, between sections. */
const STRIP = ["p08", "p01", "p13", "p24", "p21", "p02", "p11", "p12", "p07", "p16"].map(example);
export function CreatorStrip() {
  return (
    <div className="lp-strip" aria-hidden="true">
      <div>
        {[...STRIP, ...STRIP].map((p, i) => (
          <span key={i}>
            <Thumb src={p.img} size={44} />
            <b>+1% on Rezekii</b>
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
const HOT = NICHE_BEST[0];
const HOT_P = product(HOT.productId);
const IDEAS = NICHE_BEST.filter((x) => x.idea).slice(0, 2);
const TT_FEED = ["try-on", "pov-demo", "review", "expert", "drama", "home-demo"].map((x) => `/ai-videos/${x}.jpg`);
const TOP_VIDS = [...VIDEOS].sort((x, y) => y.commission - x.commission).slice(0, 3);
type Pain = { key: string; tint: string; pain: string; why: string; fix: string; art: React.ReactNode };
const PAINS: Pain[] = [
  {
    key: "health", tint: "linear-gradient(160deg,#3b0d12,#b4232c)",
    pain: "Scared Your Account Gets Frozen?",
    why: "Low-rated products and refunds can bring violations, less traffic and money you can't withdraw.",
    fix: "Rezekii AI flags risky products and the videos selling them, so you fix them early.",
    art: (
      <div className="lp-pa-risk">
        <span className="lp-pa-tag">Showcase risk · <b>Watch</b></span>
        <div className="lp-pa-row bad"><Thumb src={RISKY.img} size={36} /><span>{RISKY.name}<small>★ {RISKY.rating} · high refunds</small></span></div>
        <div className="lp-pa-row"><Icon name="video" size={16} width={2.2} /><span>Linked to 2 of your videos<small>Remove it in one tap</small></span></div>
      </div>
    ),
  },
  {
    key: "source", tint: "linear-gradient(160deg,#1e1452,#6d5efc)",
    pain: "Saw It Trending? You're Already Late.",
    why: "By the time your sample arrives, about a week later, the wave has passed.",
    fix: "AI Viral Product Sourcing reads real sales and your account, and tells you what to shoot next. Trust data, not trends.",
    art: (
      <div className="lp-pa-chart">
        <span className="lp-pa-tag"><Thumb src={HOT_P.img} size={28} /> {short(HOT.weekSold)} sold this week <b>↑</b></span>
        <span className="lp-pa-bars">{daily(HOT.weekSold, HOT.trend).map((d, i, a) => <i key={i} style={v({ h: `${Math.round((d / Math.max(...a)) * 100)}%`, i })} />)}</span>
        <small>Rising early, before the wave</small>
      </div>
    ),
  },
  {
    key: "ideas", tint: "linear-gradient(160deg,#4a2a00,#e8a400)",
    pain: "Out of Ideas Today?",
    why: "Scrolling TikTok for hours to find what to film, then copying what's already old.",
    fix: "Today's Ideas gives you what to film, picked for your account.",
    // Before: endless TikTok scrolling. After: today's ideas, ready (owner, 29 Oct 2026).
    art: (
      <div className="lp-pa-swap">
        <div className="lp-pa-feed">
          <div>{[...TT_FEED, ...TT_FEED].map((src, i) => <Thumb key={i} src={src} size={60} />)}</div>
          <span className="lp-pa-tag"><Icon name="clock" size={14} width={2.4} /> 2 hours of scrolling…</span>
        </div>
        <div className="lp-pa-ideas">
          <span className="lp-pa-tag">Today&apos;s Ideas, for you</span>
          {IDEAS.map((x) => {
            const p = product(x.productId);
            return <div key={x.productId} className="lp-pa-row"><Thumb src={p.img} size={36} /><span>“{x.idea}”<small>{p.name}</small></span></div>;
          })}
        </div>
      </div>
    ),
  },
  {
    // What they care about: which videos earn, not where the data comes from (owner, 29 Oct 2026).
    key: "live", tint: "linear-gradient(160deg,#04291a,#00a862)",
    pain: "Which Video Is Actually Making You Money?",
    why: "Guessing what works means posting more of what doesn't.",
    fix: "See commission per video and product as it happens, so you post more of what earns.",
    art: (
      <div className="lp-pa-risk">
        <span className="lp-pa-tag"><i className="dot" /> Live</span>
        {TOP_VIDS.map((x, i) => (
          <div key={x.id} className={`lp-pa-row ${i === 0 ? "bad top" : ""}`}>
            <Icon name="video" size={16} width={2.2} />
            <span>{x.title}<small>{i === 0 ? "Top earner · " : ""}RM {x.commission.toFixed(2)} commission</small></span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "plan", tint: "linear-gradient(160deg,#0b2246,#2f80ed)",
    pain: "Posting Whenever You Can?",
    why: "Random times mean your best videos land when nobody's watching.",
    fix: "Plan the week in Content Calendar, timed to your golden hours.",
    // Posting time as a clock (owner, 29 Oct 2026): her golden 8–10 pm lit up, then the posts lined up for it.
    art: (
      <div className="lp-pa-clock">
        <svg viewBox="0 0 200 200" width="170" height="170">
          <circle cx="100" cy="100" r="96" className="face" />
          {TICKS.map((d) => <path key={d} d={`M${at(d, 89)} L${at(d, 94)}`} className="tick" />)}
          {NUMS.map(([t, d]) => {
            const [x, y] = pt(d, 58);
            return <text key={t} x={x.toFixed(2)} y={(y + 5).toFixed(2)} textAnchor="middle">{t}</text>;
          })}
          <path d={arc(8, 10)} className="arc" />
          <line x1="100" y1="100" x2="100" y2="56" className="hand h" />
          <line x1="100" y1="100" x2="100" y2="36" className="hand m" />
          <circle cx="100" cy="100" r="5" className="pin" />
        </svg>
        <span className="lp-pa-tag">Your golden time: 8–10 pm · 4 posts lined up</span>
      </div>
    ),
  },
];
export function CreatorPains() {
  return (
    <AutoSlider label="Affiliate problems Rezekii solves" every={5000} className="three lp-pains">
      {PAINS.map((x) => (
        <article key={x.key} className="lp-poster" style={{ background: x.tint }}>
          <h3>{x.pain}</h3>
          <p className="lp-poster-why">{x.why}</p>
          <div className="lp-poster-art" aria-hidden="true">{x.art}</div>
          <p className="lp-poster-fix"><Icon name="check" size={14} width={3} /><span><AiText text={x.fix} /></span></p>
        </article>
      ))}
    </AutoSlider>
  );
}
