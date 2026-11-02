"use client";

import "@/app/admin.css";
import { LiveReferrals } from "@/components/admin/live-lists";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Bars, Sheet, Title } from "@/components/ui";
import { Av, Chips, Kv, Meta, Pill, Reasons, Sec, type Tone } from "@/components/admin/bits";
import { REFERRALS } from "@/lib/mock-admin";
import { REFERRAL_REWARD } from "@/lib/mock";

type Ref = (typeof REFERRALS)[number];
type Filter = "All" | "Held for review" | "Qualified" | "Not yet";
const tone = (s: string): Tone => (s.startsWith("Reward paid") || s.startsWith("Qualified") ? "ok" : s.startsWith("Held") ? "bad" : s.startsWith("Reversed") ? "mute" : "info");
const PAIRS = ["Creator → Creator", "Seller → Seller"];

/** Who invited whom, by role pair, with suspected abuse held for a person to check. */
export default function GrowthReferrals() {
  const { toast, live } = useDemo();
  const [list, setList] = useState<Ref[]>(REFERRALS);
  const [filter, setFilter] = useState<Filter>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<"Reverse" | "Correct" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [give, setGive] = useState({ inviter: String(REFERRAL_REWARD.inviter), friend: String(REFERRAL_REWARD.friend) });
  // Signed in (owner, 31 Oct 2026): real data.
  if (live) return <LiveReferrals />;

  const held = list.filter((r) => r.status.startsWith("Held"));
  const qualified = list.filter((r) => r.status.startsWith("Reward paid") || r.status.startsWith("Qualified"));
  const shown = list.filter((r) => filter === "All" || (filter === "Held for review" ? r.status.startsWith("Held") : filter === "Qualified" ? qualified.includes(r) : !qualified.includes(r) && !r.status.startsWith("Held")));
  const r = list.find((x) => x.id === open) ?? null;
  const set = (patch: Partial<Ref>) => r && setList((l) => l.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Referrals" sub="Creators invite creators, sellers invite sellers. Same reward for both." />

      <div className="v2-grid4 ad-stats">
        <div className="v2-stat"><small>Referrals in October</small><b>{list.length}</b><em>Via invite link</em></div>
        <div className="v2-stat"><small>Successful</small><b>{qualified.length}</b><em className="up">{Math.round((qualified.length / list.length) * 100)}% of sign-ups</em></div>
        <div className="v2-stat"><small>Credits paid</small><b>{qualified.filter((x) => x.status.startsWith("Reward paid")).reduce((a, x) => a + x.reward + REFERRAL_REWARD.friend, 0)}</b><em>Inviter {REFERRAL_REWARD.inviter} · friend {REFERRAL_REWARD.friend}</em></div>
        <div className="v2-stat"><small>Held for review</small><b style={{ color: held.length ? "var(--red)" : undefined }}>{held.length}</b><em>Suspected abuse</em></div>
      </div>

      {held.length > 0 && (
        <div className="v2-alert red">
          <Icon name="shield" size={20} />
          <span>{held.length} rewards held: {held.map((h) => `${h.from} → ${h.to} (${h.flag.toLowerCase()})`).join(" · ")}</span>
          <button type="button" onClick={() => setFilter("Held for review")}>Review</button>
        </div>
      )}

      <div className="v2-stack" style={{ gap: 16 }}>
        <section className="v2-card">
          <h2 className="v2-h2">Referral Rewards</h2>
          <span className="v2-small">Both sides paid on setup. Changes apply to new referrals only.</span>
          <form
            className="rf-admin"
            onSubmit={(e) => {
              e.preventDefault();
              toast(`Saved: inviter ${give.inviter}, friend ${give.friend} credits · logged`);
            }}
          >
            <label className="v2-field">Inviter gets<input className="np-input" type="number" min={0} step={10} value={give.inviter} onChange={(e) => setGive({ ...give, inviter: e.target.value })} /></label>
            <label className="v2-field">Friend gets<input className="np-input" type="number" min={0} step={10} value={give.friend} onChange={(e) => setGive({ ...give, friend: e.target.value })} /></label>
            <button type="submit" className="np-btn v2-btn-sm">Save</button>
          </form>
        </section>
        <section className="v2-card">
          <h2 className="v2-h2">Successful by Pair</h2>
          <Bars rows={PAIRS.map((p) => ({ label: p, value: qualified.filter((x) => x.pair === p).length, display: String(qualified.filter((x) => x.pair === p).length) }))} tone="blue" />
          <Meta range="October (Malaysia time)" source="Rezekii referrals" updated="Today 10:40" />
          <span className="v2-small">Successful = first scan (creator) or first product (seller) within 14 days.</span>
        </section>
        <section className="v2-card" style={{ padding: "8px 12px" }}>
          <div style={{ padding: "8px 8px 0" }}>
            <Chips<Filter> label="Filter referrals" value={filter} onChange={setFilter} options={[["All", list.length], ["Held for review", held.length], ["Qualified", qualified.length], ["Not yet", list.length - qualified.length - held.length]]} />
          </div>
          <div className="v2-tablewrap">
            <table className="v2-table ad-table">
              <thead><tr><th>Invited by</th><th>New Account</th><th>Pair</th><th>Status</th><th className="num">Reward</th><th>When</th></tr></thead>
              <tbody>
                {shown.map((x) => (
                  <tr key={x.id} className={`click ${x.status.startsWith("Held") ? "bad" : ""}`} onClick={() => { setOpen(x.id); setMode(null); setReason(null); setNote(""); }}>
                    <td><span className="ad-cell"><Av name={x.from} size={28} /><b>{x.from}</b></span></td>
                    <td><span className="ad-cell"><Av name={x.to} size={28} /><span><b>{x.to}</b>{x.flag && <small className="ad-down">{x.flag}</small>}</span></span></td>
                    <td className="ad-nowrap"><span className="ad-tag gray">{x.pair}</span></td>
                    <td className="ad-nowrap"><Pill tone={tone(x.status)}>{x.status}</Pill></td>
                    <td className="num">{x.reward ? `${x.reward} + ${REFERRAL_REWARD.friend}` : "—"}</td>
                    <td className="ad-nowrap">{x.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {r && (
        <Sheet title={`${r.from} → ${r.to}`} onClose={() => setOpen(null)}>
          <Pill tone={tone(r.status)}>{r.status}</Pill>
          <Kv rows={[["Referral", r.id], ["Role pair", r.pair], ["Signed up", r.when], ["Reward", r.reward ? `Inviter ${r.reward} · new account ${REFERRAL_REWARD.friend}` : "Not earned yet"], ["Referrer", "Locked. Staff can correct with a reason."]]} />
          {r.flag && (
            <>
              <Sec>Why it&apos;s held</Sec>
              <div className="ad-facts">
                <div className={`ad-fact ${r.flag === "Same device" ? "no" : ""}`}><small>Device</small><b><Icon name={r.flag === "Same device" ? "x" : "check"} size={15} />{r.flag === "Same device" ? "Same as inviter" : "Different"}</b></div>
                <div className={`ad-fact ${r.flag === "Same TikTok account" ? "no" : ""}`}><small>TikTok account</small><b><Icon name={r.flag === "Same TikTok account" ? "x" : "check"} size={15} />{r.flag === "Same TikTok account" ? "Same as inviter" : "Different"}</b></div>
                <div className="ad-fact"><small>Payment method</small><b><Icon name="check" size={15} />Different</b></div>
              </div>
            </>
          )}
          {!mode ? (
            <div className="v2-row">
              {r.status.startsWith("Held") && <button type="button" className="np-btn v2-btn-sm" onClick={() => { set({ status: "Reward paid", flag: "" }); toast("Reward released to both sides · logged"); setOpen(null); }}>Release Reward</button>}
              {r.reward > 0 && !r.status.startsWith("Reversed") && <button type="button" className="ad-btn-ghost danger" onClick={() => setMode("Reverse")}>Reverse Reward</button>}
              <button type="button" className="ad-btn-ghost" onClick={() => setMode("Correct")}>Correct Referrer</button>
            </div>
          ) : (
            <>
              <Sec>{mode === "Reverse" ? "Why reverse?" : "Why change?"}</Sec>
              <Reasons
                options={mode === "Reverse" ? ["Duplicate account", "Self-referral", "Fake sign-ups", "Other"] : ["Wrong link used by mistake", "Seller asked", "Other"]}
                value={reason}
                onChange={setReason}
                note={note}
                onNote={setNote}
                notePlaceholder={mode === "Correct" ? "Correct referrer and why" : "Note for audit log"}
              />
              <div className="v2-row">
                <button
                  type="button"
                  className={`np-btn v2-btn-sm ${mode === "Reverse" ? "ad-btn-danger" : ""}`}
                  disabled={!reason || (mode === "Correct" && !note.trim())}
                  onClick={() => {
                    if (mode === "Reverse") { set({ status: "Reversed", reward: 0 }); toast("Reward reversed · ledger updated · logged"); }
                    else toast("Referrer corrected · both notified · logged");
                    setOpen(null);
                  }}
                >
                  {mode === "Reverse" ? "Reverse now" : "Save correction"}
                </button>
                <button type="button" className="ad-btn-ghost" onClick={() => setMode(null)}>Cancel</button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
