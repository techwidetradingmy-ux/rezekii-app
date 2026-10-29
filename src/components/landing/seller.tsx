"use client";

import { Icon } from "@/components/icons";
import { PEOPLE, SAMPLE_DESTINATIONS, SELLER_RESULTS, product, rm } from "@/lib/mock";
import { WANTED } from "@/lib/mock-showcase";
import { App, Av, PLATS, PlatIcon, Swap, Thumb, v } from "./bits";
import { Bento, VideoTile, type Tile } from "./bento";
import { Journey, type DayStep } from "./journey";
import { HeroAlerts, LockScreen, type Note } from "./phone";
import { Compare, type CompareRow } from "./compare";
import { SELLER_STORIES } from "./stories";
import { SeeRail, UspRail, type See, type Usp } from "./usp";

/**
 * Seller landing, same "Watch Rezekii Work" language as the creator page (owner, 29 Oct 2026). Products and prices come from
 * PRODUCTS; creators, orders and results are sample, and the page says so.
 */

const POT = product("p08");
const WANT = WANTED[2];
const streak = (h: string) => PEOPLE.find((p) => p.handle === h)?.streak ?? 0;

/* ---------------- Hero ---------------- */

const HERO_NOTES: Note[] = [
  { title: "12 creators want your product", line: `${POT.name} · ${POT.category}` },
  { title: "Sample delivered. 3 videos posted", line: "@kak.ros.kitchen · Casserole pot" },
  { title: `New order +${rm(POT.price * 2)}`, line: "Casserole pot ×2, via @kak.ros.kitchen" },
  { title: "Weekly results ready", line: "Sales per creator, from TikTok" },
];

export function SellerHeroPhone() {
  return (
    <>
      <LockScreen notes={HERO_NOTES} label="Example: Rezekii notifications for a seller arriving on a phone's lock screen" />
      <HeroAlerts notes={HERO_NOTES.slice(0, 2)} />
    </>
  );
}

/* ---------------- Mini app screens (A Week With Rezekii) ---------------- */

const SUBMIT = ["p08", "p21", "p24"].map(product);
function Chips() {
  return (
    <div className="lp-s-chips">
      <span>+2%</span>
      <span className="ai">+5% <small>AI pick</small></span>
      <span>+8%</span>
    </div>
  );
}

function SubmitScreen() {
  return (
    <App title="Submit Products">
      <small className="lp-s-label">From Seller Center</small>
      <ul className="lp-s-check">
        {SUBMIT.map((p, i) => (
          <li key={p.id} style={v({ i })}>
            <span className="lp-box"><Icon name="check" size={11} width={3.4} /></span>
            <Thumb src={p.img} size={34} />
            <span>{p.name}<small>{rm(p.price)}</small></span>
          </li>
        ))}
      </ul>
      <small className="lp-s-label">Extra commission</small>
      <Chips />
      <Swap className="lp-s-btn press" at={3} from={`Submit ${SUBMIT.length}`} to={<><Icon name="check" size={14} width={3} /> Submitted</>} />
    </App>
  );
}

const REQ: [string, string][] = [["@kak.ros.kitchen", "Home & Kitchen"], ["@farah.home", "Home & Living"], ["@dapur.wani", "Home & Kitchen"], ["@siti.deco", "Home Decor"]];
function RequestsScreen() {
  return (
    <App title="Sample Requests">
      <div className="lp-s-prod">
        <Thumb src={POT.img} size={44} />
        <span>{POT.name}<small>{POT.shop}</small></span>
      </div>
      <p className="lp-s-hit"><Icon name="users" size={14} width={2.4} /> <Swap at={2.4} from="4 creators want it" to="12 creators want it" /></p>
      <ul className="lp-s-req">
        {REQ.map(([h, c], i) => (
          <li key={h} style={v({ i })}>
            <Av name={h} size={28} />
            <span>{h}<small>{c}</small></span>
            <em>Requested</em>
          </li>
        ))}
      </ul>
    </App>
  );
}

const REVIEW = [
  { h: "@kak.ros.kitchen", fact: `Posts daily · ${streak("@kak.ros.kitchen")}-day streak`, ok: true },
  { h: "@mei.ling.deals", fact: `Posts daily · ${streak("@mei.ling.deals")}-day streak`, ok: true },
  { h: "@zara.home", fact: "3 days late on a sample", ok: false },
];
function ApproveScreen() {
  return (
    <App title="Who Gets a Sample">
      <ul className="lp-s-review">
        {REVIEW.map((r, i) => (
          <li key={r.h} className={r.ok ? "" : "no"} style={v({ i })}>
            <Av name={r.h} size={28} />
            <span>{r.h}<small>{r.fact}</small></span>
            <Swap at={1 + i * 0.6} from="Checking" to={<b>{r.ok ? "Approved" : "Not now"}</b>} />
          </li>
        ))}
      </ul>
      <p className="lp-s-rule"><Icon name="shield" size={14} width={2.2} /> 1 sample = at least 1 video</p>
    </App>
  );
}

