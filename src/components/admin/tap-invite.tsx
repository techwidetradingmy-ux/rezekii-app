"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Flow, Sheet } from "@/components/ui";
import { Pill, Switch } from "@/components/admin/bits";
import { SELLERS } from "@/lib/mock-admin";
import { SHOP_ITEMS, TAP_INVITE, TAP_INVITES, type InviteStatus } from "@/lib/mock-seller";
import "@/app/publish.css";

const TONE: Record<InviteStatus, "ok" | "warn" | "mute"> = { Registered: "ok", Opened: "warn", Sent: "mute", Expired: "mute" };
const ENDS = ["31 Dec 2026", "31 Jan 2027", "30 Apr 2027"];

/**
 * TAP campaigns start two ways (owner, 28 Oct 2026): the seller registers products themselves, or Techwide sets a campaign up
 * and sends it to the seller to register. Both land in the same TAP pipeline and stay in sync with the seller's Progress.
 */
export function TapInvites() {
  const { toast } = useDemo();
  const [list, setList] = useState(TAP_INVITES);
  const [open, setOpen] = useState(false);

  return (
    <section className="v2-card" style={{ gap: 14 }}>
      <div className="v2-card-h">
        <h2 className="v2-h2">Invites to Sellers</h2>
        <button type="button" className="np-btn v2-btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> Invite a Seller</button>
      </div>
      <Flow
        label="Two ways a TAP campaign starts"
        steps={[
          { icon: "send", title: "Techwide invites" },
          { icon: "box", title: "Or seller submits" },
          { icon: "kanban", title: "TAP pipeline" },
          { icon: "refresh", title: "Stays in sync" },
        ]}
      />
      <div className="ad-list">
        {list.map((i) => (
          <div key={i.code} className="ad-row">
            <span className="main">
              <b>{i.shop} · {i.name}</b>
              <small>{i.code} · {i.products} products · public +{i.raise}% · sent {i.when} by {i.by}</small>
            </span>
            <Pill tone={TONE[i.status]}>{i.status === "Registered" ? "Registered · in pipeline" : i.status}</Pill>
            <span className="acts">
              {i.status === "Sent" || i.status === "Opened" ? (
                <button type="button" className="ad-btn-ghost" onClick={() => toast(`Reminder sent to ${i.shop} on WhatsApp`)}>Remind</button>
              ) : i.status === "Expired" ? (
                <button type="button" className="ad-btn-ghost" onClick={() => { setList((l) => l.map((x) => (x.code === i.code ? { ...x, status: "Sent", when: "28 Oct", by: "Aina" } : x))); toast(`Sent again to ${i.shop}`); }}>Send Again</button>
              ) : (
                <Link href="/admin/tap" className="ad-btn-ghost">See in Pipeline</Link>
              )}
            </span>
          </div>
        ))}
      </div>
      {open && <InviteSheet onClose={() => setOpen(false)} onSent={(shop, name, n, raise) => setList((l) => [{ code: TAP_INVITE.code, shop, name, products: n, raise, status: "Sent", when: "28 Oct", by: "Aina" }, ...l])} />}
    </section>
  );
}

