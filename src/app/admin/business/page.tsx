"use client";

import "@/app/admin.css";
import { LiveWorkbench } from "@/components/admin/live-workbench";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Qr, Seg, Sheet, Title } from "@/components/ui";
import { Av, Pill } from "@/components/admin/bits";
import { BD, BD_STAFF, CREATOR_STAGES, MERCHANT_STAGES } from "@/lib/mock-admin";

const EVENTS = ["KL Expo", "Penang Expo", "General"] as const;
const SHORT: Record<string, string> = { "Lim Wei Jie": "Wei Jie", "Nadia Kamal": "Nadia" };

/** Business (BD) workbench: my QR and links, who I brought in and how far they got, follow-ups due. */
export default function BusinessHome() {
  const { toast, live } = useDemo();
  const [who, setWho] = useState<string>(BD_STAFF[0]);
  const [event, setEvent] = useState<(typeof EVENTS)[number]>("KL Expo");
  const [expo, setExpo] = useState(false);
  const [tab, setTab] = useState<"Merchants" | "Creators">("Merchants");
  const [done, setDone] = useState<string[]>([]);
  // Signed in (owner, 31 Oct 2026): your real links, invites and merchants.
  if (live) return <LiveWorkbench />;
  const tag = event === "General" ? "" : `?at=${event.toLowerCase().replace(/\s+/g, "-")}`;
  const short = SHORT[who] ?? who;
  const first = short.toLowerCase().replace(/\s+/g, "");
  const shopLink = `rezekii.com/s/${first}${tag}`;
  const creatorLink = `rezekii.com/c/${first}${tag}`;
  const copy = (s: string) => {
    try { navigator.clipboard?.writeText(`https://${s}`); } catch {}
    toast("Link copied");
  };
  const due = BD.followups.filter((f) => !done.includes(f.id));

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="My Merchants & Creators" sub="Everyone who joins via your QR or link is yours.">
        <label className="v2-small" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
          Workbench of
          <select className="np-input ad-select" value={who} onChange={(e) => setWho(e.target.value)}>
            {BD_STAFF.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
      </Title>

      <div className="v2-split">
        <section className="v2-card">
          <div className="ad-qrcard">
            <div className="ad-qrbox">
              <Qr />
              <b>{short.toUpperCase()} · {event.toUpperCase()}</b>
            </div>
            <div className="v2-stack" style={{ gap: 10, minWidth: 0, width: "100%" }}>
              <h2 className="v2-h2">Your QR and Links</h2>
              <span className="v2-small">Tag the event to see where people came from.</span>
              <Seg value={event} options={EVENTS} onChange={setEvent} />
              <div className="ad-linkrow"><Icon name="briefcase" size={16} /><code>{shopLink}</code><button type="button" className="ad-btn-ghost" onClick={() => copy(shopLink)}>Copy</button></div>
              <div className="ad-linkrow"><Icon name="user" size={16} /><code>{creatorLink}</code><button type="button" className="ad-btn-ghost" onClick={() => copy(creatorLink)}>Copy</button></div>
              <div className="v2-row">
                <button type="button" className="np-btn v2-btn-sm" onClick={() => setExpo(true)}><Icon name="qr" size={16} /> Show Full Screen</button>
                <button type="button" className="ad-btn-ghost" onClick={() => toast("Poster saved as PDF")}>Print Poster</button>
              </div>
            </div>
          </div>
        </section>

        <div className="v2-stack">
          <div className="v2-grid4 ad-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
            <div className="v2-stat"><small>Merchants this month</small><b>{BD.month.merchants}</b><em className="up">+3 from KL Expo</em></div>
            <div className="v2-stat"><small>Creators this month</small><b>{BD.month.creators}</b><em className="up">+8 this week</em></div>
            <div className="v2-stat"><small>Merchants live in TAP</small><b>{BD.month.live}</b><em>of {BD.merchants.length} brought in</em></div>
          </div>
          <section className="v2-card">
            <div className="v2-card-h">
              <h2 className="v2-h2">Follow-Ups Due</h2>
              <span className={`badge ${due.some((f) => f.late) ? "badge-red" : ""}`}>{due.length}</span>
            </div>
            <div className="ad-list">
              {due.map((f) => (
                <div key={f.id} className="ad-row">
                  <label className="v2-check" style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <input type="checkbox" onChange={() => { setDone((d) => [...d, f.id]); toast(`Done: ${f.who}`); }} />
                    <span>
                      <b>{f.who}</b>
                      <br />
                      <span className="v2-small">{f.what}</span>
                    </span>
                  </label>
                  <Pill tone={f.late ? "bad" : f.due === "Today" ? "warn" : "mute"}>{f.late ? `Late · ${f.due}` : f.due}</Pill>
                </div>
              ))}
              {due.length === 0 && <p className="v2-muted" style={{ margin: "8px 0 0" }}>All done.</p>}
            </div>
          </section>
        </div>
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Your Sign-Ups</h2>
          <Seg value={tab} options={["Merchants", "Creators"] as const} onChange={setTab} />
        </div>
        <div className="ad-list">
          {tab === "Merchants"
            ? BD.merchants.map((m) => (
                <div key={m.shop} className="ad-row">
                  <Av name={m.shop} />
                  <span className="main">
                    <b>{m.shop}</b>
                    <small>{m.via} · {m.when}{m.contact !== "—" ? ` · ${m.contact}` : ""}</small>
                    {m.next && <small style={{ color: "var(--body)" }}>Next: {m.next}</small>}
                  </span>
                  <span className="ad-stage">
                    <small>{MERCHANT_STAGES[m.stage - 1]} · step {m.stage} of {MERCHANT_STAGES.length}</small>
                    <span className="v2-steps">{MERCHANT_STAGES.map((s, i) => <i key={s} className={i < m.stage ? "on" : ""} />)}</span>
                  </span>
                  {m.stage === 5 ? <Link href="/admin/business/performance" className="ad-btn-ghost">Performance</Link> : <button type="button" className="ad-btn-ghost" onClick={() => toast(`Reminder sent to ${m.shop}`)}>Nudge</button>}
                </div>
              ))
            : BD.creators.map((c) => (
                <div key={c.handle} className="ad-row">
                  <Av name={c.handle} />
                  <span className="main">
                    <b>{c.handle}</b>
                    <small>Joined {c.when}{c.next ? ` · Next: ${c.next}` : ""}</small>
                  </span>
                  <span className="ad-stage">
                    <small>{CREATOR_STAGES[c.stage - 1]} · step {c.stage} of {CREATOR_STAGES.length}</small>
                    <span className="v2-steps">{CREATOR_STAGES.map((s, i) => <i key={s} className={i < c.stage ? "on" : ""} />)}</span>
                  </span>
                  <Link href="/admin/users/creators" className="ad-btn-ghost">Profile</Link>
                </div>
              ))}
        </div>
      </section>

      {expo && (
        <Sheet title="Scan to Join Rezekii" onClose={() => setExpo(false)}>
          <div className="v2-stack" style={{ alignItems: "center", textAlign: "center", gap: 14 }}>
            <div className="ad-qrbox ad-qrbig">
              <Qr />
              <b>{short.toUpperCase()} · {event.toUpperCase()}</b>
            </div>
            <b style={{ fontSize: 20 }}>Get creators selling your products</b>
            <span className="v2-muted">Scan with your camera. Takes 3 minutes.</span>
          </div>
          <button type="button" className="btn-outline" onClick={() => setExpo(false)}>Close</button>
        </Sheet>
      )}
    </div>
  );
}
