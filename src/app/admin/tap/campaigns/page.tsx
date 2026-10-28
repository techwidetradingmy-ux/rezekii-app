"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Chips, Pill, Switch } from "@/components/admin/bits";
import { TapInvites } from "@/components/admin/tap-invite";
import { CAMPAIGNS, LONGEST_END, type Campaign } from "@/lib/mock-admin";
import { rm } from "@/lib/mock";

type Filter = "All live" | "Ending in 14 days" | "Auto-extend on" | "Ended";
type Outcome = { total: number; ok: string[]; failed: [string, string][] };

/** Techwide TAP campaigns: invites to sellers, end dates, auto-extend, and one batch to extend everything ending soon. */
export default function TapCampaigns() {
  const { toast } = useDemo();
  const [list, setList] = useState<Campaign[]>(CAMPAIGNS);
  const [filter, setFilter] = useState<Filter>("All live");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Outcome | null>(null);

  const soon = (c: Campaign) => c.status === "Live" && c.days >= 0 && c.days <= 14 && c.end !== LONGEST_END;
  const ending = list.filter(soon);
  const shown = list.filter((c) =>
    filter === "All live" ? c.status === "Live" : filter === "Ending in 14 days" ? soon(c) : filter === "Auto-extend on" ? c.auto && c.status === "Live" : c.status === "Ended",
  );

  const extendAll = () => {
    setBusy(true);
    window.setTimeout(() => {
      const failed = ending.filter((c) => c.failExtend).map((c) => [`${c.shop} · ${c.name}`, c.failExtend!] as [string, string]);
      const okIds = ending.filter((c) => !c.failExtend).map((c) => c.id);
      setList((l) => l.map((c) => (okIds.includes(c.id) ? { ...c, end: LONGEST_END, days: 90 } : c)));
      setOut({ total: ending.length, ok: okIds, failed });
      setBusy(false);
      toast(`${okIds.length} extended to ${LONGEST_END}`);
    }, 1400);
  };

  const retry = () => {
    if (!out) return;
    setBusy(true);
    window.setTimeout(() => {
      const ids = list.filter((c) => c.failExtend && soon(c)).map((c) => c.id);
      setList((l) => l.map((c) => (ids.includes(c.id) ? { ...c, end: LONGEST_END, days: 90, failExtend: undefined } : c)));
      setOut({ ...out, ok: [...out.ok, ...ids], failed: [] });
      setBusy(false);
      toast("Extended after the commission change was approved");
    }, 1100);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="TAP campaigns" sub="Techwide's campaigns on TikTok. Don't let one end by accident.">
        <button type="button" className="np-btn v2-btn-sm" disabled={busy || ending.length === 0} onClick={extendAll}>
          {busy ? <span className="ad-spin"><Icon name="refresh" size={16} /></span> : <Icon name="cal" size={16} />}
          Extend all ending in 14 days ({ending.length})
        </button>
      </Title>

      <TapInvites />

      {ending.length > 0 && !out && (
        <div className="v2-alert">
          <Icon name="alert" size={20} />
          <span>{ending.length} campaigns end in the next 14 days. {ending.filter((c) => c.auto).length} have auto-extend on and will extend by themselves 3 days before they end.</span>
        </div>
      )}

      {out && (
        <section className={`v2-card ad-result ${out.failed.length ? "has-fail" : ""}`} aria-live="polite">
          <div className="v2-card-h">
            <h2 className="v2-h2">Extend: result</h2>
            <button type="button" className="v2-iconbtn" aria-label="Dismiss result" onClick={() => setOut(null)}><Icon name="x" size={16} /></button>
          </div>
          <div className="ad-sum">
            <span>Ending in 14 days {out.total}</span>
            <Icon name="arrow" size={16} />
            <span className="ok"><Icon name="check" size={14} /> {out.ok.length} extended to {LONGEST_END}</span>
            {out.failed.length > 0 && <span className="bad"><Icon name="x" size={14} /> {out.failed.length} failed</span>}
          </div>
          <p className="v2-small" style={{ margin: 0 }}>{LONGEST_END} is the longest end date TikTok allows today (90 days). Sellers get a note in their app.</p>
          {out.failed.map(([who, why]) => (
            <div key={who} className="v2-alert red" style={{ padding: "10px 14px" }}><span>{who} · {why}</span></div>
          ))}
          {out.failed.length > 0 && (
            <div className="v2-row">
              <button type="button" className="np-btn v2-btn-sm" disabled={busy} onClick={retry}><Icon name="refresh" size={16} /> Retry failed only</button>
            </div>
          )}
        </section>
      )}

      <Chips<Filter>
        label="Filter campaigns"
        value={filter}
        onChange={setFilter}
        options={[["All live", list.filter((c) => c.status === "Live").length], ["Ending in 14 days", ending.length], ["Auto-extend on", list.filter((c) => c.auto && c.status === "Live").length], ["Ended", list.filter((c) => c.status === "Ended").length]]}
      />

      <section className="v2-card" style={{ padding: "8px 20px" }}>
        <div className="ad-list">
          {shown.map((c) => (
            <div key={c.id} className="ad-row" style={soon(c) ? { boxShadow: "inset 4px 0 0 #f5a623", paddingLeft: 12, marginLeft: -12 } : undefined}>
              <span className="ad-thumbs">
                {c.imgs.slice(0, 3).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" />
                ))}
              </span>
              <span className="main">
                <b>{c.shop} · {c.name}</b>
                <small>{c.id} · {c.products} products · {rm(c.gmv30, 0)} GMV last 30 days</small>
              </span>
              <span className="main" style={{ flex: "0 1 170px" }}>
                <b className="ad-nowrap">Ends {c.end}</b>
                <small>{c.status === "Ended" ? "Ended" : `${c.days} days left`}</small>
              </span>
              {c.status === "Ended" ? <Pill>Ended</Pill> : soon(c) ? <Pill tone="warn">Ending soon</Pill> : <Pill tone="ok">Live</Pill>}
              {c.status === "Live" && (
                <span className="acts">
                  <small className="v2-small">Auto-extend</small>
                  <Switch
                    label={`Auto-extend ${c.name}`}
                    on={c.auto}
                    onChange={(v) => { setList((l) => l.map((x) => (x.id === c.id ? { ...x, auto: v } : x))); toast(v ? `Auto-extend on: extends to the longest allowed date 3 days before ${c.end}` : "Auto-extend off · logged"); }}
                  />
                </span>
              )}
              {c.status === "Ended" && (
                <button type="button" className="ad-btn-ghost" onClick={() => toast("New campaign drafted from this one · in TAP pipeline as New")}>Run again</button>
              )}
            </div>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing to show.</p>}
        </div>
      </section>
      <p className="v2-small" style={{ margin: 0 }}>Auto-extend moves the end date to the longest TikTok allows, 3 days before the campaign ends. Every change is in the audit log.</p>
    </div>
  );
}
