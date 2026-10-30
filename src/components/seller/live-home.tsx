"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Stat } from "@/components/ui";
import { Source } from "@/components/seller/seller-ui";
import { rm } from "@/lib/mock";
import type { ShopItem } from "@/lib/mock-seller";
import { loadShop } from "@/lib/live";
import { loadProfile } from "@/lib/live-rewards";
import { loadNotes, noteWhen, type LiveNote } from "@/lib/live-notes";

type Totals = { gmv: number; orders: number; creators: number; videos: number; lives: number; live: number };
const TONE: Record<string, string> = { alert: "red", x: "red", video: "blue", gift: "amber", link: "amber" };

/** "Good morning/afternoon/evening, Name" and the shop line, from her real shop. */
export function LiveHello({ items, totals }: { items: ShopItem[] | null; totals: Totals | null }) {
  const { me } = useDemo();
  const [name, setName] = useState("");
  const [hi, setHi] = useState("Good morning");
  useEffect(() => {
    const h = new Date().getHours();
    setHi(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    loadProfile<{ contact?: string }>("seller").then((d) => setName(d.profile?.details.contact?.split(" ")[0] ?? "")).catch(() => {});
  }, []);
  const live = items?.filter((s) => s.stage === "Live").length ?? 0;
  return (
    <div className="sl-hello">
      <h1>{hi}{name || me?.name ? `, ${name || me?.name?.split(" ")[0]}` : ""}</h1>
      <p className="v2-muted">
        {me?.sellerShop ?? "Your shop"}
        {items && <> · <b>{live}</b> product{live === 1 ? "" : "s"} live in TAP</>}
        {totals && <> · <b>{totals.creators}</b> creator{totals.creators === 1 ? "" : "s"} promoting</>}
      </p>
    </div>
  );
}

/** One "do this first" card from where her products really are. */
export function LiveNext({ items }: { items: ShopItem[] | null }) {
  if (!items) return null;
  const live = items.filter((s) => s.stage === "Live").length;
  const waiting = items.filter((s) => s.stage === "Under review" || s.stage === "Submitted to TikTok");
  const broken = items.filter((s) => s.stage === "Not approved");
  const fresh = items.filter((s) => s.stage === "Not submitted").length;
  if (broken.length) {
    return (
      <section className="v2-next red">
        <small>Do this first</small>
        <h2>{broken.length} Product{broken.length === 1 ? "" : "s"} Not Approved</h2>
        <p>{broken[0].name}{broken[0].reason ? `: ${broken[0].reason}` : " needs a change before it can go back in."}</p>
        <div className="v2-row">
          <Link href={`/seller/app/product/${broken[0].id}`} className="v2-btn-white" style={{ color: "#b42318" }}>Fix and Resubmit</Link>
          <Link href="/seller/app/progress" className="v2-btn-ghostw">See progress</Link>
        </div>
      </section>
    );
  }
  if (waiting.length) {
    const withTikTok = waiting.filter((s) => s.stage === "Submitted to TikTok").length;
    return (
      <section className="v2-next">
        <small>On its way</small>
        <h2>{waiting.length} product{waiting.length === 1 ? "" : "s"} {withTikTok === waiting.length ? "waiting on TikTok" : "on the way"}</h2>
        <p>{withTikTok === waiting.length ? "Nothing to do. TikTok usually replies in 1–3 working days." : "Our team reviews them first, then sends them to TikTok."}</p>
        <div className="sl-mini-steps">
          <span className="on"><Icon name="check" size={14} width={2.6} /> Submitted</span>
          <span className={withTikTok ? "on" : undefined}>{withTikTok ? <Icon name="check" size={14} width={2.6} /> : null} Our review</span>
          <span>With TikTok</span>
          <span>Live</span>
        </div>
        <div className="v2-row">
          <Link href="/seller/app/progress" className="v2-btn-white">See progress</Link>
          {fresh > 0 && <Link href="/seller/app/submit" className="v2-btn-ghostw">Submit {fresh} more</Link>}
        </div>
      </section>
    );
  }
  if (!live) {
    return (
      <section className="v2-next">
        <small>Start here</small>
        <h2>Submit Your First Products</h2>
        <p>Pick products. AI suggests the commission; samples are set to 40.</p>
        <div className="v2-row">
          <Link href="/seller/app/submit" className="v2-btn-white">Submit products <Icon name="arrow" size={18} /></Link>
        </div>
      </section>
    );
  }
  return (
    <section className="v2-next">
      <small>All good</small>
      <h2>All {live} product{live === 1 ? " is" : "s are"} live</h2>
      <p>{fresh ? `${fresh} product${fresh === 1 ? "" : "s"} not in TAP yet.` : "Every product you sent is in TAP."}</p>
      <div className="v2-row">
        <Link href="/seller/app/results" className="v2-btn-white">See results</Link>
        {fresh > 0 && <Link href="/seller/app/submit" className="v2-btn-ghostw">Add more products</Link>}
      </div>
    </section>
  );
}

/** Her TAP results so far (lifetime, from TikTok), in the home card's place. */
export function LiveSummary({ totals, failed }: { totals: Totals | null; failed: boolean }) {
  return (
    <section className="v2-card">
      <div className="v2-card-h">
        <h2 className="v2-h2">Your TAP Results</h2>
        <Link href="/seller/app/results">See all</Link>
      </div>
      <Source text="Data from TikTok" when="today" />
      {!totals ? (
        <p className="v2-muted" style={{ margin: 0 }}>{failed ? "Couldn't reach TikTok Shop." : "Loading…"}</p>
      ) : (
        <div className="v2-grid4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
          <Stat label="Sales" value={<Count value={totals.gmv} format={(n) => rm(n, 0)} />} note="Since live" />
          <Stat label="Orders" value={<Count value={totals.orders} />} />
          <Stat label="Creators promoting" value={<Count value={totals.creators} />} />
          <Stat label="Videos" value={<Count value={totals.videos} />} />
        </div>
      )}
    </section>
  );
}

/** Her latest notifications as the home page's recent activity. */
export function LiveActivity() {
  const [notes, setNotes] = useState<LiveNote[] | null>(null);
  useEffect(() => { loadNotes("seller").then((d) => setNotes(d?.notes.slice(0, 5) ?? [])); }, []);
  return (
    <section className="v2-card">
      <div className="v2-card-h">
        <h2 className="v2-h2">Recent Activity</h2>
        <Link href="/seller/app/notifications">All</Link>
      </div>
      <div className="sl-acts">
        {notes === null && <p className="v2-muted" style={{ margin: 0 }}>Loading…</p>}
        {notes?.length === 0 && <p className="v2-muted" style={{ margin: 0 }}>Nothing yet. Product reviews, missions and posts show up here.</p>}
        {notes?.map((n) => {
          const inner = (
            <>
              <span className={`sl-ico ${TONE[n.icon] ?? ""}`}><Icon name={n.icon} size={18} /></span>
              <span><span>{n.title}</span><small>{n.line}</small></span>
              <time>{noteWhen(n.at)}</time>
            </>
          );
          return n.href && !n.href.startsWith("/api/") && !n.href.startsWith("http") ? <Link key={n.id} href={n.href} className="sl-act">{inner}</Link> : <a key={n.id} href={n.href ?? "/seller/app/notifications"} className="sl-act">{inner}</a>;
        })}
      </div>
    </section>
  );
}

/** Her shop's products and TAP results, loaded once for the home page. */
export function useSellerHome(on: boolean) {
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!on) return;
    loadShop().then((s) => setItems(s?.items ?? [])).catch(() => setItems([]));
    fetch("/api/v2/seller/results", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { linked?: boolean; totals?: Totals } | null) => (d?.totals ? setTotals(d.totals) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [on]);
  return { items, totals, failed };
}
