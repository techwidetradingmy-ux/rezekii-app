"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title, Loading } from "@/components/ui";
import { Av, Pill, Search } from "@/components/admin/bits";
import { day, useList } from "@/components/admin/live-lists";

type Seller = { id: string; name: string; code: string | null; region: string | null; connected: string; owner: string | null; contact: string | null; phone: string | null; live: number; open: number; declined: number };
/** Users › Sellers on real data (owner, 31 Oct 2026): every Seller Center shop connected, and its products in TAP. */
export function LiveSellers() {
  const [items, err] = useList<Seller>("sellers");
  const [q, setQ] = useState("");
  const shown = (items ?? []).filter((s) => !q || `${s.name} ${s.code ?? ""} ${s.contact ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Sellers" sub={items ? `${items.length} shop${items.length === 1 ? "" : "s"} connected · ${items.reduce((t, s) => t + s.live, 0)} products live in TAP` : "Seller Center shops connected to Rezekii"} />
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="ad-bar"><Search value={q} onChange={setQ} placeholder="Search shop, code or contact" /></div>
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>Shop</th><th>Contact</th><th>Live in TAP</th><th>On the Way</th><th>Not Approved</th><th>Connected</th></tr></thead>
                <tbody>
                  {shown.map((s) => (
                    <tr key={s.id}>
                      <td className="ad-nowrap"><span className="ad-cell"><Av name={s.name} size={30} /><span><b>{s.name}</b><small>{[s.code, s.region].filter(Boolean).join(" · ")}</small></span></span></td>
                      <td style={{ minWidth: 150 }}>{s.contact ?? s.owner ?? "—"}{s.phone && <small className="v2-small" style={{ display: "block" }}>{s.phone}</small>}</td>
                      <td className="num">{s.live}</td>
                      <td className="num">{s.open}</td>
                      <td className="num">{s.declined}</td>
                      <td className="ad-nowrap">{day(s.connected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>No shops match.</p>}
          </section>
        </>
      )}
    </div>
  );
}

type Camp = { id: string; name: string; status: "draft" | "upcoming" | "live" | "ended"; hidden?: boolean; start: number | null; end: number | null; products: number; creators: number; upto: number };
const MYT = 8 * 3600;
const longDay = (unix: number | null) => (unix ? new Date((unix + MYT) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const message = (c: Camp, shop: string) =>
  `Hi ${shop || "there"}, Techwide's "${c.name}" TAP campaign is open on TikTok Shop until ${longDay(c.end)}.\n\n` +
  `Our creators find your products through Rezekii's showcase scan and AI Picks. You pick the products and commission; a free sample helps creators say yes.\n\n` +
  `Submit products in the Rezekii seller app (Products > Submit Products), or reply here and I'll help you pick.`;

/** Business › Open Campaigns on real data: Techwide's live campaigns, to recommend to merchants. */
export function LiveOpenCampaigns() {
  const { toast } = useDemo();
  const [list, setList] = useState<Camp[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [invite, setInvite] = useState<Camp | null>(null);
  const [shop, setShop] = useState("");
  const [text, setText] = useState("");
  useEffect(() => {
    fetch("/api/admin/tap/campaigns", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { campaigns: Camp[] }) => setList(d.campaigns.filter((c) => (c.status === "live" || c.status === "upcoming") && !c.hidden)))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "TikTok Shop didn't answer. Please try again."));
  }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast("Message copied"); } catch { toast("Couldn't copy. Select the text instead."); }
  };
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Open Campaigns" sub="Techwide's TAP campaigns open now. Recommend them to merchants." />
      {!list ? (err ? <p className="v2-muted">{err}</p> : <Loading text="Loading Techwide's campaigns from TikTok…" />) : (
        <section className="v2-card" style={{ padding: "6px 20px" }}>
          <div className="ad-list">
            {[...list].sort((a, b) => b.products - a.products).map((c) => (
              <div key={c.id} className="ad-row">
                <span className="main"><b>{c.name}</b><small>{c.products} products · {c.creators} creators{c.upto ? ` · up to ${c.upto / 100}% total` : ""} · open until {longDay(c.end)}</small></span>
                {c.status === "upcoming" ? <Pill tone="warn">Starts {longDay(c.start)}</Pill> : <Pill tone="ok">Open</Pill>}
                <button type="button" className="ad-btn-ghost" onClick={() => { setInvite(c); setShop(""); setText(message(c, "")); }}><Icon name="send" size={14} /> Invite a Merchant</button>
              </div>
            ))}
            {!list.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No campaigns are open right now.</p>}
          </div>
        </section>
      )}
      {invite && (
        <Sheet title={`Invite to ${invite.name}`} onClose={() => setInvite(null)}>
          <label className="v2-field">Merchant name<input className="np-input" value={shop} onChange={(e) => { setShop(e.target.value); setText(message(invite, e.target.value)); }} /></label>
          <label className="v2-field">Message<textarea className="np-input" rows={8} value={text} onChange={(e) => setText(e.target.value)} /></label>
          <button type="button" className="np-btn" onClick={() => void copy()}>Copy Message</button>
        </Sheet>
      )}
    </div>
  );
}
