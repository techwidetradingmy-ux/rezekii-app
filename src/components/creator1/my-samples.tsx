"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, Progress, Seg, ShareSheet, Sheet, Loading } from "@/components/ui";
import { SampleTag } from "@/components/creator1/brand";
import { CREATOR, MY_SAMPLES, product, type MySample, type SampleStatus } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import "@/app/creator1.css";
import { useKept } from "@/lib/keep";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";
import { rich } from "@/components/account/rich-text";

/** The steps she sees (owner, 29 Oct 2026): no separate "Posting" step; the first video posted is the last step. */
const STEPS = ["Applied", "Approved", "Shipped", "Received", "Posted"] as const;
const stepAt = (status: SampleStatus, videos: number) =>
  status === "Done" || (status === "Posting" && videos > 0) ? STEPS.length : status === "Posting" ? 4 : STEPS.indexOf(status as (typeof STEPS)[number]);
const TABS = ["In progress", "Done", "Not approved"] as const;
type Tab = (typeof TABS)[number];
/** Each tab's name on screen, in Title Case; translated where it's shown. */
const TAB_LABEL: Record<Tab, string> = { "In progress": tx("In Progress"), Done: tx("Done"), "Not approved": tx("Not Approved") };
/** How much more time she can ask for, in days. */
const MORE_DAYS = [2, 3, 5];
/** Why she needs more time (in English; translated where it's shown). */
const WHY = [tx("It arrived late"), tx("Problem with the product"), tx("I was unwell"), tx("Something else")];
/** A parcel's steps (in English; translated where they're shown). */
const PARCEL_STEPS = [tx("Packed"), tx("In transit"), tx("Delivered")];
/** Where each parcel is, from TikTok's logistics (samples) or the courier (PR kits). */
const DELIVERY: Record<string, { courier: string; track: string; line: string }> = {
  s1: { courier: "J&T Express", track: "JT6041 2290 118", line: "Delivered 26 Oct, 14:02" },
  s2: { courier: "Ninja Van", track: "NVMY 7714 0392", line: "Out for delivery, arrives today" },
  s5: { courier: "SPX Express", track: "SPXMY 0298 1144", line: "Delivered 2 Oct, 11:40" },
};
/** Parcels that don't go through TikTok, sent to the optional shipping address. */
const PARCELS = [{ id: "k1", name: "Lena Home PR kit", courier: "Pos Laju", track: "EP 4410 2871 MY", line: "In transit, arrives 31 Oct", step: 2 }];

const tabOf = (s: MySample): Tab => (s.status === "Done" ? "Done" : s.status === "Not approved" ? "Not approved" : "In progress");
/** Today in this preview is 28 Oct. */
const daysTo = (due?: string) => (due ? Math.max(0, Number(due.split(" ")[0]) + (due.includes("Nov") ? 31 : 0) - 28) : 0);

/** TikTok's sample steps as a bar; "Not approved" stops after Applied. */
function StepBar({ status, videos }: { status: SampleStatus; videos: number }) {
  const t = useT();
  if (status === "Not approved") {
    return (
      <ol className="cr1-steps" aria-label={t("Sample steps")}>
        <li className="done"><i><Icon name="check" size={11} width={3.4} /></i>{t("Applied")}</li>
        <li className="bad cur"><i><Icon name="x" size={11} width={3.4} /></i>{t("Not approved")}</li>
        {STEPS.slice(2).map((s) => <li key={s} className="off"><i />{t(s)}</li>)}
      </ol>
    );
  }
  const at = stepAt(status, videos);
  return (
    <ol className="cr1-steps" aria-label={t("Sample steps: {step}", { step: t(STEPS[Math.min(at, STEPS.length - 1)]) })}>
      {STEPS.map((s, i) => (
        <li key={s} className={i < at ? "done" : i === at ? "cur" : undefined} aria-current={i === at ? "step" : undefined}>
          <i>{i < at && <Icon name="check" size={11} width={3.4} />}</i>
          {t(s)}
        </li>
      ))}
    </ol>
  );
}