const VIDS = [
  { src: "home-demo", h: "@kak.ros.kitchen" },
  { src: "review", h: "@farah.home" },
  { src: "pov-demo", h: "@dapur.wani", live: true },
];
function VideosScreen() {
  return (
    <App title="Videos & LIVEs">
      <div className="lp-s-vgrid">
        {VIDS.map((x, i) => (
          <span key={x.src} style={v({ i })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/ai-videos/${x.src}.jpg`} alt="" loading="lazy" decoding="async" />
            <em className={x.live ? "live" : ""}>{x.live ? "LIVE" : "Posted"}</em>
            <small>{x.h}</small>
          </span>
        ))}
      </div>
      <p className="lp-s-hit"><Icon name="video" size={14} width={2.2} /> 2 videos posted · 1 LIVE now</p>
      <p className="lp-s-note"><Icon name="check" size={13} width={3} /> Late? We remind them for you.</p>
    </App>
  );
}

const TOP = SELLER_RESULTS.topCreators;
const TOP_MAX = Math.max(...TOP.map((c) => c.gmv));
function ResultsScreen() {
  return (
    <App title="Results per Creator">
      <small className="lp-s-label">{SELLER_RESULTS.range} · from TikTok</small>
      <ul className="lp-s-res">
        {TOP.map((c, i) => (
          <li key={c.handle} style={v({ i, w: `${(c.gmv / TOP_MAX) * 100}%` })}>
            <Av name={c.handle} size={26} />
            <span>
              <span className="lp-s-resh"><b>{c.handle}</b><small>{c.videos} videos</small></span>
              <span className="lp-bar"><i /></span>
            </span>
            <b>{rm(c.gmv, 0)}</b>
          </li>
        ))}
      </ul>
    </App>
  );
}

const WEEK: DayStep[] = [
  { id: "submit", time: "Mon", title: "Submit From Your Phone", ai: true, problem: "Setting up campaigns at a desk.", fix: "Pick products and commission. Rezekii AI suggests an amount.", note: { title: "Seller Center connected", line: "Pick products to submit" }, screen: <SubmitScreen /> },
  { id: "requests", time: "Tue", title: "Creators Request Samples", ai: true, problem: "Hunting for creators who fit.", fix: "Rezekii AI matches your products with creators in your niche.", note: HERO_NOTES[0], screen: <RequestsScreen /> },
  { id: "approve", time: "Wed", title: "Samples Only to Creators Who Post", problem: "Samples go to people who never post.", fix: "We check every request. 1 sample = at least 1 video.", note: { title: "2 approved, 1 not now", line: "Checked by the Techwide team" }, screen: <ApproveScreen /> },
  { id: "videos", time: "Thu", title: "Videos Go Live", problem: "Chasing creators for their videos.", fix: "Creators post and go LIVE. We remind anyone late.", note: HERO_NOTES[1], screen: <VideosScreen /> },
  { id: "results", time: "Fri", title: "Results per Creator", problem: "Not knowing who actually sells.", fix: "Sales for every creator, from TikTok data.", note: HERO_NOTES[3], screen: <ResultsScreen /> },
];
export function SellerWeek() {
  return <Journey steps={WEEK} label="A week with Rezekii" />;
}

/* ---------------- Bento widgets ---------------- */

function WentTile() {
  return (
    <ul className="lp-w-went" aria-hidden="true">
      {SAMPLE_DESTINATIONS.slice(0, 3).map((s, i) => (
        <li key={s.handle} style={v({ i })}>
          <Av name={s.handle} size={24} />
          <span>{s.handle}</span>
          <span className="lp-pips">{Array.from({ length: Math.max(1, s.videos) }, (_, k) => <i key={k} style={v({ i: k })} />)}</span>
        </li>
      ))}
    </ul>
  );
}

function WantedTile() {
  return (
    <div className="lp-w-stack" aria-hidden="true">
      <Thumb src={WANT.img} size={34} />
      <b>34 want this</b>
    </div>
  );
}

function PostTile() {
  return (
    <ul className="lp-w-post" aria-hidden="true">
      {PLATS.map((p, i) => (
        <li key={p} style={v({ i })}>
          <PlatIcon name={p} size={30} />
          <span className="lp-w-tick"><Icon name="check" size={10} width={3.6} /></span>
        </li>
      ))}
    </ul>
  );
}

const CLIPS = [
  { src: "home-demo", label: "Home" },
  { src: "review", label: "Review" },
  { src: "pov-demo", label: "POV" },
  { src: "try-on", label: "Try-On" },
];

/** The seller's bento. `dash` is the live sales dashboard. */
export function SellerBento({ dash }: { dash: React.ReactNode }) {
  const tiles: Tile[] = [
    { key: "dash", title: "Live Sales", icon: "chart", tint: "linear-gradient(135deg,#22dc95,#00a862)", size: "big", bare: true, tip: "Your sales from creators, from TikTok data. This one is a sample shop.", body: dash },
    { key: "videos", title: "Videos & LIVEs", icon: "video", tint: "linear-gradient(135deg,#25f4ee,#0e7490)", size: "tall", tip: "Creators post videos and go LIVE with your product. These are example videos.", body: <VideoTile clips={CLIPS} /> },
    { key: "commission", title: "AI Commission Pick", ai: true, icon: "spark", tint: "linear-gradient(135deg,#b48cff,#6d28d9)", tip: "Set how much extra commission you pay through TAP, at least +2%. Rezekii AI suggests an amount from how well each product sells.", body: <div className="lp-w-chips" aria-hidden="true"><Chips /></div> },
    { key: "went", title: "Where Samples Went", icon: "gift", tint: "linear-gradient(135deg,#7aa2ff,#1d4ed8)", size: "wide", tip: "Every sample, who has it and how many videos they posted.", body: <WentTile /> },
    { key: "wanted", title: "Wanted by Creators", icon: "flame", tint: "linear-gradient(135deg,#ff7aa8,#e8005a)", tip: "See how many creators ask for each of your products.", body: <WantedTile /> },
    { key: "post", title: "Cross-Channel Posting", icon: "send", tint: "linear-gradient(135deg,#ffb35c,#f08a00)", size: "wide", tip: "Post your own shop videos to TikTok, Facebook, Instagram and Threads at once.", body: <PostTile /> },
  ];
  return <Bento tiles={tiles} label="Rezekii seller features" />;
}

/* ---------------- Why Rezekii (USP banners) ---------------- */

const USPS: Usp[] = [
  {
    title: "RM 0 a Month", tint: "#00c073",
    line: "No fee, no contract. Commission only when you sell.",
    demo: (
      <div className="lp-u-col">
        <div className="lp-u-cost">
          <span><small>Hire staff</small><span className="lp-u-cbar red"><i /></span><b>RM 3,000+</b></span>
          <span><small>Rezekii</small><span className="lp-u-cbar"><i /></span><b>RM 0</b></span>
        </div>
        <span className="lp-u-chip">Commission only on sales</span>
      </div>
    ),
  },
  {
    title: "Creators Come to You", tint: "#1d4ed8",
    line: "Rezekii AI matches your products with creators in your niche.",
    demo: (
      <div className="lp-u-col center">
        <span className="lp-avs big">{["@kak.ros.kitchen", "@farah.home", "@dapur.wani", "@siti.deco", "@nurul.beauty"].map((h, i) => <span key={h} style={v({ i })}><Av name={h} size={38} /></span>)}</span>
        <span className="lp-u-chip">34 creators want this</span>
      </div>
    ),
  },
  {
    title: "Samples Only to Creators Who Post", tint: "#f08a00",
    line: "1 sample = at least 1 video by the due date.",
    demo: (
      <div className="lp-u-s2v">
        <span className="lp-u-boxi"><Icon name="gift" size={22} width={2.2} /></span>
        <span className="lp-u-arrow"><Icon name="arrow" size={18} width={2.4} /></span>
        <span className="lp-u-vid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ai-videos/home-demo.jpg" alt="" loading="lazy" />
          <em>Posted</em>
        </span>
      </div>
    ),
  },
  {
    title: "See Results per Creator", tint: "#6d5efc",
    line: "Sales for every creator, from TikTok data.",
    demo: (
      <div className="lp-u-chart">
        {TOP.map((c, i) => (
          <span key={c.handle} className={i === 0 ? "top" : ""} style={v({ h: `${(c.gmv / TOP_MAX) * 100}%`, i })}>
            {i === 0 && <em>{c.handle}</em>}
            <i />
          </span>
        ))}
      </div>
    ),
  },
];

export function SellerUsps() {
  return <UspRail items={USPS} label="Why Rezekii" />;
}

/* ---------------- Without vs With ---------------- */

const ROWS: CompareRow[] = [
  { label: "Finding creators", without: "Search profiles yourself", with: "Creators request your product" },
  { label: "Samples", without: "Sent to anyone who asks", with: "Only creators who post" },
  { label: "Cost", without: "Fees before any sale", with: "RM 0 a month, commission only on sales" },
  { label: "Results", without: "Guess who sells", with: "Results per creator" },
  { label: "Staff", without: "RM 3,000+ a month to chase creators", with: "Our team follows up for you" },
];
export function SellerCompare() {
  return <Compare rows={ROWS} note="You still pay for the samples you send, through TikTok as usual." />;
}

/* ---------------- What You'll See ---------------- */

const SEE: See[] = [
  { title: "Creators Who Want Your Product", line: "Requests from creators in your category.", screen: <RequestsScreen /> },
  { title: "Results per Creator", line: "Sales for every creator, from TikTok data.", screen: <ResultsScreen /> },
];
export function SellerSee() {
  return <SeeRail items={SEE} stories={SELLER_STORIES.slice(0, 2)} label="App screens and testimonials" />;
}
