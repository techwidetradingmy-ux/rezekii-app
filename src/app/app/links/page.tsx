"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Empty, Loading, Title } from "@/components/ui";
import { useDemo } from "@/components/demo";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/lang";
import { rm } from "@/lib/mock";
import { tiktokShopProduct } from "@/lib/tiktok-links";
import { Thumb, copyLink, linesOf, postJson } from "@/components/link-tools";
import type { ConvertRow } from "@/modules/tap/convert.ts";
import type { LinkPerf } from "@/modules/tap/link-share.ts";
import "@/app/link-tools.css";

type Made = { product_id: string; product_name: string | null; image: string | null; tag: string | null; link: string; made_at: string };
const SHOWN = 20;

/**
 * Convert Links (owner, 21 Nov 2026, as on rezekii.com): TikTok Shop product links in, her own affiliate links out. Without
 * her TikTok Shop linked, only products in Techwide's TAP campaigns get a link. Below: the links she made, with their sales.
 */
export default function ConvertLinks() {
  const t = useT();
  const lang = useLang();
  const { live, toast } = useDemo();
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ConvertRow[] | null>(null);
  const [linked, setLinked] = useState(true);
  const [made, setMade] = useState<{ links: Made[]; perf: Record<string, LinkPerf> } | "error" | null>(null);
  const [all, setAll] = useState(false);
  const lines = linesOf(text);

  const loadMade = () =>
    fetch("/api/tap/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d: { links: Made[]; perf?: Record<string, LinkPerf> }) => setMade({ links: d.links, perf: d.perf ?? {} }))
      .catch(() => setMade("error"));
  useEffect(() => {
    if (!live) return;
    // From Product Lookup: ?add=<product id> starts with that product's link.
    const add = new URLSearchParams(window.location.search).get("add");
    if (add && /^\d{6,25}$/.test(add)) setText(tiktokShopProduct(add));
    loadMade();
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!live) return <div className="v2-stack v2-in"><Title title={t("Convert Links")} /><Empty title={t("Sign in to convert links")} line={t("Your links are made with your own TikTok Shop account.")} href="/signin" cta={t("Sign In")} /></div>;

  const convert = async () => {
    if (!lines.length || busy) return;
    if (lines.length > 5) return toast(t("Up to 5 links at a time."));
    setBusy(true);
    const d = await postJson<{ rows: ConvertRow[]; linked: boolean }>("/api/tap/convert", { links: lines, tags: tags.split(/[\s,]+/).filter(Boolean) });
    setBusy(false);
    if ("error" in d) return toast(d.error || t("Couldn't convert. Please try again."));
    setRows(d.rows);
    setLinked(d.linked);
    loadMade();
  };
  const day = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

  return (
    <div className="v2-stack v2-in lt-page">
      <Title title={t("Convert Links")} sub={t("Paste TikTok Shop product links to get your own affiliate links. Tags show where each sale came from.")} />
      <section className="v2-card lt-form">
        <label className="pb-field"><b>{t("Product Links")}</b><textarea className="np-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Up to 5 TikTok Shop product links, one per line")} aria-label={t("Product Links")} /></label>
        <label className="pb-field"><b>{t("Tags")}</b><input className="np-input" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("e.g. facebook, threads")} aria-label={t("Tags")} /><small className="np-muted">{t("Optional. Where you'll share the link, so its sales show by tag.")}</small></label>
        <button type="button" className="np-btn" disabled={!lines.length || busy} onClick={() => void convert()}>{busy ? t("Converting…") : t("Convert")}</button>
        {!linked && <p className="pb-warn">{t("Link TikTok Shop to make links for any product. Without it, only products in Rezekii's campaigns get a link.")} <Link href="/app/account#connections" className="v2-link">{t("Link TikTok Shop")}</Link></p>}
      </section>

      {rows && (
        <section className="v2-card">
          <h2 className="v2-h2">{t("Your New Links")}</h2>
          <ul className="lt-list">
            {rows.map((r, i) => (
              <li key={`${r.input}-${r.tag}-${i}`} className="lt-row">
                <Thumb src={r.image} />
                <span className="lt-main">
                  <b>{r.name ?? r.input}</b>
                  {r.link ? <small className="lt-link">{r.link}</small> : <small className="lt-note">{r.note}</small>}
                  {r.tag && <small>{t("Tag: {tag}", { tag: r.tag })}</small>}
                </span>
                {r.link && <button type="button" className="btn-outline v2-btn-sm" onClick={() => copyLink(r.link!, toast, t)}>{t("Copy")}</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="v2-card">
        <h2 className="v2-h2">{t("Links You Made")}</h2>
        {made === null ? <Loading inline text={t("Loading your links…")} />
          : made === "error" ? <p className="v2-muted">{t("Couldn't load your links. Please refresh.")}</p>
          : !made.links.length ? <p className="v2-muted">{t("No links yet. Links you convert show here with their sales.")}</p>
          : (
            <>
              <ul className="lt-list">
                {(all ? made.links : made.links.slice(0, SHOWN)).map((l) => {
                  const p = made.perf[l.link];
                  return (
                    <li key={`${l.link}-${l.made_at}`} className="lt-row">
                      <Thumb src={l.image} />
                      <span className="lt-main">
                        <b>{l.product_name ?? l.product_id}</b>
                        <small>{l.tag ? `${t("Tag: {tag}", { tag: l.tag })} · ${day(l.made_at)}` : day(l.made_at)}</small>
                        {p && p.orders > 0 && <small className="lt-sales">{t("{n} orders · {money} commission", { n: p.orders, money: rm(p.commission) })}</small>}
                      </span>
                      <button type="button" className="btn-outline v2-btn-sm" onClick={() => copyLink(l.link, toast, t)}>{t("Copy")}</button>
                    </li>
                  );
                })}
              </ul>
              {!all && made.links.length > SHOWN && <button type="button" className="pb-link" onClick={() => setAll(true)}>{t("Show All {n}", { n: made.links.length })}</button>}
            </>
          )}
      </section>
    </div>
  );
}
