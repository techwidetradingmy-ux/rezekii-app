"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, Progress, Seg, ShareSheet, Sheet, Title } from "@/components/ui";
import { PoolTag } from "@/components/creator1/brand";
import { CREATOR, MY_SAMPLES, product, type MySample, type SampleStatus } from "@/lib/mock";
import type { Pool } from "@/lib/mock-creator1";
import "../../../creator1.css";

const STEPS: SampleStatus[] = ["Applied", "Approved", "Shipped", "Received", "Posting", "Done"];
const TABS = ["In progress", "Done", "Not approved"] as const;
type Tab = (typeof TABS)[number];
const tabOf = (s: MySample): Tab => (s.status === "Done" ? "Done" : s.status === "Not approved" ? "Not approved" : "In progress");
/** Today in this preview is 28 Oct. */
const daysTo = (due?: string) => (due ? Math.max(0, Number(due.split(" ")[0]) + (due.includes("Nov") ? 31 : 0) - 28) : 0);

/** TikTok's sample steps as a bar; "Not approved" stops after Applied. */
function StepBar({ status }: { status: SampleStatus }) {
  if (status === "Not approved") {
    return (
      <ol className="cr1-steps" aria-label="Sample steps">
        <li className="done"><i><Icon name="check" size={11} width={3.4} /></i>Applied</li>
        <li className="bad cur"><i><Icon name="x" size={11} width={3.4} /></i>Not approved</li>
        {STEPS.slice(2).map((s) => <li key={s} className="off"><i />{s}</li>)}
      </ol>
    );
  }
  const at = STEPS.indexOf(status);
  return (
    <ol className="cr1-steps" aria-label={`Sample steps: ${status}`}>
      {STEPS.map((s, i) => (
        <li key={s} className={i < at || status === "Done" ? "done" : i === at ? "cur" : undefined} aria-current={i === at ? "step" : undefined}>
          <i>{(i < at || status === "Done") && <Icon name="check" size={11} width={3.4} />}</i>
          {s}
        </li>
      ))}
    </ol>
  );
}

