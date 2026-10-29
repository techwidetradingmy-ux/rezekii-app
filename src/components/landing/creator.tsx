"use client";

import { Icon } from "@/components/icons";
import { CREATOR, MISSIONS, REFERRAL_REWARD, product, short } from "@/lib/mock";
import { NOT_YET, WANTED } from "@/lib/mock-showcase";
import { AiMark } from "@/components/ui";
import { App, Av, Flip, PLATS, PlatIcon, Ring, Swap, Thumb, v } from "./bits";
import { Bento, VideoTile, type Tile } from "./bento";
import { Journey, type DayStep } from "./journey";
import { LockScreen, type Note } from "./phone";
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
  { title: "Best time to post today: 8–10 pm", line: "When your followers watch most" },
  { title: "Sample shipped. Post by 6 Nov", line: `${product("p05").name} is on its way` },
  { title: `+${POST_TODAY.reward} credits`, line: "Mission done: you posted today" },
];

export function CreatorHeroPhone() {
  return <LockScreen notes={HERO_NOTES} label="Example: Rezekii notifications arriving on a phone's lock screen" />;
}

/* ---------------- Mini app screens (A Day With Rezekii) ---------------- */

const SCAN = ["p01", "p13", "p24"].map(example);
function ScanScreen() {
  return (
    <App title="Showcase Scan">
      <div className="lp-s-scan">
        <span className="lp-bar"><i /></span>
        <Swap at={1.1} from="Checking your showcase…" to={<><b>{n(CREATOR.showcaseSize)}</b> products checked</>} />
      </div>
      <p className="lp-s-hit"><Icon name="trend" size={14} width={2.4} /> {SCAN.length} pay more on Rezekii</p>
      <ul className="lp-s-rows">
        {SCAN.map((p, i) => (
          <li key={p.id} style={v({ i })}>
            <Thumb src={p.img} size={36} />
            <span>{p.name}<small>{p.shop}</small></span>
            <Flip was={p.publicRate} now={p.tapRate} i={i} />
          </li>
        ))}
      </ul>
      <Swap className="lp-s-btn press" at={2.9} from="Add All" to={<><Icon name="check" size={14} width={3} /> {SCAN.length} Added</>} />
    </App>
  );
}

const PICKS = [
  { id: "p01", tag: "Selling fast" },
  { id: "p20", tag: "Fits your videos" },
  { id: "p21", tag: "Your #2 category" },
];
function PicksScreen() {
  return (
    <App title="AI Picks" ai>
      <ul className="lp-s-read">
        {["Your videos and sales", "What sells in Malaysia"].map((t, i) => (
          <li key={t} style={v({ i })}>
            <Swap at={0.5 + i * 0.5} from={<span className="lp-spin" />} to={<span className="lp-ok"><Icon name="check" size={10} width={3.4} /></span>} />
            {t}
          </li>
        ))}
      </ul>
      <ul className="lp-s-picks">
        {PICKS.map(({ id, tag }, i) => {
          const p = product(id);
          return (
            <li key={id} style={v({ i })}>
              <Thumb src={p.img} size={44} />
              <span>
                {p.name}
                <small>{short(p.sold)} sold · ★{p.rating}</small>
                <em className={i === 0 ? "hot" : ""}>{tag}</em>
              </span>
            </li>
          );
        })}
      </ul>
    </App>
  );
}

const HEALTH = ["p05", "p17", "p21", "p22"].map(product);
const STAGES = ["Applied", "Approved", "Shipped", "Received"];
const YOGA = product("p05");
function SamplesScreen() {
  return (
    <App title="Free Samples">
      <div className="lp-s-prod">
        <Thumb src={YOGA.img} size={44} />
        <span>{YOGA.name}<small>{YOGA.shop} · Free sample</small></span>
      </div>
      <ol className="lp-s-track">
        {STAGES.map((t, i) => (
          <li key={t} style={v({ i })}><i />{t}</li>
        ))}
      </ol>
      <p className="lp-s-due"><Icon name="cal" size={14} width={2.2} /> Post 1 video by 6 Nov</p>
      <div className="lp-s-vids">
        <span>Videos posted</span>
        <span className="lp-pips">{[0, 1, 2].map((i) => <i key={i} style={v({ i })} />)}</span>
        <Swap at={3.6} from="0 of 3" to={<b>Bonus unlocked</b>} />
      </div>
    </App>
  );
}

