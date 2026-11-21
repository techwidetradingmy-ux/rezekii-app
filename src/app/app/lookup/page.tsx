"use client";

import Link from "next/link";
import { useState } from "react";
import { Empty, Title } from "@/components/ui";
import { useDemo } from "@/components/demo";
import { useT } from "@/lib/i18n/client";
import { rm } from "@/lib/mock";
import { tiktokShopProduct } from "@/lib/tiktok-links";
import { Thumb, linesOf, postJson } from "@/components/link-tools";
import type { LookupRow } from "@/modules/tap/convert.ts";
import "@/app/link-tools.css";

const MAX = 20;
const price = (lo: number | null, hi: number | null) => (lo === null ? "" : hi === null || hi === lo ? rm(lo) : `${rm(lo)} – ${rm(hi)}`);
const rate = (r: number) => `${(r / 100) % 1 ? (r / 100).toFixed(1) : r / 100}%`;

/**
 * Product Lookup (owner, 21 Nov 2026, as on rezekii.com): paste up to 20 TikTok Shop product links and see each product's price,
 * commission, sales and stock, from TikTok Shop (with her TikTok Shop linked) or Techwide's TAP catalog. Convert takes one to
 * Convert Links.
 */
export default function ProductLookup() {
  const t = useT();
  const { live, toast } = useDemo();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<LookupRow[] | null>(null);
  const [linked, setLinked] = useState(true);
  const lines = linesOf(text);

  if (!live) return <div className="v2-stack v2-in"><Title title={t("Product Lookup")} /><Empty title={t("Sign in to look up products")} line={t("Products are looked up with your own TikTok Shop account.")} href="/signin" cta={t("Sign In")} /></div>;

  const look = async () => {
    if (!lines.length || busy) return;
    if (lines.length > MAX) return toast(t("Up to {n} links at a time.", { n: MAX }));
    setBusy(true);
    const d = await postJson<{ rows: LookupRow[]; linked: boolean }>("/api/tap/lookup", { links: lines });
    setBusy(false);
    if ("error" in d) return toast(d.error || t("Couldn't look them up. Please try again."));
    setRows(d.rows);
    setLinked(d.linked);
  };

  return (
    <div className="v2-stack v2-in lt-page">
      <Title title={t("Product Lookup")} sub={t("Paste TikTok Shop product links to see each product's price, commission, sales and stock.")} />
      <section className="v2-card lt-form">
        <label className="pb-field"><b>{t("Product Links")}</b><textarea className="np-input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Up to {n} TikTok Shop product links, one per line", { n: MAX })} aria-label={t("Product Links")} /></label>
        <button type="button" className="np-btn" disabled={!lines.length || busy} onClick={() => void look()}>{busy ? t("Looking up…") : t("Look Up")}</button>
        {!linked && <p className="pb-warn">{t("Link TikTok Shop to look up any product. Without it, only products in Rezekii's campaigns are found.")} <Link href="/app/account#connections" className="v2-link">{t("Link TikTok Shop")}</Link></p>}
      </section>

      {rows && (
        <section className="v2-card">
          <h2 className="v2-h2">{t("Results")}</h2>
          <ul className="lt-list">
            {rows.map((r, i) => (
              <li key={`${r.input}-${i}`} className="lt-row">
                <Thumb src={r.image} />
                <span className="lt-main">
                  <b>{r.ok ? r.name : r.input}</b>
                  {r.ok ? (
                    <>
                      {r.shop && <small>{r.shop}</small>}
                      <span className="lt-facts">
                        {r.priceLo !== null && <span>{t("Price")}: <b>{price(r.priceLo, r.priceHi)}</b></span>}
                        {r.rate !== null && <span>{t("Commission")}: <b>{rate(r.rate)}</b>{r.priceLo !== null && ` (${rm(Math.round((r.priceLo * r.rate) / 100) / 100)})`}</span>}
                        {r.sold !== null && <span>{t("Sold")}: <b>{r.sold.toLocaleString("en-MY")}</b></span>}
                        {r.stock !== null && <span>{t("Stock")}: <b>{r.stock.toLocaleString("en-MY")}</b></span>}
                      </span>
                      {r.note && <small className="lt-note">{r.note}</small>}
                    </>
                  ) : <small className="lt-note">{r.note}</small>}
                </span>
                {r.ok && r.id && (
                  <span className="lt-acts">
                    <Link href={`/app/links?add=${r.id}`} className="btn-outline v2-btn-sm">{t("Convert")}</Link>
                    <a href={tiktokShopProduct(r.id)} target="_blank" rel="noopener noreferrer" className="sq-ghost v2-btn-sm">{t("View on TikTok")}</a>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
