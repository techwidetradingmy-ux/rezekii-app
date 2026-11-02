"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Stat } from "@/components/ui";
import { Rich, Source } from "@/components/seller/seller-ui";
import { useT } from "@/lib/i18n/client";
import { rm } from "@/lib/mock";
import type { ShopItem } from "@/lib/mock-seller";
import { loadShop } from "@/lib/live";
import { loadProfile } from "@/lib/live-rewards";
import { loadNotes, noteWhen, type LiveNote } from "@/lib/live-notes";

type Totals = { gmv: number; orders: number; creators: number; videos: number; lives: number; live: number };
const TONE: Record<string, string> = { alert: "red", x: "red", video: "blue", gift: "amber", link: "amber" };

/** "Good morning/afternoon/evening, Name" and the shop line, from her real shop. */
export function LiveHello({ items, totals }: { items: ShopItem[] | null; totals: Totals | null }) {
  const t = useT();
  const { me } = useDemo();
  const [name, setName] = useState("");
  const [hi, setHi] = useState<"morning" | "afternoon" | "evening">("morning");
  useEffect(() => {
    const h = new Date().getHours();
    setHi(h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
    loadProfile<{ contact?: string }>("seller").then((d) => setName(d.profile?.details.contact?.split(" ")[0] ?? "")).catch(() => {});
  }, []);
  const live = items?.filter((s) => s.stage === "Live").length ?? 0;
  const who = name || me?.name?.split(" ")[0] || "";
  const hello = hi === "morning" ? (who ? t("Good morning, {name}", { name: who }) : t("Good morning"))
    : hi === "afternoon" ? (who ? t("Good afternoon, {name}", { name: who }) : t("Good afternoon"))
    : who ? t("Good evening, {name}", { name: who }) : t("Good evening");
  return (
    <div className="sl-hello">
      <h1>{hello}</h1>
      <p className="v2-muted">
        {me?.sellerShop ?? t("Your shop")}
        {items && <> · <Rich text={live === 1 ? t("<b>{n}</b> product live in TAP", { n: live }) : t("<b>{n}</b> products live in TAP", { n: live })} /></>}
        {totals && <> · <Rich text={totals.creators === 1 ? t("<b>{n}</b> creator promoting", { n: totals.creators }) : t("<b>{n}</b> creators promoting", { n: totals.creators })} /></>}
      </p>
    </div>
  );
}

/** One "do this first" card from where her products really are. */
export function LiveNext({ items }: { items: ShopItem[] | null }) {
  const t = useT();
  if (!items) return null;
  const live = items.filter((s) => s.stage === "Live").length;
  const waiting = items.filter((s) => s.stage === "Under review" || s.stage === "Submitted to TikTok");
  const broken = items.filter((s) => s.stage === "Not approved");
  const fresh = items.filter((s) => s.stage === "Not submitted").length;
  if (broken.length) {
    return (
      <section className="v2-next red">
        <small>{t("Do this first")}</small>
        <h2>{broken.length === 1 ? t("{n} Product Not Approved", { n: broken.length }) : t("{n} Products Not Approved", { n: broken.length })}</h2>
        <p>{broken[0].reason ? `${broken[0].name}: ${t(broken[0].reason)}` : t("{name} needs a change before it can go back in.", { name: broken[0].name })}</p>
        <div className="v2-row">
          <Link href={`/seller/app/product/${broken[0].id}`} className="v2-btn-white" style={{ color: "#b42318" }}>{t("Fix and Resubmit")}</Link>
          <Link href="/seller/app/progress" className="v2-btn-ghostw">{t("See Progress")}</Link>
        </div>
      </section>
    );
  }
  if (waiting.length) {
    const withTikTok = waiting.filter((s) => s.stage === "Submitted to TikTok").length;
    return (
      <section className="v2-next">
        <small>{t("On the way")}</small>
        <h2>{withTikTok === waiting.length
          ? (waiting.length === 1 ? t("{n} product waiting on TikTok", { n: waiting.length }) : t("{n} products waiting on TikTok", { n: waiting.length }))
          : waiting.length === 1 ? t("{n} product on the way", { n: waiting.length }) : t("{n} products on the way", { n: waiting.length })}</h2>
        <p>{withTikTok === waiting.length ? t("Nothing to do. TikTok usually replies in 1–3 working days.") : t("Our team reviews them first, then sends them to TikTok.")}</p>
        <div className="sl-mini-steps">
          <span className="on"><Icon name="check" size={14} width={2.6} /> {t("Registered")}</span>
          <span className={withTikTok ? "on" : undefined}>{withTikTok ? <Icon name="check" size={14} width={2.6} /> : null} {t("Our review")}</span>
          <span>{t("With TikTok")}</span>
          <span>{t("Live")}</span>
        </div>
        <div className="v2-row">
          <Link href="/seller/app/progress" className="v2-btn-white">{t("See Progress")}</Link>
          {fresh > 0 && <Link href="/seller/app/submit" className="v2-btn-ghostw">{t("Register {n} more", { n: fresh })}</Link>}
        </div>
      </section>
    );
  }
  if (!live) {
    return (
      <section className="v2-next">
        <small>{t("Start here")}</small>
        <h2>{t("Register Your First Products")}</h2>
        <p>{t("Pick products. AI suggests the commission; samples are set to 40.")}</p>
        <div className="v2-row">
          <Link href="/seller/app/submit" className="v2-btn-white">{t("Register Products")} <Icon name="arrow" size={18} /></Link>
        </div>
      </section>
    );
  }
  return (
    <section className="v2-next">
      <small>{t("All good")}</small>
      <h2>{live === 1 ? t("All {n} product is live", { n: live }) : t("All {n} products are live", { n: live })}</h2>
      <p>{fresh ? (fresh === 1 ? t("{n} product not in TAP yet.", { n: fresh }) : t("{n} products not in TAP yet.", { n: fresh })) : t("Every product you sent is in TAP.")}</p>
      <div className="v2-row">
        <Link href="/seller/app/results" className="v2-btn-white">{t("See Results")}</Link>
        {fresh > 0 && <Link href="/seller/app/submit" className="v2-btn-ghostw">{t("Add More Products")}</Link>}
      </div>
    </section>
  );
}

/** Her TAP results so far (lifetime, from TikTok), in the home card's place. */
export function LiveSummary({ totals, failed }: { totals: Totals | null; failed: boolean }) {
  const t = useT();
  return (
    <section className="v2-card">
      <div className="v2-card-h">
        <h2 className="v2-h2">{t("Your TAP Results")}</h2>
        <Link href="/seller/app/results">{t("See All")}</Link>
      </div>
      <Source when={t("today")} />
      {!totals ? (
        <p className="v2-muted" style={{ margin: 0 }}>{failed ? t("Couldn't reach TikTok Shop.") : t("Loading…")}</p>
      ) : (
        <div className="v2-grid4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
          <Stat label={t("Sales")} value={<Count value={totals.gmv} format={(n) => rm(n, 0)} />} note={t("Since live")} />
          <Stat label={t("Orders")} value={<Count value={totals.orders} />} />
          <Stat label={t("Creators Promoting")} value={<Count value={totals.creators} />} />
          <Stat label={t("Videos")} value={<Count value={totals.videos} />} />
        </div>
      )}
    </section>
  );
}

/** Her latest notifications as the home page's recent activity. */
export function LiveActivity() {
  const t = useT();
  const [notes, setNotes] = useState<LiveNote[] | null>(null);
  useEffect(() => { loadNotes("seller").then((d) => setNotes(d?.notes.slice(0, 5) ?? [])); }, []);
  return (
    <section className="v2-card">
      <div className="v2-card-h">
        <h2 className="v2-h2">{t("Recent Activity")}</h2>
        <Link href="/seller/app/notifications">{t("All")}</Link>
      </div>
      <div className="sl-acts">
        {notes === null && <p className="v2-muted" style={{ margin: 0 }}>{t("Loading…")}</p>}
        {notes?.length === 0 && <p className="v2-muted" style={{ margin: 0 }}>{t("Nothing yet. Product reviews, missions and posts show up here.")}</p>}
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