/** Samples & delivery (Account): TikTok's steps, parcel tracking, the 3-video progress, due dates, the early bonus, and what to do when one isn't approved. */
export function MySamples() {
  const t = useT();
  const router = useRouter();
  const { toast } = useDemo();
  const [list, setList] = useState<MySample[]>(MY_SAMPLES);
  const [tab, setTab] = useKept<Tab>("samples-tab", "In progress");
  const [submit, setSubmit] = useState<MySample | null>(null);
  const [link, setLink] = useState("");
  const [linkErr, setLinkErr] = useState(false);
  const [extend, setExtend] = useState<MySample | null>(null);
  const [days, setDays] = useState(3);
  const [why, setWhy] = useState<string | null>(null);
  const [extended, setExtended] = useState<string[]>([]);
  const [party, setParty] = useState<MySample | null>(null);
  const [share, setShare] = useState<MySample | null>(null);

  const shown = list.filter((s) => tabOf(s) === tab);
  const count = (t: Tab) => list.filter((s) => tabOf(s) === t).length;
  const tabLabels = TABS.map((x) => `${t(TAB_LABEL[x])} (${count(x)})`);

  function addVideo() {
    if (!submit) return;
    if (!/tiktok\.com\/.+/i.test(link.trim())) {
      setLinkErr(true);
      return;
    }
    const n = submit.videos + 1;
    const finished = n >= 3;
    const next: MySample = { ...submit, videos: n, status: finished ? "Done" : "Posting" };
    setList((l) => l.map((s) => (s.id === submit.id ? next : s)));
    setSubmit(null);
    setLink("");
    if (finished) setParty(next);
    else toast(n === 1 ? t("First video counted. You're on time.") : t("Video added. {n} more for the bonus.", { n: 3 - n }));
  }

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      {/* Tabs and the Marketplace icon share one row (owner, 29 Oct 2026: no empty rows). */}
      <div className="cr1-segwrap cr1-segbar">
        <Seg value={tabLabels[TABS.indexOf(tab)]} options={tabLabels} onChange={(v) => setTab(TABS[tabLabels.indexOf(v)])} />
        <Link href="/app/market" className="v2-iconbtn" aria-label={t("Open Marketplace")} title={t("Marketplace")}><Icon name="store" size={18} /></Link>
      </div>

      <div className="v2-stack" style={{ gap: 14 }}>
        {shown.map((s) => {
          const p = product(s.productId);
          const left = daysTo(s.due);
          return (
            <article key={`${s.id}-${s.status}`} className={`v2-card cr1-sample ${s.status === "Not approved" ? "bad" : ""}`}>
              <div className="cr1-sample-top">
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
                {/* No status badge: the steps below show it (owner, 29 Oct 2026). */}
                <span>
                  <strong><Link href={productHref(p.id)} className="pv-open">{p.name}</Link></strong>
                  <span className="cr1-shopline"><small>{p.shop}</small>{p.samples !== null && <SampleTag streak={p.samples} />}</span>
                </span>
              </div>

              <StepBar status={s.status} videos={s.videos} />

              {/* Tracking only while it's on the way (owner, 29 Oct 2026). */}
              {DELIVERY[s.id] && s.status === "Shipped" && (
                <p className="cr1-track">
                  <Icon name="box" size={16} />
                  <span><b>{DELIVERY[s.id].line}</b> · {DELIVERY[s.id].courier} · {DELIVERY[s.id].track}</span>
                </p>
              )}

              {(s.status === "Posting" || s.status === "Received" || s.status === "Done") && (
                <div className="cr1-vidrow">
                  <span className="cr1-vids" aria-hidden="true">
                    {[0, 1, 2].map((i) => <span key={i} className={i < s.videos ? "on" : undefined}><Icon name={i < s.videos ? "check" : "video"} size={16} width={i < s.videos ? 3 : 1.9} /></span>)}
                  </span>
                  <span className="cr1-vidtext">
                    <b>{s.videos === 1 ? t("{n} video posted", { n: s.videos }) : t("{n} videos posted", { n: s.videos })}</b>
                    {/* The due date is for the first video only; 3 videos unlock the extra reward (owner, 29 Oct 2026). */}
                    <small>
                      {s.status === "Done" ? t("Bonus unlocked.") : s.videos === 0
                        ? <em className={`cr1-due${left <= 2 ? " soon" : ""}`}><Icon name="cal" size={13} /> {left === 1 ? t("1st video due {date} · {n} day left", { date: s.due ?? "", n: left }) : t("1st video due {date} · {n} days left", { date: s.due ?? "", n: left })}</em>
                        : <em className="cr1-more"><Icon name="gift" size={13} /> {t("{n} more for the bonus", { n: 3 - s.videos })}</em>}
                      {extended.includes(s.id) && ` · ${t("more time requested")}`}
                    </small>
                  </span>
                </div>
              )}
              {s.status === "Posting" && <Progress value={s.videos} max={3} />}

              {s.status === "Posting" && s.receivedAt && (
                <p className="cr1-bonus"><Icon name="flame" size={16} /> {t("+30 credits for posting on arrival day.")}</p>
              )}
              {(s.status === "Approved" || s.status === "Shipped") && (
                <p className="cr1-bonus"><Icon name="flame" size={16} /> {t("Post within 1 day of arrival for the top bonus.")}</p>
              )}
              {s.status === "Approved" && <p className="v2-small" style={{ margin: 0 }}>{t("Ships in 3 to 5 days.")}</p>}
              {s.status === "Shipped" && <p className="v2-small" style={{ margin: 0 }}>{t("1st video due 7 days after delivery.")}</p>}

              {s.status === "Not approved" && (
                <div className="cr1-why-no">
                  <b>{t("Why")}</b>
                  <p>{s.reason}</p>
                  <b>{t("What to do")}</b>
                  <p>{t("Post daily for {n} more days to reach the 30-day streak this seller asks for. Samples that need a shorter streak are open to you now.", { n: 30 - CREATOR.streak })}</p>
                </div>
              )}

              <div className="v2-row">
                {s.status === "Posting" && (
                  <>
                    <button type="button" className="np-btn v2-btn-sm" onClick={() => { setSubmit(s); setLinkErr(false); }}><Icon name="link" size={16} /> {t("Submit Video Link")}</button>
                    {s.videos === 0 && (
                      <button type="button" className="btn-outline v2-btn-sm" disabled={extended.includes(s.id)} onClick={() => { setExtend(s); setWhy(null); }}>
                        {extended.includes(s.id) ? t("More time requested") : t("Ask for more time")}
                      </button>
                    )}
                  </>
                )}
                {s.status === "Shipped" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast(t("Opening the delivery in TikTok…"))}>{t("Track in TikTok")}</button>}
                {s.status === "Approved" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast(t("We'll tell you when the seller ships it"))}>{t("Remind Me When It Ships")}</button>}
                {s.status === "Done" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => setShare(s)}><Icon name="share" size={16} /> {t("Share")}</button>}
                {s.status === "Not approved" && (
                  <>
                    <Link href="/app/market" className="np-btn v2-btn-sm">{t("See Free Samples")}</Link>
                    <Link href="/app/rewards" className="btn-outline v2-btn-sm">{t("Daily Missions")}</Link>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {shown.length === 0 && (
          <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
            <b>{t("Nothing here")}</b>
            <span className="v2-muted">{tab === "Not approved" ? t("No rejected requests.") : t("Request a sample to start.")}</span>
            <Link href="/app/market" className="np-btn v2-btn-sm">{t("Browse Samples")}</Link>
          </div>
        )}
      </div>

      <section className="v2-stack" style={{ gap: 10 }}>
        <h3 className="v2-h2" style={{ fontSize: 17 }}>{t("Other Parcels")}</h3>
        {PARCELS.map((k) => (
          <article key={k.id} className="v2-card cr1-parcel">
            <span className="cr1-parcel-ico"><Icon name="box" size={20} /></span>
            <span>
              <strong>{k.name}</strong>
              <small>{k.courier} · {k.track}</small>
              <span className="cr1-parcel-steps" aria-label={t("Parcel: {status}", { status: k.line })}>
                {PARCEL_STEPS.map((x, i) => <i key={x} className={i < k.step ? "on" : undefined}>{t(x)}</i>)}
              </span>
            </span>
            <span className="badge badge-blue">{k.line}</span>
          </article>
        ))}
        <p className="v2-small" style={{ margin: 0 }}>{t("Sent to your shipping address in Profile.")}</p>
      </section>

      {submit && (
        <Sheet title={t("Submit Video Link")} onClose={() => setSubmit(null)}>
          <p className="v2-small" style={{ margin: 0 }}>
            {rich(t("Video {n} for {product}. Must have it in your yellow cart.", { n: submit.videos + 1 }), { product: <b>{product(submit.productId).name}</b> })}
          </p>
          <label className="v2-field">
            {t("TikTok video link")}
            <input
              className="np-input"
              inputMode="url"
              placeholder="https://www.tiktok.com/@aisyah.glow/video/…"
              value={link}
              onChange={(e) => { setLink(e.target.value); setLinkErr(false); }}
              aria-invalid={linkErr}
            />
            {linkErr ? <small className="cr1-err">{t("Paste a TikTok video link, e.g. https://www.tiktok.com/@you/video/123")}</small> : <small>{t("In TikTok: Share, then Copy link.")}</small>}
          </label>
          <button type="button" className="np-btn" onClick={addVideo}>{t("Add Video")}</button>
          <button type="button" className="v2-link" onClick={() => setLink("https://www.tiktok.com/@aisyah.glow/video/7431190024")}>{t("Use a Sample Link (Preview)")}</button>
        </Sheet>
      )}

      {extend && (
        <Sheet title={t("Ask for More Time")} onClose={() => setExtend(null)}>
          <p className="v2-small" style={{ margin: 0 }}>{t("Due {date} for {product}. Techwide decides. A first late sample gets a reminder, not a ban.", { date: extend.due ?? "", product: product(extend.productId).name })}</p>
          <div className="cr1-sec">
            <h3>{t("How Much More?")}</h3>
            <div className="v2-chips">
              {MORE_DAYS.map((d) => (
                <button key={d} type="button" className={`v2-chip ${days === d ? "on" : ""}`} aria-pressed={days === d} onClick={() => setDays(d)}>{t("{n} days", { n: d })}</button>
              ))}
            </div>
          </div>
          <div className="cr1-sec">
            <h3>{t("Why?")}</h3>
            <div className="v2-chips">
              {WHY.map((r) => (
                <button key={r} type="button" className={`v2-chip ${why === r ? "on" : ""}`} aria-pressed={why === r} onClick={() => setWhy(r)}>{t(r)}</button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="np-btn"
            disabled={!why}
            onClick={() => {
              setExtended((x) => [...x, extend.id]);
              setExtend(null);
              toast(t("Asked for {n} days more", { n: days }));
            }}
          >
            {t("Send request")}
          </button>
        </Sheet>
      )}

      {party && (
        <Celebrate
          tone="green"
          icon="check"
          title={t("Bonus unlocked")}
          line={t("3 videos for {product}", { product: product(party.productId).name })}
          cheer={t("Extra reward unlocked.")}
          onShare={() => { setShare(party); setParty(null); setTab("Done"); }}
          onClose={() => { setParty(null); setTab("Done"); }}
        />
      )}
      {share && (
        <ShareSheet onClose={() => setShare(null)} big="3 / 3" label={t("Sample delivered on time")} lines={[product(share.productId).name, t("Free sample through Rezekii")]} moment="sample" />
      )}
    </div>
  );
}

type LiveSample = { id: string; productId: string; name: string; shop: string; image: string | null; stage: number; videos: number; via: string; note: string | null };
/** TikTok's step as the screen's status: -1 not approved, 1 applied, 2 approved, 3 shipped, 4 received (video due), 5 done. */
const STATUS: Record<number, SampleStatus> = { [-1]: "Not approved", 1: "Applied", 2: "Approved", 3: "Shipped", 4: "Posting", 5: "Done" };

/**
 * Samples & Delivery on real data (owner, 31 Oct 2026): her free samples with TikTok's own steps, through Techwide's TAP campaigns
 * or straight from sellers. TikTok handles delivery and her videos; Rezekii shows where each one is.
 */
export function LiveSamples() {
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState<LiveSample[] | null | "error">(null);
  const [tab, setTab] = useKept<Tab>("samples-tab", "In progress");
  useEffect(() => {
    fetch("/api/v2/samples", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { samples: LiveSample[] }) => setRows(d.samples))
      .catch(() => setRows("error"));
  }, []);
  if (rows === null) return <Loading text={t("Loading your samples and their TikTok status…")} />;
  if (rows === "error") return <p className="v2-muted">{t("Couldn't load your samples. Please refresh.")}</p>;
  const list = rows.map((r) => ({ ...r, status: STATUS[r.stage] ?? "Applied" }));
  const tabOfLive = (s: { status: SampleStatus }) => (s.status === "Done" ? "Done" : s.status === "Not approved" ? "Not approved" : "In progress");
  const count = (t: Tab) => list.filter((s) => tabOfLive(s) === t).length;
  const labels = TABS.map((x) => `${t(TAB_LABEL[x])} (${count(x)})`);
  const shown = list.filter((s) => tabOfLive(s) === tab);
  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <div className="cr1-segwrap cr1-segbar">
        <Seg value={labels[TABS.indexOf(tab)]} options={labels} onChange={(v) => setTab(TABS[labels.indexOf(v)])} />
        <Link href="/app/market" className="v2-iconbtn" aria-label={t("Open Marketplace")} title={t("Marketplace")}><Icon name="store" size={18} /></Link>
      </div>
      <div className="v2-stack" style={{ gap: 14 }}>
        {shown.map((s) => (
          <article key={s.id} className={`v2-card cr1-sample ${s.status === "Not approved" ? "bad" : ""}`}>
            <div className="cr1-sample-top">
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
                <img className="pv-open" src={s.image} alt="" onClick={() => router.push(productHref(s.productId))} />
              ) : <span className="cr1-parcel-ico"><Icon name="box" size={20} /></span>}
              <span>
                <strong><Link href={productHref(s.productId)} className="pv-open">{s.name}</Link></strong>
                <span className="cr1-shopline"><small>{[s.shop, s.via && t(s.via)].filter(Boolean).join(" · ")}</small></span>
              </span>
            </div>
            <StepBar status={s.status} videos={s.videos} />
            {s.status === "Posting" && <p className="cr1-bonus"><Icon name="video" size={16} /> {t("Received. Post your video with the product in your yellow basket.")}</p>}
            {(s.status === "Posting" || s.status === "Done") && s.videos > 0 && <p className="v2-small" style={{ margin: 0 }}>{s.videos === 1 ? t("{n} video counted by TikTok", { n: s.videos }) : t("{n} videos counted by TikTok", { n: s.videos })}</p>}
            {s.note && <p className="v2-small" style={{ margin: 0 }}>{t(s.note)}</p>}
            {s.status === "Not approved" && (
              <div className="v2-row">
                <Link href="/app/market" className="np-btn v2-btn-sm">{t("See Free Samples")}</Link>
              </div>
            )}
          </article>
        ))}
        {shown.length === 0 && (
          <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
            <b>{t("Nothing here")}</b>
            <span className="v2-muted">{tab === "Not approved" ? t("No rejected requests.") : t("Request a free sample to start.")}</span>
            <Link href="/app/market" className="np-btn v2-btn-sm">{t("Browse Samples")}</Link>
          </div>
        )}
      </div>
      <p className="v2-small" style={{ margin: 0 }}>{t("TikTok ships your samples to the address in your TikTok account.")}</p>
    </div>
  );
}
