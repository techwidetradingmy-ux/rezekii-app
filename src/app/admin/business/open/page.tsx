"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, Sheet, Title } from "@/components/ui";
import { Chips, Pill } from "@/components/admin/bits";
import { OPEN_CAMPAIGNS } from "@/lib/mock-admin";

type Camp = (typeof OPEN_CAMPAIGNS)[number];

const message = (c: Camp, shop: string) =>
  `Hi ${shop || "there"}, Techwide's "${c.name}" TAP campaign is open for registration until ${c.closes}. It starts ${c.starts}.\n\n` +
  `What you need: commission ${c.uplift} above your public rate, and ${c.samples} samples. Our creators find your products through their showcase scan and AI picks.\n\n` +
  `Register in the Rezekii seller app (Products > Submit products), or reply here and I'll help you pick products.`;

/** TAP campaigns open for registration now, to recommend to merchants. */
export default function OpenCampaigns() {
  const { toast } = useDemo();
  const cats = ["All", ...Array.from(new Set(OPEN_CAMPAIGNS.map((c) => c.category)))];
  const [cat, setCat] = useState("All");
  const [invite, setInvite] = useState<Camp | null>(null);
  const [shop, setShop] = useState("");
  const [text, setText] = useState("");
  const list = OPEN_CAMPAIGNS.filter((c) => cat === "All" || c.category === cat);

  const openInvite = (c: Camp) => {
    setInvite(c);
    setShop("");
    setText(message(c, ""));
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Open Campaigns" sub="Techwide TAP campaigns taking registrations right now. Recommend them to your merchants." />

      <Chips label="Category" value={cat} onChange={setCat} options={cats.map((c) => [c, c === "All" ? OPEN_CAMPAIGNS.length : OPEN_CAMPAIGNS.filter((x) => x.category === c).length] as [string, number])} />

      <div className="v2-grid2">
        {list.map((c) => {
          const left = c.spots - c.joined;
          const closingSoon = c.closes === "3 Nov";
          return (
            <section key={c.id} className="v2-card">
              <div className="v2-card-h">
                <span className="ad-tag gray">{c.id} · {c.category}</span>
                {closingSoon ? <Pill tone="warn">Closes {c.closes}</Pill> : <Pill tone="ok">Open until {c.closes}</Pill>}
              </div>
              <h2 className="v2-h2">{c.name}</h2>
              <div className="ad-facts" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                <div className="ad-fact"><small>Commission</small><b>{c.uplift} above public</b></div>
                <div className="ad-fact"><small>Samples</small><b>{c.samples}</b></div>
                <div className="ad-fact"><small>Starts</small><b>{c.starts}</b></div>
              </div>
              <div className="v2-stack" style={{ gap: 6 }}>
                <span className="v2-small"><b style={{ color: "var(--text)" }}>{c.joined}</b> of {c.spots} merchant spots taken · {left} left</span>
                <Progress value={c.joined} max={c.spots} />
              </div>
              <div className="v2-row">
                <button type="button" className="np-btn v2-btn-sm" onClick={() => openInvite(c)}><Icon name="doc" size={16} /> Copy invite message</button>
                <button type="button" className="ad-btn-ghost" onClick={() => toast("Campaign link copied")}><Icon name="link" size={15} /> Copy link</button>
              </div>
            </section>
          );
        })}
      </div>

      {invite && (
        <Sheet title="Invite message" onClose={() => setInvite(null)}>
          <span className="v2-small">{invite.name}. Edit it if you like, then paste it into WhatsApp or email.</span>
          <label className="v2-field">
            Merchant name
            <input className="np-input" value={shop} placeholder="e.g. Kraf Rotan" onChange={(e) => { setShop(e.target.value); setText(message(invite, e.target.value)); }} />
          </label>
          <textarea className="np-input" rows={9} value={text} onChange={(e) => setText(e.target.value)} />
          <button
            type="button"
            className="np-btn"
            onClick={() => {
              try { navigator.clipboard?.writeText(text); } catch {}
              toast("Invite message copied");
              setInvite(null);
            }}
          >
            <Icon name="doc" size={17} /> Copy message
          </button>
          <span className="v2-small" style={{ textAlign: "center" }}>No prices or sales promises in the message. Results depend on creators.</span>
        </Sheet>
      )}
    </div>
  );
}