/** My samples: TikTok's steps, the 3-video progress, due dates, the early-posting bonus, and what to do when one isn't approved. */
export default function MySamples() {
  const { toast } = useDemo();
  const [list, setList] = useState<MySample[]>(MY_SAMPLES);
  const [tab, setTab] = useState<Tab>("In progress");
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
    else toast(`Video added: ${n} of 3. We check it against TikTok's data.`);
  }

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="My samples" sub="Status comes from TikTok · updated today 09:12">
        <Link href="/app/opportunities/samples" className="btn-outline v2-btn-sm"><Icon name="gift" size={17} /> Sample market</Link>
      </Title>

      <div className="cr1-segwrap">
        <Seg value={tabLabels[TABS.indexOf(tab)]} options={tabLabels} onChange={(v) => setTab(TABS[tabLabels.indexOf(v)])} />
      </div>

      <div className="v2-stack" style={{ gap: 14 }}>
        {shown.map((s) => {
          const p = product(s.productId);
          const left = daysTo(s.due);
          return (
            <article key={`${s.id}-${s.status}`} className={`v2-card cr1-sample ${s.status === "Not approved" ? "bad" : ""}`}>
              <div className="cr1-sample-top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.shop}</small>
                  {p.samples && <PoolTag pool={p.samples as Pool} />}
                </span>
                <span className={`badge ${s.status === "Done" ? "" : s.status === "Not approved" ? "badge-red" : s.status === "Posting" ? "badge-amber" : "badge-blue"}`}>{s.status}</span>
              </div>

              <StepBar status={s.status} />

              {(s.status === "Posting" || s.status === "Received" || s.status === "Done") && (
                <div className="cr1-vidrow">
                  <span className="cr1-vids" aria-hidden="true">
                    {[0, 1, 2].map((i) => <span key={i} className={i < s.videos ? "on" : undefined}><Icon name={i < s.videos ? "check" : "video"} size={16} width={i < s.videos ? 3 : 1.9} /></span>)}
                  </span>
                  <span className="cr1-vidtext">
                    <b>{s.videos} of 3 videos</b>
                    <small>
                      {s.status === "Done" ? "Delivered on time. This keeps your delivery record at 100%." : `Due ${s.due} · ${left} day${left === 1 ? "" : "s"} left`}
                      {extended.includes(s.id) && " · more time requested"}
                    </small>
                  </span>
                </div>
              )}
              {s.status === "Posting" && <Progress value={s.videos} max={3} />}

              {s.status === "Posting" && s.receivedAt && (
                <p className="cr1-bonus"><Icon name="flame" size={16} /> First video posted on {s.receivedAt}, the day it arrived: early bonus of +30 credits earned.</p>
              )}
              {(s.status === "Approved" || s.status === "Shipped") && (
                <p className="cr1-bonus"><Icon name="flame" size={16} /> Post your first video within 1 day of receiving it for the biggest bonus. Within 3 or 7 days still earns a smaller one.</p>
              )}
              {s.status === "Approved" && <p className="v2-small" style={{ margin: 0 }}>The seller ships it through TikTok, usually within 3 to 5 days. You&apos;ll get a notification when it&apos;s on the way.</p>}
              {s.status === "Shipped" && <p className="v2-small" style={{ margin: 0 }}>On the way. TikTok marks it received when the courier delivers it; then your 3 videos are due within 7 days.</p>}

              {s.status === "Not approved" && (
                <div className="cr1-why-no">
                  <b>Why</b>
                  <p>{s.reason}</p>
                  <b>What to do</b>
                  <p>Keep posting every day: {30 - CREATOR.streak} more days to Highly active, which opens Designated samples. Meanwhile, Open and Advanced samples are yours to request.</p>
                </div>
              )}

              <div className="v2-row">
                {s.status === "Posting" && (
                  <>
                    <button type="button" className="np-btn v2-btn-sm" onClick={() => { setSubmit(s); setLinkErr(false); }}><Icon name="link" size={16} /> Submit video link</button>
                    <button type="button" className="btn-outline v2-btn-sm" disabled={extended.includes(s.id)} onClick={() => { setExtend(s); setWhy(null); }}>
                      {extended.includes(s.id) ? "More time requested" : "Ask for more time"}
                    </button>
                  </>
                )}
                {s.status === "Shipped" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("Opening the delivery in TikTok…")}>Track in TikTok</button>}
                {s.status === "Approved" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("We'll tell you when the seller ships it")}>Remind me when it ships</button>}
                {s.status === "Done" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => setShare(s)}><Icon name="share" size={16} /> Share</button>}
                {s.status === "Not approved" && (
                  <>
                    <Link href="/app/opportunities/samples" className="np-btn v2-btn-sm">Open samples I can get</Link>
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
            <span className="v2-muted">{tab === "Not approved" ? "No turned-down requests. Nice." : "Request a sample from the market to get started."}</span>
            <Link href="/app/opportunities/samples" className="np-btn v2-btn-sm">Browse samples</Link>
          </div>
        )}
      </div>

      {submit && (
        <Sheet title="Submit video link" onClose={() => setSubmit(null)}>
          <p className="v2-small" style={{ margin: 0 }}>
            Video {submit.videos + 1} of 3 for <b>{product(submit.productId).name}</b>. It needs this product in your yellow cart to count.
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
            {linkErr ? <small className="cr1-err">Paste a TikTok video link, e.g. https://www.tiktok.com/@you/video/123</small> : <small>Tip: in TikTok, tap Share, then Copy link.</small>}
          </label>
          <button type="button" className="np-btn" onClick={addVideo}>Add video</button>
          <button type="button" className="v2-link" onClick={() => setLink("https://www.tiktok.com/@aisyah.glow/video/7431190024")}>Use a sample link (preview)</button>
        </Sheet>
      )}

      {extend && (
        <Sheet title="Ask for more time" onClose={() => setExtend(null)}>
          <p className="v2-small" style={{ margin: 0 }}>Due {extend.due} for {product(extend.productId).name}. The Techwide team decides; one late sample gets a reminder first, not a ban.</p>
          <div className="cr1-sec">
            <h3>How much more?</h3>
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
              toast(`Asked for ${days} more. We'll reply in Notifications.`);
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
          title="Sample done"
          line={`3 of 3 videos for ${product(party.productId).name}`}
          cheer="Delivered on time. Keep it up and Designated samples open once you're Highly active."
          onShare={() => { setShare(party); setParty(null); setTab("Done"); }}
          onClose={() => { setParty(null); setTab("Done"); }}
        />
      )}
      {share && (
        <ShareSheet onClose={() => setShare(null)} big="3 / 3" label="Sample delivered on time" lines={[product(share.productId).name, "Free sample through Rezekii"]} />
      )}
    </div>
  );
}
