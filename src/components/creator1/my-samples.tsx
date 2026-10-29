"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, Progress, Seg, ShareSheet, Sheet } from "@/components/ui";
import { SampleTag } from "@/components/creator1/brand";
import { CREATOR, MY_SAMPLES, product, type MySample, type SampleStatus } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import "@/app/creator1.css";
import { useKept } from "@/lib/keep";

/** The steps she sees (owner, 29 Oct 2026): no separate "Posting" step; the first video posted is the last step. */
const STEPS = ["Applied", "Approved", "Shipped", "Received", "Posted"] as const;
const stepAt = (status: SampleStatus, videos: number) =>
  status === "Done" || (status === "Posting" && videos > 0) ? STEPS.length : status === "Posting" ? 4 : STEPS.indexOf(status as (typeof STEPS)[number]);
const TABS = ["In progress", "Done", "Not approved"] as const;
type Tab = (typeof TABS)[number];
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
  if (status === "Not approved") {
    return (
      <ol className="cr1-steps" aria-label="Sample steps">
        <li className="done"><i><Icon name="check" size={11} width={3.4} /></i>Applied</li>
        <li className="bad cur"><i><Icon name="x" size={11} width={3.4} /></i>Not approved</li>
        {STEPS.slice(2).map((s) => <li key={s} className="off"><i />{s}</li>)}
      </ol>
    );
  }
  const at = stepAt(status, videos);
  return (
    <ol className="cr1-steps" aria-label={`Sample steps: ${STEPS[Math.min(at, STEPS.length - 1)]}`}>
      {STEPS.map((s, i) => (
        <li key={s} className={i < at ? "done" : i === at ? "cur" : undefined} aria-current={i === at ? "step" : undefined}>
          <i>{i < at && <Icon name="check" size={11} width={3.4} />}</i>
          {s}
        </li>
      ))}
    </ol>
  );
}

