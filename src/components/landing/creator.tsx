"use client";

import { Icon } from "@/components/icons";
import { CREATOR, MISSIONS, PRODUCTS, REFERRAL_REWARD, product, short, type Product } from "@/lib/mock";
import { NOT_YET, WANTED } from "@/lib/mock-showcase";
import { AiMark } from "@/components/ui";
import { App, Av, Flip, PLATS, PlatIcon, Ring, Swap, Thumb, v } from "./bits";
import { Bento, VideoTile, type Tile } from "./bento";
import { Journey, type DayStep } from "./journey";
import { HeroAlerts, LockScreen, type Note } from "./phone";
import { Compare, type CompareRow } from "./compare";
import { CREATOR_STORIES } from "./stories";
import { SeeRail, UspRail, type See, type Usp } from "./usp";

/**
 * Creator landing, "Watch Rezekii Work" (owner, 29 Oct 2026): every animation is a real feature in miniature. Products, rates,
 * sold counts and ratings come from PRODUCTS; people and the rest are sample, and the page says so.
 */

/** Landing examples show a modest +1% (owner, 29 Oct 2026), not the biggest gap in the sample data. */
const example = (id: string) => { const p = product(id); return { ...p, tapRate: p.publicRate + 1 }; };
const TRACK = example("p01");
const POST_TODAY = MISSIONS.find((m) => m.id === "m7")!;
const WISH = NOT_YET[0];
const WANTED_N = WANTED[0].creators;
const n = (x: number) => x.toLocaleString("en-MY");

/* ---------------- Hero ---------------- */

const HERO_NOTES: Note[] = [
  { title: "3 products have a better rate", line: `${TRACK.name}: ${TRACK.publicRate}% → ${TRACK.tapRate}% on Rezekii` },
  { title: `AI pick: ${TRACK.name.replace(/ \(.*\)$/, "")} is selling fast`, line: `${short(TRACK.sold)} sold. Fits your Fashion videos` },
  { title: "Your viral time frame today: 8–10 pm", line: "When your followers watch most" },
  { title: "Sample shipped. Post by 6 Nov", line: `${product("p05").name} is on its way` },
  { title: `+${POST_TODAY.reward} credits`, line: "Mission done: you posted today" },
];

export function CreatorHeroPhone() {
  return (
    <>
      <LockScreen notes={HERO_NOTES} label="Example: Rezekii notifications arriving on a phone's lock screen" />
      <HeroAlerts notes={HERO_NOTES.slice(0, 2)} />
    </>
  );
}

/* ---------------- Mini app screens (A Day With Rezekii) ---------------- */

/* Screens fill top to bottom from the first frame and keep moving (owner, 29 Oct 2026, option A). Sample data only. */

const rm = (x: number) => `RM${x.toFixed(2)}`;
const earn = (p: Product, rate: number) => (p.price * rate) / 100;

