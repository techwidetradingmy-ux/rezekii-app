"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Chips, Pill } from "@/components/admin/bits";
import { rm } from "@/lib/mock";
import { NO_PHOTO } from "@/lib/live-perf";

type Wish = { handle: string; name: string; videos: number; lives: number; rights: number; months: number; note: string | null; at: string };
type Item = { id: string; name: string; shop: string; img: string | null; price: number; rate: number | null; category: string; creators: number; videos: number; lives: number; rights: number; week: number; first: string; wishes: Wish[]; declined: boolean; raise: number | null };
type Filter = "Open" | "Agreed" | "Seller said no";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });

/**
 * Wish List for admins on real data (owner, 31 Oct 2026): products creators want on Rezekii, most wanted first, with each
 * creator's commitment for the seller pitch. Log the seller's answer: no (it leaves the public list) or the extra rate agreed.
 */
export function LiveWishAdmin() {
  const { toast } = useDemo();
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Open");
  const [open, setOpen] = useState<Item | null>(null);
  const [raise, setRaise] = useState("1");
  const load = () =>
    fetch("/api/v2/admin/wishes", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { items: Item[] }) => { setItems(d.items); setOpen((o) => (o ? d.items.find((x) => x.id === o.id) ?? null : null)); })
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load the wish list. Please try again."));
  useEffect(() => { void load(); }, []);

  const group = (f: Filter) => (items ?? []).filter((w) => (f === "Seller said no" ? w.declined : f === "Agreed" ? !w.declined && w.raise !== null : !w.declined && w.raise === null));
  const answer = async (w: Item, body: { declined: boolean } | { raise: number }, msg: string) => {
    const r = await fetch("/api/v2/admin/wishes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: w.id, name: w.name, ...body }) }).catch(() => null);
    if (!r?.ok) return toast("Didn't save. Please try again.");
    toast(msg);
    void load();
  };
  const pitch = (w: Item) =>
    `${w.creators} creator${w.creators === 1 ? "" : "s"} on Rezekii want to promote ${w.name}. Together they commit ${w.videos} video${w.videos === 1 ? "" : "s"}${w.lives ? ` and ${w.lives} LIVE${w.lives === 1 ? "" : "s"}` : ""} a month${w.rights ? `, and ${w.rights} offer ad rights` : ""}. Would you join Techwide's TAP campaign so they can?`;
  const copy = async (w: Item) => {
    try { await navigator.clipboard.writeText(pitch(w)); toast("Seller pitch copied"); } catch { toast("Couldn't copy. Select the pitch text instead."); }
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Wish List" sub="Products creators want on Rezekii, with what they'll commit if it launches. Most wanted first." />
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips<Filter> label="Filter wish list" value={filter} onChange={setFilter} options={(["Open", "Agreed", "Seller said no"] as Filter[]).map((f) => [f, group(f).length])} />
          <section className="v2-card" style={{ padding: "8px 20px" }}>
            <div className="ad-list">
              {group(filter).map((w) => (
                <button key={w.id} type="button" className="ad-row click ad-rowbtn" onClick={() => { setOpen(w); setRaise(String(w.raise ?? 1)); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="ad-reqimg" src={w.img ?? NO_PHOTO} alt="" />
                  <span className="main"><b>{w.name}</b><small>{w.shop || "Shop unknown"}{w.category ? ` · ${w.category}` : ""} · {rm(w.price)}</small></span>
                  <span className="main" style={{ flex: "0 1 230px" }}>
                    <b className="ad-nowrap">{w.creators} creator{w.creators === 1 ? "" : "s"} · {w.videos} videos a month</b>
                    <small>{w.lives ? `${w.lives} LIVE a month · ` : ""}{w.week ? `+${w.week} this week · ` : ""}since {day(w.first)}</small>
                  </span>
                  {w.declined ? <Pill tone="bad">Seller said no</Pill> : w.raise !== null ? <Pill tone="ok">Agreed +{w.raise}%</Pill> : <Pill tone="info">Open</Pill>}
                  <Icon name="arrow" size={16} />
                </button>
              ))}
              {!group(filter).length && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
            </div>
          </section>
          <p className="v2-small" style={{ margin: 0 }}>A product leaves this list once it&apos;s on Rezekii; creators who wished for it are told in their notifications.</p>
        </>
      )}

      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)} wide>
          <p className="v2-small" style={{ margin: 0 }}>{open.shop || "Shop unknown"} · open plan {open.rate ?? "—"}% · {rm(open.price)}</p>
          <div className="ad-list">
            {open.wishes.map((x, i) => (
              <div key={i} className="ad-row">
                <span className="main">
                  <b>{x.handle || x.name}</b>
                  <small>{x.videos} videos{x.lives ? `, ${x.lives} LIVE` : ""} a month for {x.months} month{x.months === 1 ? "" : "s"}{x.rights ? ` · ${x.rights} days ad rights` : ""} · {day(x.at)}</small>
                  {x.note && <small>“{x.note}”</small>}
                </span>
              </div>
            ))}
          </div>
          <p className="v2-muted" style={{ margin: 0 }}>{pitch(open)}</p>
          <div className="pp-stack">
            <button type="button" className="btn-outline" onClick={() => void copy(open)}><Icon name="doc" size={16} /> Copy seller pitch</button>
            <span className="v2-row" style={{ gap: 8, alignItems: "center" }}>
              <label className="v2-field" style={{ flex: 1 }}>Extra rate agreed (%)<input type="number" className="np-input" min={0.5} max={30} step={0.5} value={raise} onChange={(e) => setRaise(e.target.value)} /></label>
              <button type="button" className="np-btn" onClick={() => void answer(open, { raise: Number(raise) }, `Logged +${raise}% agreed`)}>Seller agreed</button>
            </span>
            {open.declined
              ? <button type="button" className="btn-outline" onClick={() => void answer(open, { declined: false }, "Reopened")}>Reopen</button>
              : <button type="button" className="btn-outline" onClick={() => void answer(open, { declined: true }, "Logged. It leaves the public wish list.")}>Seller said no</button>}
          </div>
          <p className="v2-small" style={{ margin: 0 }}>The product joins Rezekii when the seller registers it in Techwide&apos;s TAP campaign.</p>
        </Sheet>
      )}
    </div>
  );
}
