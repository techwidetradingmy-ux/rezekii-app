"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Chips, Reasons } from "@/components/admin/bits";
import { REVIEW_CREATORS, REVIEW_SELLERS } from "@/lib/mock-admin";

type Tab = "Creators" | "Sellers";
type Target = { kind: Tab; id: string; label: string };
const REASONS: Record<Tab, string[]> = {
  Creators: ["Not a real creator account", "Duplicate account", "TikTok Shop not in Malaysia", "Other"],
  Sellers: ["Business registration missing", "Shop not connected", "Products not allowed", "Other"],
};

/** Review queue: creators who linked TikTok Shop and sellers who signed up, waiting for approval. */
export default function UsersReview() {
  const { toast } = useDemo();
  const [tab, setTab] = useState<Tab>("Creators");
  const [handled, setHandled] = useState<Record<string, "Approved" | "Rejected">>({});
  const [rejecting, setRejecting] = useState<Target | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const creators = REVIEW_CREATORS.filter((c) => !handled[c.handle]);
  const sellers = REVIEW_SELLERS.filter((s) => !handled[s.shop]);
  const done = Object.entries(handled);

  const approve = (id: string, kind: Tab) => {
    setHandled((h) => ({ ...h, [id]: "Approved" }));
    toast(kind === "Creators" ? `${id} approved · can request samples` : `${id} approved · can submit products`);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Review" sub="New accounts waiting for approval. Emailed either way." />

      <Chips<Tab> label="Account type" value={tab} onChange={setTab} options={[["Creators", creators.length], ["Sellers", sellers.length]]} />

      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {tab === "Creators" &&
            creators.map((c) => (
              <div key={c.handle} className="ad-row">
                <Av name={c.handle} size={40} />
                <span className="main">
                  <b>{c.handle} · {c.name}</b>
                  <small>{c.state} · TikTok Lv.{c.tt} · {c.followers.toLocaleString("en-MY")} followers · TikTok Shop linked {c.linked}</small>
                  <small>Came from: {c.via}</small>
                </span>
                {c.flag && <span className="ad-tag amber"><Icon name="alert" size={13} /> {c.flag}</span>}
                <span className="acts">
                  <button type="button" className="ad-btn-ghost danger" onClick={() => { setRejecting({ kind: "Creators", id: c.handle, label: c.handle }); setReason(null); setNote(""); }}>Reject</button>
                  <button type="button" className="np-btn v2-btn-sm" onClick={() => approve(c.handle, "Creators")}><Icon name="check" size={16} /> Approve</button>
                </span>
              </div>
            ))}
          {tab === "Sellers" &&
            sellers.map((s) => (
              <div key={s.shop} className="ad-row">
                <Av name={s.shop} size={40} />
                <span className="main">
                  <b>{s.shop}</b>
                  <small>{s.country}{s.state !== "—" ? ` · ${s.state}` : ""} · {s.type} · {s.products} products</small>
                  <small>Came from: {s.via}</small>
                </span>
                {s.flag && <span className="ad-tag amber"><Icon name="alert" size={13} /> {s.flag}</span>}
                <span className="acts">
                  <button type="button" className="ad-btn-ghost danger" onClick={() => { setRejecting({ kind: "Sellers", id: s.shop, label: s.shop }); setReason(null); setNote(""); }}>Reject</button>
                  <button type="button" className="np-btn v2-btn-sm" onClick={() => approve(s.shop, "Sellers")}><Icon name="check" size={16} /> Approve</button>
                </span>
              </div>
            ))}
          {((tab === "Creators" && creators.length === 0) || (tab === "Sellers" && sellers.length === 0)) && (
            <p className="v2-muted" style={{ padding: "16px 0", margin: 0 }}>All reviewed.</p>
          )}
        </div>
      </section>

      {done.length > 0 && (
        <section className="v2-card flat">
          <b>Handled just now</b>
          <div className="v2-chips">
            {done.map(([id, r]) => (
              <span key={id} className={`ad-pill ${r === "Approved" ? "ok" : "bad"}`}>{id} · {r}</span>
            ))}
          </div>
          <span className="v2-small">Logged with your name.</span>
        </section>
      )}

      {rejecting && (
        <Sheet title={`Reject ${rejecting.label}`} onClose={() => setRejecting(null)}>
          <p className="v2-muted" style={{ margin: 0 }}>They see this reason by email.</p>
          <Reasons options={REASONS[rejecting.kind]} value={reason} onChange={setReason} note={note} onNote={setNote} notePlaceholder="How to get approved" />
          <button
            type="button"
            className="np-btn ad-btn-danger"
            disabled={!reason || (reason === "Other" && !note.trim())}
            onClick={() => {
              setHandled((h) => ({ ...h, [rejecting.id]: "Rejected" }));
              toast(`${rejecting.label} rejected · reason sent · logged`);
              setRejecting(null);
            }}
          >
            Reject
          </button>
        </Sheet>
      )}
    </div>
  );
}
