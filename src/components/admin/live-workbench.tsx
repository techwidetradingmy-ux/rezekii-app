"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Qr, Title } from "@/components/ui";
import { Av, Pill } from "@/components/admin/bits";
import { day } from "@/components/admin/live-lists";

type Data = {
  links: { creator: string; seller: string; code: string };
  people: { name: string; side: string; joined: string | null; step: string; counted: boolean; shop: string | null }[];
  merchants: { shop: string; live: number; open: number; declined: number; last: string; late: number }[];
  follow: { id: string; product: string; shop: string; since: string }[];
};

/**
 * Business › My Merchants & Creators on real data (owner, 31 Oct 2026): your own invite links and QR, who joined through them
 * and how far they got, the merchants whose TAP requests you look after, and follow-ups due.
 */
export function LiveWorkbench() {
  const { toast } = useDemo();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [qr, setQr] = useState<"Seller" | "Creator">("Seller");
  useEffect(() => {
    fetch("/api/v2/admin/workbench", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then(setD)
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load this. Please try again."));
  }, []);
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast("Link copied"); } catch { toast("Couldn't copy. Select the link instead."); }
  };
  const link = d ? (qr === "Seller" ? d.links.seller : d.links.creator) : "";
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="My Merchants & Creators" sub="Your invite links, who joined through them, and the merchants you look after." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="v2-grid2">
            <section className="v2-card" style={{ alignItems: "center", textAlign: "center" }}>
              <div className="v2-row" style={{ gap: 6 }}>
                {(["Seller", "Creator"] as const).map((k) => <button key={k} type="button" className={`v2-chip ${qr === k ? "on" : ""}`} onClick={() => setQr(k)}>{k} link</button>)}
              </div>
              <Qr value={link} />
              <b style={{ wordBreak: "break-all" }}>{link.replace(/^https?:\/\//, "")}</b>
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => void copy(link)}><Icon name="link" size={15} /> Copy Link</button>
              <small className="v2-small">Code {d.links.code}. Show the QR at an expo; sign-ups through it are yours.</small>
            </section>
            <section className="v2-card" style={{ padding: "6px 20px" }}>
              <div className="v2-card-h"><h2 className="v2-h2">Follow-Ups Due</h2><span className="badge">{d.follow.length}</span></div>
              <div className="ad-list">
                {d.follow.map((f) => (
                  <Link key={f.id} href="/admin/tap" className="ad-row ad-rowbtn click" style={{ textDecoration: "none" }}>
                    <span className="main"><b>{f.shop}</b><small>{f.product} · waiting since {day(f.since)}</small></span>
                    <Pill tone="bad">Overdue</Pill>
                  </Link>
                ))}
                {!d.follow.length && <p className="v2-muted" style={{ margin: 0 }}>Nothing overdue.</p>}
              </div>
            </section>
          </div>

          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Merchants You Look After</h2><span className="badge">{d.merchants.length}</span></div>
            <div className="ad-list">
              {d.merchants.map((m) => (
                <div key={m.shop} className="ad-row">
                  <Av name={m.shop} />
                  <span className="main"><b>{m.shop}</b><small>{m.live} live · {m.open} on the way{m.declined ? ` · ${m.declined} not approved` : ""} · last change {day(m.last)}</small></span>
                  {m.late ? <Pill tone="bad">{m.late} overdue</Pill> : <Pill tone="ok">Up to date</Pill>}
                </div>
              ))}
              {!d.merchants.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No TAP requests are assigned to you yet.</p>}
            </div>
          </section>

          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Joined Through Your Links</h2><span className="badge">{d.people.length}</span></div>
            <div className="ad-list">
              {d.people.map((p, i) => (
                <div key={i} className="ad-row">
                  <Av name={p.name} />
                  <span className="main"><b>{p.name}{p.shop ? ` · ${p.shop}` : ""}</b><small>{p.side === "seller" ? "Seller" : "Creator"} · joined {day(p.joined)} · {p.step}</small></span>
                  {p.counted ? <Pill tone="ok">Counted</Pill> : <Pill tone="info">{p.step}</Pill>}
                </div>
              ))}
              {!d.people.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No one has joined through your links yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