const SLOTS = ["6a", "9a", "12p", "3p", "6p", "8p", "10p"];
const YOU = [14, 20, 34, 26, 48, 96, 66];
const OTHER = [22, 58, 94, 50, 36, 30, 18];
function BestTimeScreen() {
  return (
    <App title="Best Time to Post" ai>
      <div className="lp-s-who"><i /><span>You</span><span>Another creator</span></div>
      <div className="lp-s-bars">
        {SLOTS.map((s, i) => (
          <span key={s} className={i === 5 ? "a" : i === 2 ? "b" : ""} style={v({ a: `${YOU[i]}%`, b: `${OTHER[i]}%`, i })}>
            <i />
            <small>{s}</small>
          </span>
        ))}
      </div>
      <p className="lp-s-best"><span className="pa"><b>Your best:</b> 8–10 pm</span><span className="pb"><b>Theirs:</b> 12–2 pm</span></p>
      <small className="lp-s-fine">Everyone&apos;s time is different.</small>
    </App>
  );
}

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
  { id: "samples", time: "13:00", title: "Free Samples", problem: "Buying samples with your own money.", fix: "Free, tracked to your door. Post 1 video; 3 unlock a bonus.", note: HERO_NOTES[3], screen: <SamplesScreen /> },
  { id: "time", time: "19:00", title: "Best Time to Post", ai: true, problem: "Posting when your followers aren't watching.", fix: "Rezekii AI learns when YOUR followers watch.", note: HERO_NOTES[2], screen: <BestTimeScreen /> },
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

const PER_SALE = (TRACK.price * (TRACK.tapRate - TRACK.publicRate)) / 100;
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
        <span className="lp-u-chip">+RM {PER_SALE.toFixed(2)} a sale · example</span>
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
    title: "Post Once, 4 Platforms", tint: "#f08a00",
    line: "Not tied to one app: your videos work on 4 platforms, not 1.",
    demo: (
      <ul className="lp-u-fan">
        {PLATS.map((p, i) => (
          <li key={p} style={v({ i })}>
            <Thumb src="/ai-videos/try-on.jpg" size={46} />
            <PlatIcon name={p} size={20} />
            <em>Posted</em>
          </li>
        ))}
      </ul>
    ),
  },
  {
    // RM 99 a month crossed out to Free during Beta, no user limit (owner, 29 Oct 2026).
    title: "Free During Beta", tint: "#f5a623",
    line: "Usually RM 99 a month. No follower minimum. Nothing changes without your OK.",
    demo: (
      <div className="lp-u-free">
        <span className="lp-u-price">
          <s className="lp-u-was">RM 99<small> / month</small></s>
          <b>Free</b>
          <span className="lp-u-stamp">Beta</span>
        </span>
        <span className="lp-u-chips"><span><Icon name="check" size={12} width={3} /> No follower minimum</span><span><Icon name="check" size={12} width={3} /> Your OK first</span></span>
      </div>
    ),
  },
];

export function CreatorUsps() {
  return <UspRail items={USPS} label="Why Rezekii" />;
}

/* ---------------- Without vs With ---------------- */

const ROWS: CompareRow[] = [
  { label: "Commission, same product", without: `${TRACK.publicRate}% open plan`, with: `${TRACK.tapRate}% on Rezekii, +RM ${PER_SALE.toFixed(2)} a sale` },
  { label: "Finding products", without: "Scroll TikTok for hours, then guess", with: "Rezekii AI shows what's trending for you" },
  { label: "Samples", without: "Buy them yourself", with: "Free, sent to your door" },
  { label: "Posting", without: "One app, or upload 4 times", with: "Post once to 4 platforms" },
  { label: "Cost", without: "—", with: "Free during Beta" },
];
export function CreatorCompare() {
  return <Compare rows={ROWS} note={`Example: ${TRACK.name} at RM ${TRACK.price.toFixed(2)}. Rates differ by product and level; some products have no better rate.`} />;
}

/* ---------------- What You'll See ---------------- */

const SEE: See[] = [
  { title: "Your Scan Results", line: `Better rates found, like ${TRACK.publicRate}% → ${TRACK.tapRate}%.`, screen: <ScanScreen /> },
  { title: "Posted to 4 Apps", line: "One upload: TikTok, Facebook, Instagram, Threads.", screen: <PostScreen /> },
];
export function CreatorSee() {
  return <SeeRail items={SEE} stories={CREATOR_STORIES.slice(0, 2)} label="App screens and testimonials" />;
}