/** Set up a campaign for a seller and send it: the seller gets a link to review and register. */
function InviteSheet({ onClose, onSent }: { onClose: () => void; onSent: (shop: string, name: string, products: number, raise: number) => void }) {
  const { toast } = useDemo();
  const [shop, setShop] = useState("Seri Living MY");
  const [name, setName] = useState(TAP_INVITE.name);
  const [picked, setPicked] = useState<string[]>(TAP_INVITE.products);
  const [raise, setRaise] = useState(TAP_INVITE.raise);
  const [samples, setSamples] = useState(TAP_INVITE.samples);
  const [end, setEnd] = useState(TAP_INVITE.end);
  const [extend, setExtend] = useState(true);
  const [note, setNote] = useState(TAP_INVITE.note);
  const [via, setVia] = useState<"WhatsApp" | "Email" | "Link only">("WhatsApp");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);

  // Only Seri Living's shop is connected in the preview, so its products can be suggested; others pick their own.
  const connected = shop === "Seri Living MY";
  const items = SHOP_ITEMS.filter((p) => p.stage === "Not submitted");
  const errors = [!name.trim() && "Add a campaign name.", raise < 2 && "Commission must be at least +2% above public."].filter(Boolean) as string[];

  if (sent) {
    return (
      <Sheet title="Invite Sent" onClose={onClose}>
        <div className="ad-sent">
          <span className="ad-sent-ico"><Icon name="check" size={28} width={3} /></span>
          <b>{shop} has the invite{via === "Link only" ? " link" : ` on ${via}`}</b>
          <small>rezekii.com/i/{TAP_INVITE.code} · expires {TAP_INVITE.expires}</small>
        </div>
        <p className="v2-small" style={{ margin: 0 }}>Once registered, products show as New in the TAP pipeline.</p>
        <Link href="/seller/app/invite" className="np-btn" target="_blank">Preview Seller View <Icon name="arrow" size={16} /></Link>
        <button type="button" className="btn-outline" style={{ height: 48 }} onClick={onClose}>Done</button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Invite a Seller" onClose={onClose} wide>
      <p className="v2-small" style={{ margin: 0 }}>They open the link and register. <i className="pb-req">*</i> required.</p>
      <label className="v2-field"><span>Seller <i className="pb-req">*</i></span>
        <select className="np-input" value={shop} onChange={(e) => { setShop(e.target.value); setPicked(e.target.value === "Seri Living MY" ? TAP_INVITE.products : []); }}>
          {SELLERS.filter((s) => s.status === "Active").map((s) => <option key={s.shop} value={s.shop}>{s.shop} · {s.state === "—" ? s.country : s.state}</option>)}
          <option value="New seller">New seller (sign-up link)</option>
        </select>
      </label>
      <label className="v2-field"><span>Campaign name <i className="pb-req">*</i></span><input className="np-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>

      <div className="v2-field">
        <span>Suggested products <span className="pb-opt">Optional</span></span>
        {connected ? (
          <div className="ad-pickgrid">
            {items.map((p) => (
              <label key={p.id} className={`ad-pick ${picked.includes(p.id) ? "on" : ""}`}>
                <input type="checkbox" checked={picked.includes(p.id)} onChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span><b>{p.name}</b><small>{p.publicRate === null ? "Public rate unknown" : `Public ${p.publicRate}% → ${p.publicRate + raise}%`}</small></span>
              </label>
            ))}
          </div>
        ) : (
          <small className="v2-small">{shop === "New seller" ? "They pick products after linking their shop." : "Shop not linked yet. Seller picks products."}</small>
        )}
      </div>

      <div className="v2-field"><span>Above public rate <i className="pb-req">*</i></span>
        <div className="v2-chips">{[2, 4, 6, 8].map((n) => <button key={n} type="button" className={`v2-chip ${raise === n ? "on" : ""}`} onClick={() => setRaise(n)}>+{n}%{n === 2 && <small>minimum</small>}</button>)}</div>
      </div>
      <div className="v2-field"><span>Samples per SKU <i className="pb-req">*</i></span>
        <div className="v2-chips">{[30, 40, 50].map((n) => <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}</button>)}</div>
      </div>
      <div className="v2-field"><span>Ends <i className="pb-req">*</i></span>
        <div className="v2-chips">{ENDS.map((d) => <button key={d} type="button" className={`v2-chip ${end === d ? "on" : ""}`} onClick={() => setEnd(d)}>{d}</button>)}</div>
      </div>
      <div className="np-switchrow"><span><b>Auto-extend</b><small>Extends to TikTok's max, 3 days before end.</small></span><Switch label="Auto-extend" on={extend} onChange={setExtend} /></div>
      <label className="v2-field"><span>Note to seller <span className="pb-opt">Optional</span></span><textarea className="np-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="v2-field">Send by
        <div className="v2-chips">{(["WhatsApp", "Email", "Link only"] as const).map((v) => <button key={v} type="button" className={`v2-chip ${via === v ? "on" : ""}`} onClick={() => setVia(v)}>{v}</button>)}</div>
      </div>
      {tried && errors.length > 0 && <ul className="pb-secerr" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <button type="button" className="np-btn" onClick={() => { setTried(true); if (errors.length) return; onSent(shop === "New seller" ? "New seller" : shop, name.trim(), picked.length, raise); setSent(true); toast(via === "Link only" ? "Invite link copied" : `Invite sent on ${via}`); }}>
        <Icon name="send" size={16} /> Send invite
      </button>
    </Sheet>
  );
}