/** Showcase Scan, laid out like the showcase list creators know: what each product earns, then a scan line runs down it. */
const SCAN = ["p01", "p13", "p24"].map(example);
const LOW = product("p04");
function ScanScreen() {
  return (
    <App title="Showcase Scan" ai>
      <div className="lp-s-scan">
        <span className="lp-bar"><i /></span>
        <Swap at={1.1} from="Checking your showcase…" to={<><b>{n(CREATOR.showcaseSize)}</b> products checked</>} />
      </div>
      <p className="lp-s-hit"><Icon name="trend" size={14} width={2.4} /> {SCAN.length} pay more on Rezekii</p>
      <ul className="lp-s-man">
        {SCAN.map((p, i) => (
          <li key={p.id} style={v({ i })}>
            <Thumb src={p.img} size={38} />
            <span>{p.name}<small>{p.shop}</small><em>+1% on Rezekii</em></span>
            <span className="lp-s-earn"><small>Earn</small><Flip was={earn(p, p.publicRate)} now={earn(p, p.tapRate)} i={i} fmt={rm} /></span>
          </li>
        ))}
        <li className="low" style={v({ i: SCAN.length })}>
          <Thumb src={LOW.img} size={38} />
          <span>{LOW.name}<small>{LOW.shop}</small><em>Low rating ★{LOW.rating}</em></span>
          <span className="lp-s-earn"><small>Earn</small><b>{rm(earn(LOW, LOW.publicRate))}</b></span>
        </li>
        <i className="lp-s-beam" />
      </ul>
      <Swap className="lp-s-btn press" at={2.9} from="Add All" to={<><Icon name="check" size={14} width={3} /> {SCAN.length} Added</>} />
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
const SHOP = [...OPEN].sort((a, b) => b.rating - a.rating).slice(0, 12);
function SamplesScreen() {
  return (
    <App title="Free Samples">
      <p className="lp-s-open"><Icon name="gift" size={16} width={2.2} /><b>{OPEN.length} free samples</b> open now</p>
      <p className="lp-s-free"><span><Icon name="check" size={11} width={3.2} /> Open to new creators</span><span><Icon name="check" size={11} width={3.2} /> No streak needed</span></p>
      <div className="lp-s-shop">
        <div>
          {[...SHOP, ...SHOP].map((p, i) => (
            <span key={i}>
              <Thumb src={p.img} size={72} />
              <em>Free</em>
              <small>{p.name}</small>
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
      <p className="lp-s-when"><b>Your best: 8–10 pm</b><small>When your followers watch most</small></p>
      <p className="lp-s-other"><i /> Another creator: 12–2 pm</p>
      <small className="lp-s-fine">Everyone&apos;s time is different.</small>
    </App>
  );
}

const HEALTH = ["p05", "p17", "p21", "p22"].map(product);

function PostScreen() {
  return (
    <App title="Post Everywhere">
      <div className="lp-s-up">
        <Thumb src="/ai-videos/try-on.jpg" size={52} />
        <span>
          <b>Try-on video</b>
          <Swap at={1.4} from="Uploading…" to="Uploaded once" />
          <span className="lp-bar"><i /></span>
        </span>
      </div>
      <ul className="lp-s-apps">
        {PLATS.map((p, i) => (
          <li key={p} style={v({ i })}>
            <PlatIcon name={p} size={28} />
            <span>{p}</span>
            <Swap at={1.8 + i * 0.45} from="Waiting" to={<b><Icon name="check" size={12} width={3.2} /> Posted</b>} />
          </li>
        ))}
      </ul>
    </App>
  );
}

function RewardsScreen() {
  return (
    <App title="Rewards">
      <div className="lp-s-lvl">
        <Ring from={POST_TODAY.progress / POST_TODAY.goal} to={(POST_TODAY.progress + 1) / POST_TODAY.goal}>
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
            <i className={l.toLowerCase()}>{l[0]}</i>
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
  { id: "samples", time: "13:00", title: "Free Samples", problem: "Buying samples with your own money.", fix: "Free samples, open to new creators. Sent to your door.", note: { title: `${OPEN.length} free samples open now`, line: "Open to new creators" }, screen: <SamplesScreen /> },
  { id: "time", time: "19:00", title: "Viral Time Frame", ai: true, problem: "Posting when your followers aren't watching.", fix: "Rezekii AI learns when YOUR followers watch.", note: HERO_NOTES[2], screen: <BestTimeScreen /> },
  { id: "rewards", time: "21:00", title: "Rewards & Levels", problem: "Doing well, with nothing extra for it.", fix: "Credits for posting. Better rates as you level up.", note: HERO_NOTES[4], screen: <RewardsScreen /> },
];
export function CreatorDay() {
  return <Journey steps={DAY} label="A day with Rezekii" />;
}

/* ---------------- Bento widgets (Everything in One App) ---------------- */

function HealthTile() {
  return (
    <ul className="lp-w-health" aria-hidden="true">
      {HEALTH.slice(0, 3).map((p, i) => (
        <li key={p.id} className={p.rating < 4 ? "bad" : ""} style={v({ i })}>
          <Thumb src={p.img} size={24} />
          <b>★ {p.rating}</b>
        </li>
      ))}
    </ul>
  );
}
function MissionsTile() {
  return (
    <div className="lp-w-mission" aria-hidden="true">
      <small>Post today · {POST_TODAY.progress + 1}/{POST_TODAY.goal}</small>
      <span className="lp-bar"><i style={v({ from: `${(POST_TODAY.progress / POST_TODAY.goal) * 100}%`, to: `${((POST_TODAY.progress + 1) / POST_TODAY.goal) * 100}%` })} /></span>
      <b>+{POST_TODAY.reward}</b>
    </div>
  );
}

function RateTile() {
  return (
    <ul className="lp-w-rate" aria-hidden="true">
      {["TikTok video", "Instagram Reel", "Ad rights"].map((t, i) => (
        <li key={t} style={v({ i })}><span>{t}</span><i /></li>
      ))}
    </ul>
  );
}

function WishTile() {
  return (
    <div className="lp-w-wish" aria-hidden="true">
      <span className="lp-w-link"><Icon name="link" size={12} width={2.4} /><span className="lp-type">…/bento-box-set</span></span>
      <span className="lp-w-wishrow">
        <Thumb src={WISH.img} size={34} />
        <b>{WANTED_N} want this</b>
      </span>
    </div>
  );
}

function InviteTile() {
  return (
    <div className="lp-w-invite" aria-hidden="true">
      <Av name={CREATOR.handle} size={34} />
      <span className="lp-w-wire"><i><Icon name="gift" size={12} width={2.4} /></i></span>
      <Av name="@nurul.beauty" size={34} />
      <small>+{REFERRAL_REWARD.inviter} you · +{REFERRAL_REWARD.friend} them</small>
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
  { key: "health", title: "Showcase Health", ai: true, icon: "shield", tint: "linear-gradient(135deg,#ff8a80,#e14b3b)", size: "wide", tip: "Rezekii AI flags low-rated products in your showcase. Remove them all in one tap.", body: <HealthTile /> },
  { key: "wish", title: "Wish List", icon: "bag", tint: "linear-gradient(135deg,#22dc95,#00a862)", size: "wide", tip: "Paste a product link and say what you'll post. Most-wanted products get brought in.", body: <WishTile /> },
  { key: "missions", title: "Missions", icon: "trophy", tint: "linear-gradient(135deg,#ffd34d,#e8a400)", tip: "Earn credits for posting, not for logging in.", body: <MissionsTile /> },
  { key: "rate", title: "Rate Card", icon: "tag", tint: "linear-gradient(135deg,#5ee7df,#0e9488)", tip: "Set your own prices for videos, Reels, LIVEs and ad rights.", body: <RateTile /> },
  { key: "invite", title: "Invite Friends", icon: "users", tint: "linear-gradient(135deg,#ff7aa8,#e8005a)", tip: `Share your link. You get ${REFERRAL_REWARD.inviter} credits and your friend gets ${REFERRAL_REWARD.friend} when they start.`, body: <InviteTile /> },
];
export function CreatorBento() {
  return <Bento tiles={TILES} label="Rezekii features" />;
}

/* ---------------- Why Rezekii (USP banners) ---------------- */

/** Money examples use a pricier sample product (owner, 29 Oct 2026): +1% on RM 159.90 shows what it adds up to. */
const POT = example("p08");
const PER_SALE = (POT.price * (POT.tapRate - POT.publicRate)) / 100;
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
          <Thumb src={TRACK.img} size={44} />
          <span>{TRACK.name}<small>Already in your showcase</small></span>
          <span className="lp-u-flip"><span className="was">{TRACK.publicRate}%</span><b>{TRACK.tapRate}% <s>{TRACK.publicRate}%</s></b></span>
        </div>
        <span className="lp-u-chip">Example: RM {POT.price.toFixed(2)} item, +RM {PER_SALE.toFixed(2)} a sale</span>
      </div>
    ),
  },
  {
    title: "Free Samples, No Money Upfront", tint: "#1d4ed8",
    line: "Just starting? You don't need to buy stock to review it.",
    demo: (
      <div className="lp-u-col">
        <div className="lp-u-track">
          <span className="lp-u-line"><i /></span>
          <span className="lp-u-parcel"><Icon name="box" size={16} width={2.2} /></span>
          <ol>{["Applied", "Shipped", "Received"].map((t, i) => <li key={t} style={v({ i })}><i />{t}</li>)}</ol>
        </div>
        <span className="lp-u-spent"><s><Icon name="bag" size={13} width={2.2} /> Buy samples</s><b>RM 0 spent</b></span>
      </div>
    ),
  },
  {
    // One video, four apps, one tap (owner, 29 Oct 2026): each app's own icon so it reads at a glance.
    title: "Post Once, 4 Platforms", tint: "#f08a00",
    line: "One video to TikTok, Facebook, Instagram and Threads in one tap.",
    demo: (
      <div className="lp-u-hub">
        <span className="lp-u-src">
          <Thumb src="/ai-videos/try-on.jpg" size={52} />
          <b>1 video</b>
        </span>
        <svg className="lp-u-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[12.5, 37.5, 62.5, 87.5].map((y, i) => <path key={y} d={`M0 50 C50 50 50 ${y} 100 ${y}`} pathLength={100} style={v({ i })} />)}
        </svg>
        <ul>
          {PLATS.map((p, i) => (
            <li key={p} style={v({ i })}>
              <PlatIcon name={p} size={28} />
              <span>{p}</span>
              <em><Icon name="check" size={11} width={3.4} /></em>
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
  { label: `Commission on a RM ${POT.price.toFixed(2)} product`, without: `${POT.publicRate}% open plan, RM ${earn(POT, POT.publicRate).toFixed(2)} a sale`, with: <span className="lp-cmp-money"><span>{POT.tapRate}% on Rezekii</span><b>RM {earn(POT, POT.tapRate).toFixed(2)} a sale</b><small>+RM {PER_SALE.toFixed(2)} more each sale, RM {rmn(PER_SALE * 1000)} per 1,000 sales</small></span> },
  { label: "Finding viral products", without: "Hours a day scrolling TikTok, then guessing", with: "Rezekii AI shows what's trending for you" },
  { label: "Captions", without: "A new caption for every app, every post", with: "Write once, fitted to each app" },
  { label: "Posting", without: "Same video uploaded 4 times", with: <span className="lp-cmp-apps">Post once to<span>{PLATS.map((p) => <PlatIcon key={p} name={p} size={26} />)}</span><span className="lp-sr">TikTok, Facebook, Instagram and Threads</span></span> },
  { label: "Free samples", without: "Free, but sellers set strict requirements", with: "Open to new creators, sent to your door" },
  { label: "When to post", without: "Post anytime and hope for FYP", with: "Rezekii AI finds your Viral Time Frame" },
];
export function CreatorCompare() {
  return <Compare rows={ROWS} note={`Example: ${POT.name} at RM ${POT.price.toFixed(2)}. Rates differ by product and level; some products have no better rate.`} />;
}

/* ---------------- What You'll See ---------------- */

const SEE: See[] = [
  { title: "Your Scan Results", line: `Better rates found, like ${TRACK.publicRate}% → ${TRACK.tapRate}%.`, screen: <ScanScreen /> },
  { title: "Posted to 4 Apps", line: "One upload: TikTok, Facebook, Instagram, Threads.", screen: <PostScreen /> },
];
export function CreatorSee() {
  return <SeeRail items={SEE} stories={CREATOR_STORIES.slice(0, 2)} label="App screens and testimonials" />;
}