/** Samples & delivery (Account): TikTok's steps, parcel tracking, the 3-video progress, due dates, the early bonus, and what to do when one isn't approved. */
export function MySamples() {
  const router = useRouter();
  const { toast } = useDemo();
  const [list, setList] = useState<MySample[]>(MY_SAMPLES);
  const [tab, setTab] = useKept<Tab>("samples-tab", "In progress");
  const [submit, setSubmit] = useState<MySample | null>(null);
  const [link, setLink] = useState("");
  const [linkErr, setLinkErr] = useState(false);
  const [extend, setExtend] = useState<MySample | null>(null);
  const [days, setDays] = useState("3 days");
  const [why, setWhy] = useState<string | null>(null);
  const [extended, setExtended] = useState<string[]>([]);
  const [party, setParty] = useState<MySample | null>(null);
  const [share, setShare] = useState<MySample | null>(null);

  const shown = list.filter((s) => tabOf(s) === tab);
  const count = (t: Tab) => list.filter((s) => tabOf(s) === t).length;
  const tabLabels = TABS.map((t) => `${t} (${count(t)})`);

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
    else toast(n === 1 ? "First video counted. You're on time." : `Video added. ${3 - n} more for the bonus.`);
  }

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      {/* Tabs and the Marketplace icon share one row (owner, 29 Oct 2026: no empty rows). */}
      <div className="cr1-segwrap cr1-segbar">
        <Seg value={tabLabels[TABS.indexOf(tab)]} options={tabLabels} onChange={(v) => setTab(TABS[tabLabels.indexOf(v)])} />
        <Link href="/app/market" className="v2-iconbtn" aria-label="Open Marketplace" title="Marketplace"><Icon name="store" size={18} /></Link>
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
                    <b>{s.videos} video{s.videos === 1 ? "" : "s"} posted</b>
                    {/* The due date is for the first video only; 3 videos unlock the extra reward (owner, 29 Oct 2026). */}
                    <small>
                      {s.status === "Done" ? "Bonus unlocked." : s.videos === 0
                        ? <em className={`cr1-due${left <= 2 ? " soon" : ""}`}><Icon name="cal" size={13} /> 1st video due {s.due} · {left} day{left === 1 ? "" : "s"} left</em>
                        : <em className="cr1-more"><Icon name="gift" size={13} /> {3 - s.videos} more for the bonus</em>}
                      {extended.includes(s.id) && " · more time requested"}
                    </small>
                  </span>
                </div>
              )}
              {s.status === "Posting" && <Progress value={s.videos} max={3} />}

              {s.status === "Posting" && s.receivedAt && (
                <p className="cr1-bonus"><Icon name="flame" size={16} /> +30 credits for posting on arrival day.</p>
              )}
              {(s.status === "Approved" || s.status === "Shipped") && (
                <p className="cr1-bonus"><Icon name="flame" size={16} /> Post within 1 day of arrival for the top bonus.</p>
              )}
              {s.status === "Approved" && <p className="v2-small" style={{ margin: 0 }}>Ships in 3 to 5 days.</p>}
              {s.status === "Shipped" && <p className="v2-small" style={{ margin: 0 }}>1st video due 7 days after delivery.</p>}

              {s.status === "Not approved" && (
                <div className="cr1-why-no">
                  <b>Why</b>
                  <p>{s.reason}</p>
                  <b>What to do</b>
                  <p>Post daily for {30 - CREATOR.streak} more days to reach the 30-day streak this seller asks for. Samples that need a shorter streak are open to you now.</p>
                </div>
              )}

              <div className="v2-row">
                {s.status === "Posting" && (
                  <>
                    <button type="button" className="np-btn v2-btn-sm" onClick={() => { setSubmit(s); setLinkErr(false); }}><Icon name="link" size={16} /> Submit video link</button>
                    {s.videos === 0 && (
                      <button type="button" className="btn-outline v2-btn-sm" disabled={extended.includes(s.id)} onClick={() => { setExtend(s); setWhy(null); }}>
                        {extended.includes(s.id) ? "More time requested" : "Ask for more time"}
                      </button>
                    )}
                  </>
                )}
                {s.status === "Shipped" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("Opening the delivery in TikTok…")}>Track in TikTok</button>}
                {s.status === "Approved" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("We'll tell you when the seller ships it")}>Remind me when it ships</button>}
                {s.status === "Done" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => setShare(s)}><Icon name="share" size={16} /> Share</button>}
                {s.status === "Not approved" && (
                  <>
                    <Link href="/app/market" className="np-btn v2-btn-sm">See Free Samples</Link>
                    <Link href="/app/rewards" className="btn-outline v2-btn-sm">Daily missions</Link>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {shown.length === 0 && (
          <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
            <b>Nothing here</b>
            <span className="v2-muted">{tab === "Not approved" ? "No rejected requests." : "Request a sample to start."}</span>
            <Link href="/app/market" className="np-btn v2-btn-sm">Browse samples</Link>
          </div>
        )}
      </div>

      <section className="v2-stack" style={{ gap: 10 }}>
        <h3 className="v2-h2" style={{ fontSize: 17 }}>Other Parcels</h3>
        {PARCELS.map((k) => (
          <article key={k.id} className="v2-card cr1-parcel">
            <span className="cr1-parcel-ico"><Icon name="box" size={20} /></span>
            <span>
              <strong>{k.name}</strong>
              <small>{k.courier} · {k.track}</small>
              <span className="cr1-parcel-steps" aria-label={`Parcel: ${k.line}`}>
                {["Packed", "In transit", "Delivered"].map((t, i) => <i key={t} className={i < k.step ? "on" : undefined}>{t}</i>)}
              </span>
            </span>
            <span className="badge badge-blue">{k.line}</span>
          </article>
        ))}
        <p className="v2-small" style={{ margin: 0 }}>Sent to your shipping address in Profile.</p>
      </section>

      {submit && (
        <Sheet title="Submit Video Link" onClose={() => setSubmit(null)}>
          <p className="v2-small" style={{ margin: 0 }}>
            Video {submit.videos + 1} for <b>{product(submit.productId).name}</b>. Must have it in your yellow cart.
          </p>
          <label className="v2-field">
            TikTok video link
            <input
              className="np-input"
              inputMode="url"
              placeholder="https://www.tiktok.com/@aisyah.glow/video/…"
              value={link}
              onChange={(e) => { setLink(e.target.value); setLinkErr(false); }}
              aria-invalid={linkErr}
            />
            {linkErr ? <small className="cr1-err">Paste a TikTok video link, e.g. https://www.tiktok.com/@you/video/123</small> : <small>In TikTok: Share, then Copy link.</small>}
          </label>
          <button type="button" className="np-btn" onClick={addVideo}>Add video</button>
          <button type="button" className="v2-link" onClick={() => setLink("https://www.tiktok.com/@aisyah.glow/video/7431190024")}>Use a sample link (preview)</button>
        </Sheet>
      )}

      {extend && (
        <Sheet title="Ask for More Time" onClose={() => setExtend(null)}>
          <p className="v2-small" style={{ margin: 0 }}>Due {extend.due} for {product(extend.productId).name}. Techwide decides. A first late sample gets a reminder, not a ban.</p>
          <div className="cr1-sec">
            <h3>How Much More?</h3>
            <div className="v2-chips">
              {["2 days", "3 days", "5 days"].map((d) => (
                <button key={d} type="button" className={`v2-chip ${days === d ? "on" : ""}`} aria-pressed={days === d} onClick={() => setDays(d)}>{d}</button>
              ))}
            </div>
          </div>
          <div className="cr1-sec">
            <h3>Why?</h3>
            <div className="v2-chips">
              {["It arrived late", "Problem with the product", "I was unwell", "Something else"].map((r) => (
                <button key={r} type="button" className={`v2-chip ${why === r ? "on" : ""}`} aria-pressed={why === r} onClick={() => setWhy(r)}>{r}</button>
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
              toast(`Asked for ${days} more`);
            }}
          >
            Send request
          </button>
        </Sheet>
      )}

      {party && (
        <Celebrate
          tone="green"
          icon="check"
          title="Bonus unlocked"
          line={`3 videos for ${product(party.productId).name}`}
          cheer="Extra reward unlocked."
          onShare={() => { setShare(party); setParty(null); setTab("Done"); }}
          onClose={() => { setParty(null); setTab("Done"); }}
        />
      )}
      {share && (
        <ShareSheet onClose={() => setShare(null)} big="3 / 3" label="Sample delivered on time" lines={[product(share.productId).name, "Free sample through Rezekii"]} moment="sample" />
      )}
    </div>
  );
}
