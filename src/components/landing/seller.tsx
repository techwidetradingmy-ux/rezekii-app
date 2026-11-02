"use client";

import { Icon } from "@/components/icons";
import { PEOPLE, SAMPLE_DESTINATIONS, SELLER_RESULTS, product, rm } from "@/lib/mock";
import { WANTED } from "@/lib/mock-showcase";
import { useT } from "@/lib/i18n/client";
import { tx, type T } from "@/lib/i18n/lang";
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
 * In her language (owner, 3 Nov 2026): lists that hold words are built with her translator `t`; product names stay as they are.
 */

const POT = product("p08");
const WANT = WANTED[2];
const streak = (h: string) => PEOPLE.find((p) => p.handle === h)?.streak ?? 0;

/* ---------------- Hero ---------------- */

const heroNotes = (t: T): Note[] => [
  { title: t("12 creators want your product"), line: `${POT.name} · ${POT.category}` },
  { title: t("Sample delivered. 3 videos posted"), line: "@kak.ros.kitchen · Casserole pot" },
  { title: t("New order +{amount}", { amount: rm(POT.price * 2) }), line: t("{product} ×{n}, via {handle}", { product: "Casserole pot", n: 2, handle: "@kak.ros.kitchen" }) },
  { title: t("Weekly results ready"), line: t("Sales per creator, from TikTok") },
];

export function SellerHeroPhone() {
  const t = useT();
  const notes = heroNotes(t);
  return (
    <>
      <LockScreen notes={notes} label={t("Example: Rezekii notifications for a seller arriving on a phone's lock screen")} />
      <HeroAlerts notes={notes.slice(0, 2)} />
    </>
  );
}

/* ---------------- Mini app screens (A Week With Rezekii) ---------------- */

const SUBMIT = ["p08", "p21", "p24"].map(product);
function Chips() {
  const t = useT();
  return (
    <div className="lp-s-chips">
      <span>+2%</span>
      <span className="ai">+5% <small>{t("AI pick")}</small></span>
      <span>+8%</span>
    </div>
  );
}

function SubmitScreen() {
  const t = useT();
  return (
    <App title={t("Submit Products")}>
      <small className="lp-s-label">{t("From Seller Center")}</small>
      <ul className="lp-s-check">
        {SUBMIT.map((p, i) => (
          <li key={p.id} style={v({ i })}>
            <span className="lp-box"><Icon name="check" size={11} width={3.4} /></span>
            <Thumb src={p.img} size={34} />
            <span>{p.name}<small>{rm(p.price)}</small></span>
          </li>
        ))}
      </ul>
      <small className="lp-s-label">{t("Extra commission")}</small>
      <Chips />
      <Swap className="lp-s-btn press" at={3} from={t("Submit {n}", { n: SUBMIT.length })} to={<><Icon name="check" size={14} width={3} /> {t("Submitted")}</>} />
    </App>
  );
}

const REQ: [string, string][] = [["@kak.ros.kitchen", tx("Home & Kitchen")], ["@farah.home", tx("Home & Living")], ["@dapur.wani", tx("Home & Kitchen")], ["@siti.deco", tx("Home Decor")]];
function RequestsScreen() {
  const t = useT();
  return (
    <App title={t("Sample Requests")}>
      <div className="lp-s-prod">
        <Thumb src={POT.img} size={44} />
        <span>{POT.name}<small>{POT.shop}</small></span>
      </div>
      <p className="lp-s-hit"><Icon name="users" size={14} width={2.4} /> <Swap at={2.4} from={t("{n} creators want it", { n: 4 })} to={t("{n} creators want it", { n: 12 })} /></p>
      <ul className="lp-s-req">
        {REQ.map(([h, c], i) => (
          <li key={h} style={v({ i })}>
            <Av name={h} size={28} />
            <span>{h}<small>{t(c)}</small></span>
            <em>{t("Requested")}</em>
          </li>
        ))}
      </ul>
    </App>
  );
}

const review = (t: T) => [
  { h: "@kak.ros.kitchen", fact: t("Posts daily · {n}-day streak", { n: streak("@kak.ros.kitchen") }), ok: true },
  { h: "@mei.ling.deals", fact: t("Posts daily · {n}-day streak", { n: streak("@mei.ling.deals") }), ok: true },
  { h: "@zara.home", fact: t("3 days late on a sample"), ok: false },
];
function ApproveScreen() {
  const t = useT();
  return (
    <App title={t("Who Gets a Sample")}>
      <ul className="lp-s-review">
        {review(t).map((r, i) => (
          <li key={r.h} className={r.ok ? "" : "no"} style={v({ i })}>
            <Av name={r.h} size={28} />
            <span>{r.h}<small>{r.fact}</small></span>
            <Swap at={1 + i * 0.6} from={t("Checking")} to={<b>{r.ok ? t("Approved") : t("Not now")}</b>} />
          </li>
        ))}
      </ul>
      <p className="lp-s-rule"><Icon name="shield" size={14} width={2.2} /> {t("1 sample = at least 1 video")}</p>
    </App>
  );
}

