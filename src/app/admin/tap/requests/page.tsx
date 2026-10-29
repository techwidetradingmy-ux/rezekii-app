"use client";

import "@/app/admin.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Stepper, Title } from "@/components/ui";
import { Chips, Pill } from "@/components/admin/bits";
import { BOARD_MIN, READY, WANTED, commitText, isReady, onBoard, type Wanted } from "@/lib/mock-showcase";
import { adminProductHref, pitch } from "@/lib/product-pages";

type Filter = "All" | "Ready to pitch" | "Contacting" | "Closed";
type Reply = "Joined" | "Bonus" | "Declined";
const n = (v: number) => v.toLocaleString("en-MY");

/**
 * Wish List (owner, 29 Oct 2026): products creators want on Rezekii, with what each creator commits if it launches. We only
 * approach a seller once a product passes the "Ready to pitch" line, show them who wants it and what they'll give, and log
 * the seller's reply. Joining takes it off the public Most Wanted board and tells every creator who committed.
 */
export default function WishListAdmin() {
  const router = useRouter();
  const { toast } = useDemo();
  const [list, setList] = useState<Wanted[]>(WANTED);
  const [filter, setFilter] = useState<Filter>("All");
  const [line, setLine] = useState(READY);
  const [editLine, setEditLine] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState<Reply | null>(null);
  const [raise, setRaise] = useState(1);

  const ready = (w: Wanted) => w.status === "New" && isReady(w, line);
  const closed = (w: Wanted) => ["Joined", "Bonus", "Declined"].includes(w.status);
  const pick = (f: Filter) => list.filter((w) => f === "All" || (f === "Ready to pitch" ? ready(w) : f === "Contacting" ? w.status === "Contacting" : closed(w)));
  const shown = pick(filter).sort((a, b) => Number(closed(a)) - Number(closed(b)) || b.creators - a.creators);
  const sel = list.find((w) => w.id === openId) ?? null;

  const update = (id: string, patch: Partial<Wanted>, msg: string) => {
    setList((l) => l.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    toast(msg);
  };
  const copy = async (w: Wanted) => {
    try {
      await navigator.clipboard.writeText(pitch(w));
      toast("Seller pitch copied");
    } catch {
      toast("Couldn't copy. Select the pitch text instead.");
    }
  };
  const log = (w: Wanted) => {
    if (!reply) return;
    if (reply === "Joined") update(w.id, { status: "Joined", raise }, `Joined at +${raise}%. ${w.creators} creators told, off Most Wanted.`);
    if (reply === "Bonus") update(w.id, { status: "Bonus" }, `Bonus program logged. ${w.creators} creators told.`);
    if (reply === "Declined") update(w.id, { status: "Declined" }, `Declined. ${w.creators} creators told, off Most Wanted.`);
    setReply(null);
  };
  const status = (w: Wanted) =>
    w.status === "Joined" ? <Pill tone="ok">Joined +{w.raise ?? 1}%</Pill>
    : w.status === "Bonus" ? <Pill tone="ok">Bonus program</Pill>
    : w.status === "Declined" ? <Pill tone="bad">Declined</Pill>
    : w.status === "Contacting" ? <Pill tone="warn">Contacting</Pill>
    : ready(w) ? <Pill tone="info">Ready to pitch</Pill>
    : <Pill>Collecting</Pill>;

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Wish List" sub="Products creators want on Rezekii, with what they'll commit if it launches. Most wanted first.">
        <button type="button" className="ad-btn-ghost" onClick={() => setEditLine(true)}><Icon name="gear" size={16} /> Ready line</button>
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("Seller list exported (CSV)")}><Icon name="arrow" size={16} /> Export sellers</button>
      </Title>

      <Chips<Filter>
        label="Filter wish list"
        value={filter}
        onChange={setFilter}
        options={(["All", "Ready to pitch", "Contacting", "Closed"] as Filter[]).map((f) => [f, pick(f).length])}
      />

      <section className="v2-card" style={{ padding: "8px 20px" }}>
        <div className="ad-list">
          {shown.map((w) => (
            // The photo and name open the product; the rest of the row opens it in the wish list.
            <div key={w.id} className="ad-row click ad-rowbtn">
              <button type="button" className="pv-hit" aria-label={`Wish list details for ${w.name}`} onClick={() => { setOpenId(w.id); setReply(null); setRaise(1); }} />
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
              <img className="ad-reqimg pv-open" src={w.img} alt="" onClick={() => router.push(adminProductHref(w.id))} />
              <span className="main">
                <b><Link href={adminProductHref(w.id)} className="pv-open">{w.name}</Link></b>
                <small>{w.shop} · {w.category}</small>
              </span>
              <span className="main" style={{ flex: "0 1 230px" }}>
                <b className="ad-nowrap">{w.creators} creators · {n(w.videos)} videos a month</b>
                <small>{w.lives ? `${w.lives} LIVE a month · ` : ""}they sold {n(w.sold30)} in 30 days</small>
              </span>
              {status(w)}
              <Icon name="arrow" size={16} />
            </div>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
        </div>
      </section>
      <p className="v2-small" style={{ margin: 0 }}>
        Ready to pitch at {line.creators} creators or {line.videos} videos a month. Products show on the creators&apos; Most Wanted board from {BOARD_MIN} creators until they launch.
      </p>

      {editLine && (
        <Sheet title="Ready to Pitch" onClose={() => setEditLine(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>A product is ready to pitch when it reaches either number.</p>
          <div className="ad-wl-line"><span>Creators committed</span><Stepper label="Creators committed" value={line.creators} min={1} onChange={(v) => setLine((l) => ({ ...l, creators: v }))} /></div>
          <div className="ad-wl-line"><span>Videos a month</span><Stepper label="Videos a month" value={line.videos} min={1} max={500} onChange={(v) => setLine((l) => ({ ...l, videos: v }))} /></div>
          <button type="button" className="np-btn" onClick={() => { setEditLine(false); toast("Ready line saved"); }}>Save</button>
        </Sheet>
      )}

      {sel && (
        <Sheet title="Wish List Product" onClose={() => setOpenId(null)} wide>
          <div className="ad-wl-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sel.img} alt="" />
            <span>
              <b>{sel.name}</b>
              <small>{sel.shop} · {sel.rate === null ? "no open plan" : `open plan ${sel.rate}%`} · wanted since {sel.first}</small>
              {status(sel)}
              {/* Product (owner, 29 Oct 2026): the full product page; this sheet keeps the reply log so the list stays in step. */}
              <Link href={adminProductHref(sel.id)} className="v2-link">View Product <Icon name="arrow" size={14} /></Link>
            </span>
          </div>
          <div className="ad-wl-stats">
            <span><small>Creators</small><b>{sel.creators}</b></span>
            <span><small>Videos a month</small><b>{n(sel.videos)}</b></span>
            <span><small>LIVE a month</small><b>{sel.lives}</b></span>
            <span><small>Give ad rights</small><b>{sel.rights}</b></span>
            <span><small>Their sales, 30 days</small><b>{n(sel.sold30)}</b></span>
            <span><small>New this week</small><b>+{sel.week}</b></span>
          </div>
          <p className="v2-small" style={{ margin: 0 }}>{onBoard(sel) ? "On the creators' Most Wanted board." : sel.creators < BOARD_MIN && !closed(sel) ? `Not public yet: shows on Most Wanted at ${BOARD_MIN} creators.` : "Off the Most Wanted board."}</p>

          <div className="ad-wl-sec">
            <h3>Top Offers</h3>
            {sel.offers.map((o) => (
              <div key={o.handle} className="ad-wl-offer">
                <b>{o.handle}</b>
                <small>{o.sold ? `${n(o.sold)} sold in 30 days` : "New listing, no sales yet"} · {commitText(o.commit)}</small>
              </div>
            ))}
          </div>

          <div className="ad-wl-sec">
            <h3>Seller Pitch</h3>
            <p className="ad-wl-pitch">{pitch(sel)}</p>
          </div>

          {!closed(sel) && (
            <>
              <div className="v2-row">
                <button type="button" className="ad-btn-ghost" onClick={() => copy(sel)}><Icon name="doc" size={16} /> Copy seller pitch</button>
                {sel.status === "New" && <button type="button" className="ad-btn-ghost" onClick={() => update(sel.id, { status: "Contacting" }, `Marked contacting. ${sel.creators} creators told.`)}>Mark contacting</button>}
              </div>
              <div className="ad-wl-sec">
                <h3>Log Seller Reply</h3>
                <div className="v2-chips">
                  {(["Joined", "Bonus", "Declined"] as Reply[]).map((r) => (
                    <button key={r} type="button" className={`v2-chip ${reply === r ? "on" : ""}`} onClick={() => setReply(r)}>{r === "Bonus" ? "Bonus program" : r}</button>
                  ))}
                </div>
                {reply === "Joined" && <div className="ad-wl-line"><span>Raise for these creators</span><span className="ad-wl-raise">+<Stepper label="Raise in percent" value={raise} min={1} max={30} onChange={setRaise} />%</span></div>}
                {reply && <button type="button" className="np-btn" onClick={() => log(sel)}>Save reply</button>}
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
