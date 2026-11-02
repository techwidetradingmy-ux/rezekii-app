"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { SHOP_ITEMS, type ShopItem, type Stage } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";
import { loadShop } from "@/lib/live";
import { labelCase } from "@/lib/label-case";
import { Rich } from "@/components/seller/seller-ui";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

const STEPS: [Exclude<Stage, "Not submitted" | "Not approved">, string, string][] = [
  ["Submitted", tx("Submitted"), ""],
  ["Under review", tx("Our review"), tx("Within 1 working day")],
  ["Submitted to TikTok", tx("With TikTok"), tx("1–3 working days")],
  ["Live", tx("Live"), tx("Creators can apply")],
];
const FILTERS = ["All", "In progress", "Live", "Not approved"] as const;
type Filter = (typeof FILTERS)[number];
const group = (s: Stage): Filter => (s === "Live" ? "Live" : s === "Not approved" ? "Not approved" : "In progress");
const ORDER: Record<Filter, number> = { "In progress": 0, "Not approved": 1, Live: 2, All: 3 };

function Tracker({ item }: { item: ShopItem }) {
  const t = useT();
  const failed = item.stage === "Not approved";
  const reached = STEPS.filter(([k]) => item.dates?.[k]).length;
  const cur = failed ? reached - 1 : STEPS.findIndex(([k]) => k === item.stage);
  return (
    <div className="sl-track" aria-label={t("Status: {status}", { status: t(labelCase(item.stage)) })}>
      {STEPS.map(([key, label, eta], k) => {
        const live = item.stage === "Live";
        const state = failed ? (k < cur ? "done" : k === cur ? "stop" : "later") : live || k < cur ? "done" : k === cur ? "now" : "later";
        return (
          <div key={key} className={state}>
            <i>{state === "done" && <Icon name="check" size={14} width={3} />}{state === "stop" && <Icon name="x" size={13} width={3} />}</i>
            <b>{state === "stop" ? t("Not approved") : t(label)}</b>
            <small>{item.dates?.[key] ? t(item.dates[key]) : state === "later" && !failed && eta ? t(eta) : ""}</small>
          </div>
        );
      })}
    </div>
  );
}

/** Every product submitted to Techwide's TAP, and where it is now. */
export default function Progress() {
  const t = useT();
  const router = useRouter();
  const { toast, live } = useDemo();
  const [items, setItems] = useState(SHOP_ITEMS.filter((s) => s.stage !== "Not submitted"));
  // Signed in (owner, 30 Oct 2026): the real requests of the shop this account authorized; null while loading.
  const [loaded, setLoaded] = useState<"no-shop" | "ok" | null>(null);
  useEffect(() => {
    if (!live) return;
    setItems([]);
    loadShop()
      .then((s) => { setItems((s?.items ?? []).filter((p) => p.stage !== "Not submitted")); setLoaded(s ? "ok" : "no-shop"); })
      .catch((e: Error) => { toast(e.message); setLoaded("ok"); });
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filter, setFilter] = useState<Filter>("All");
  const [fix, setFix] = useState<ShopItem | null>(null);
  const [samples, setSamples] = useState(40);
  const shown = items.filter((i) => filter === "All" || group(i.stage) === filter).sort((a, b) => ORDER[group(a.stage)] - ORDER[group(b.stage)]);

  return (
    <div className="v2-stack v2-in">
      <Title title={t("Progress")} sub={live ? t("Registered in your campaign → Techwide's review → live for creators. Statuses come from TikTok.") : t("Submitted → our review → TikTok → live.")}>
        <Link href="/seller/app/submit" className="np-btn v2-btn-sm" style={{ height: 42 }}>{t("Register Products")}</Link>
      </Title>

      <div className="sl-chipline" role="group" aria-label={t("Filter")}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {t(labelCase(f))} <small>{f === "All" ? items.length : items.filter((i) => group(i.stage) === f).length}</small>
          </button>
        ))}
      </div>

      <div className="v2-stack">
        {shown.map((p) => {
          const g = group(p.stage);
          return (
            <section key={p.id} className="v2-card">
              <div className="sl-prow" style={{ padding: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={p.img} alt="" onClick={() => router.push(sellerProductHref(p.id))} />
                <span className="sl-pinfo">
                  <strong><Link href={sellerProductHref(p.id)} className="pv-open">{p.name}</Link></strong>
                  <small>{t("Public {rate}%", { rate: p.publicRate ?? "?" })} → {p.tapRate !== undefined ? `TAP ${p.tapRate}%` : `+${p.raise ?? 0}%`} · {t("{n} samples per SKU", { n: p.samples ?? "" })}</small>
                  {p.fromSellerCenter && <span className="v2-row"><span className="badge badge-blue">{t("From Seller Center")}</span></span>}
                </span>
                <span className="sl-pside">
                  <span className={`badge ${g === "Live" ? "" : g === "Not approved" ? "badge-red" : "badge-amber"}`}>{p.stage === "Submitted to TikTok" ? t("With TikTok") : t(labelCase(p.stage))}</span>
                </span>
              </div>
              <Tracker item={p} />
              {p.register && (
                <div className="v2-alert">
                  <span>{t("Techwide's campaign is ready. Register this product in it in Seller Center, then we approve it.")}</span>
                  <button type="button" onClick={() => window.open(p.register, "_blank", "noopener")}>{t("Register in Seller Center")}</button>
                </div>
              )}
              {p.stage === "Not approved" && (
                <div className="v2-alert red">
                  <span><Rich text={t("<b>Why:</b> {reason}", { reason: p.reason ? t(p.reason) : "" })} /></span>
                  <button type="button" onClick={() => (p.real ? router.push("/seller/app/submit") : setFix(p))}>{p.real ? t("Register Again") : t("Fix and Resubmit")}</button>
                </div>
              )}
              {p.note && <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}><Icon name="doc" size={16} /> {t(p.note)}</p>}
            </section>
          );
        })}
      </div>

      {live && shown.length === 0 && <p className="v2-muted" style={{ margin: 0 }}>{loaded === null ? t("Loading your requests…") : loaded === "no-shop" ? t("Connect Seller Center to see your requests.") : t("Nothing submitted yet.")}</p>}
      <p className="v2-small" style={{ margin: 0 }}><Rich text={t("Most rejections: <b>0 samples</b>, or commission <b>less than +2%</b> above the public rate.")} /></p>

      {fix && (
        <Sheet title={t("Fix and Resubmit")} onClose={() => setFix(null)}>
          <p className="v2-muted" style={{ margin: 0 }}>{fix.name}: {fix.reason && t(fix.reason)}</p>
          <div className="v2-field">{t("Samples per SKU")} <small>{t("Must be more than 0.")}</small>
            <div className="v2-chips">
              {[30, 40, 50].map((n) => (
                <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}</button>
              ))}
            </div>
          </div>
          <button type="button" className="np-btn" onClick={() => {
            setItems((all) => all.map((i) => (i.id === fix.id ? { ...i, stage: "Under review", samples, reason: undefined, dates: { Submitted: "Today", "Under review": "Today" } } : i)));
            setFix(null);
            toast(t("Resubmitted · review within 1 working day"));
          }}>{t("Resubmit with {n} samples", { n: samples })}</button>
        </Sheet>
      )}
    </div>
  );
}