const VIDS = [
  { src: "home-demo", h: "@kak.ros.kitchen" },
  { src: "review", h: "@farah.home" },
  { src: "pov-demo", h: "@dapur.wani", live: true },
];
function VideosScreen() {
  const t = useT();
  return (
    <App title={t("Videos & LIVEs")}>
      <div className="lp-s-vgrid">
        {VIDS.map((x, i) => (
          <span key={x.src} style={v({ i })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/ai-videos/${x.src}.jpg`} alt="" loading="lazy" decoding="async" />
            <em className={x.live ? "live" : ""}>{x.live ? "LIVE" : t("Posted")}</em>
            <small>{x.h}</small>
          </span>
        ))}
      </div>
      <p className="lp-s-hit"><Icon name="video" size={14} width={2.2} /> {t("2 videos posted · 1 LIVE now")}</p>
      <p className="lp-s-note"><Icon name="check" size={13} width={3} /> {t("Late? We remind them for you.")}</p>
    </App>
  );
}

const TOP = SELLER_RESULTS.topCreators;
const TOP_MAX = Math.max(...TOP.map((c) => c.gmv));
function ResultsScreen() {
  const t = useT();
  return (
    <App title={t("Results per Creator")}>
      <small className="lp-s-label">{t("{range} · from TikTok", { range: t(SELLER_RESULTS.range) })}</small>
      <ul className="lp-s-res">
        {TOP.map((c, i) => (
          <li key={c.handle} style={v({ i, w: `${(c.gmv / TOP_MAX) * 100}%` })}>
            <Av name={c.handle} size={26} />
            <span>
              <span className="lp-s-resh"><b>{c.handle}</b><small>{c.videos === 1 ? t("{n} video", { n: c.videos }) : t("{n} videos", { n: c.videos })}</small></span>
              <span className="lp-bar"><i /></span>
            </span>
            <b>{rm(c.gmv, 0)}</b>
          </li>
        ))}
      </ul>
    </App>
  );
}

const week = (t: T): DayStep[] => {
  const notes = heroNotes(t);
  return [
    { id: "submit", time: t("Mon"), title: t("Submit From Your Phone"), ai: true, problem: t("Setting up campaigns at a desk."), fix: t("Pick products and commission. Rezekii AI suggests an amount."), note: { title: t("Seller Center connected"), line: t("Pick products to submit") }, screen: <SubmitScreen /> },
    { id: "requests", time: t("Tue"), title: t("Creators Request Samples"), ai: true, problem: t("Hunting for creators who fit."), fix: t("Rezekii AI matches your products with creators in your niche."), note: notes[0], screen: <RequestsScreen /> },
    { id: "approve", time: t("Wed"), title: t("Samples Only to Creators Who Post"), problem: t("Samples go to people who never post."), fix: t("We check every request. 1 sample = at least 1 video."), note: { title: t("2 approved, 1 not now"), line: t("Checked by the Techwide team") }, screen: <ApproveScreen /> },
    { id: "videos", time: t("Thu"), title: t("Videos Go Live"), problem: t("Chasing creators for their videos."), fix: t("Creators post and go LIVE. We remind anyone late."), note: notes[1], screen: <VideosScreen /> },
    { id: "results", time: t("Fri"), title: t("Results per Creator"), problem: t("Not knowing who actually sells."), fix: t("Sales for every creator, from TikTok data."), note: notes[3], screen: <ResultsScreen /> },
  ];
};
export function SellerWeek() {
  const t = useT();
  return <Journey steps={week(t)} label={t("A week with Rezekii")} />;
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
  const t = useT();
  return (
    <div className="lp-w-stack" aria-hidden="true">
      <Thumb src={WANT.img} size={34} />
      <b>{t("{n} want this", { n: 34 })}</b>
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
  { src: "home-demo", label: tx("At Home") },
  { src: "review", label: tx("Review") },
  { src: "pov-demo", label: tx("POV") },
  { src: "try-on", label: tx("Try-On") },
];

/** The seller's bento. `dash` is the live sales dashboard. */
export function SellerBento({ dash }: { dash: React.ReactNode }) {
  const t = useT();
  const tiles: Tile[] = [
    { key: "dash", title: t("Live Sales"), icon: "chart", tint: "linear-gradient(135deg,#22dc95,#00a862)", size: "big", bare: true, tip: t("Your sales from creators, from TikTok data. This one is a sample shop."), body: dash },
    { key: "videos", title: t("Videos & LIVEs"), icon: "video", tint: "linear-gradient(135deg,#25f4ee,#0e7490)", size: "tall", tip: t("Creators post videos and go LIVE with your product. These are example videos."), body: <VideoTile clips={CLIPS.map((c) => ({ ...c, label: t(c.label) }))} /> },
    { key: "commission", title: t("AI Commission Pick"), ai: true, icon: "spark", tint: "linear-gradient(135deg,#b48cff,#6d28d9)", tip: t("Set how much extra commission you pay through TAP, at least +2%. Rezekii AI suggests an amount from how well each product sells."), body: <div className="lp-w-chips" aria-hidden="true"><Chips /></div> },
    { key: "went", title: t("Where Samples Went"), icon: "gift", tint: "linear-gradient(135deg,#7aa2ff,#1d4ed8)", size: "wide", tip: t("Every sample, who has it and how many videos they posted."), body: <WentTile /> },
    { key: "wanted", title: t("Wanted by Creators"), icon: "flame", tint: "linear-gradient(135deg,#ff7aa8,#e8005a)", tip: t("See how many creators ask for each of your products."), body: <WantedTile /> },
    { key: "post", title: t("Cross-Channel Posting"), icon: "send", tint: "linear-gradient(135deg,#ffb35c,#f08a00)", size: "wide", tip: t("Post your own shop videos to TikTok, Facebook, Instagram and Threads at once."), body: <PostTile /> },
  ];
  return <Bento tiles={tiles} label={t("Rezekii seller features")} />;
}

/* ---------------- Why Rezekii (USP banners) ---------------- */

const usps = (t: T): Usp[] => [
  {
    title: t("RM 0 a Month"), tint: "#00c073",
    line: t("No fee, no contract. Commission only when you sell."),
    demo: (
      <div className="lp-u-col">
        <div className="lp-u-cost">
          <span><small>{t("Hire staff")}</small><span className="lp-u-cbar red"><i /></span><b>RM 3,000+</b></span>
          <span><small>Rezekii</small><span className="lp-u-cbar"><i /></span><b>RM 0</b></span>
        </div>
        <span className="lp-u-chip">{t("Commission Only on Sales")}</span>
      </div>
    ),
  },
  {
    title: t("Creators Come to You"), tint: "#1d4ed8",
    line: t("Rezekii AI matches your products with creators in your niche."),
    demo: (
      <div className="lp-u-col center">
        <span className="lp-avs big">{["@kak.ros.kitchen", "@farah.home", "@dapur.wani", "@siti.deco", "@nurul.beauty"].map((h, i) => <span key={h} style={v({ i })}><Av name={h} size={38} /></span>)}</span>
        <span className="lp-u-chip">{t("{n} creators want this", { n: 34 })}</span>
      </div>
    ),
  },
  {
    title: t("Samples Only to Creators Who Post"), tint: "#f08a00",
    line: t("1 sample = at least 1 video by the due date."),
    demo: (
      <div className="lp-u-s2v">
        <span className="lp-u-boxi"><Icon name="gift" size={22} width={2.2} /></span>
        <span className="lp-u-arrow"><Icon name="arrow" size={18} width={2.4} /></span>
        <span className="lp-u-vid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ai-videos/home-demo.jpg" alt="" loading="lazy" />
          <em>{t("Posted")}</em>
        </span>
      </div>
    ),
  },
  {
    title: t("See Results per Creator"), tint: "#6d5efc",
    line: t("Sales for every creator, from TikTok data."),
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
  const t = useT();
  return <UspRail items={usps(t)} label={t("Why Rezekii")} />;
}

/* ---------------- Without vs With ---------------- */

const rows = (t: T): CompareRow[] => [
  { label: t("Finding creators"), without: t("Search profiles yourself"), with: t("Creators request your product") },
  { label: t("Samples"), without: t("Sent to anyone who asks"), with: t("Only creators who post") },
  { label: t("Cost"), without: t("Fees before any sale"), with: t("RM 0 a month, commission only on sales") },
  { label: t("Results"), without: t("Guess who sells"), with: t("Results per creator") },
  { label: t("Staff"), without: t("RM 3,000+ a month to chase creators"), with: t("Our team follows up for you") },
];
export function SellerCompare() {
  const t = useT();
  return <Compare rows={rows(t)} note={t("You still pay for the samples you send, through TikTok as usual.")} />;
}

/* ---------------- What You'll See ---------------- */

const see = (t: T): See[] => [
  { title: t("Creators Who Want Your Product"), line: t("Requests from creators in your category."), screen: <RequestsScreen /> },
  { title: t("Results per Creator"), line: t("Sales for every creator, from TikTok data."), screen: <ResultsScreen /> },
];
export function SellerSee() {
  const t = useT();
  return <SeeRail items={see(t)} stories={SELLER_STORIES.slice(0, 2)} label={t("App screens and testimonials")} />;
}
