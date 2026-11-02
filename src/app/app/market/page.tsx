"use client";

import Link from "next/link";
import { DataNote } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Flow, Hidden, Title } from "@/components/ui";
import { SampleTag } from "@/components/creator1/brand";
import { MY_SAMPLES, PRODUCTS, bestRate, rateFor, rm, type Product } from "@/lib/mock";
import { SAMPLE_LEFT, canGetSample } from "@/lib/mock-creator1";
import { productHref, requestedSamples } from "@/lib/product-view";
import { loadMarket } from "@/lib/live";
import { AddButton } from "@/components/add-button";
import "@/app/creator1.css";
import { useKept } from "@/lib/keep";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

/** A translated line whose {placeholders} are React elements (a blurred amount). */
const fillEl = (line: string, els: Record<string, React.ReactNode>) => line.split(/\{(\w+)\}/).map((s, i) => (i % 2 ? <Fragment key={i}>{els[s]}</Fragment> : s));

const WITH_SAMPLES = PRODUCTS.filter((p) => p.samples !== null);
/** Free samples she can request right now (her streak is long enough). */
const CAN_GET = WITH_SAMPLES.filter((p) => canGetSample(p.samples));
/** The sample's categories (our own list, so they're translated where shown; signed in, TikTok's stay as TikTok names them). */
const CATS = Array.from(new Set(PRODUCTS.map((p) => p.category))).sort();
const SORTS = [
  ["sold", tx("Best-selling")],
  ["rate", tx("Highest commission")],
  ["earn", tx("Earn per sale")],
  ["cheap", tx("Price: low to high")],
  ["dear", tx("Price: high to low")],
  ["samples", tx("Most samples left")],
] as const;
type SortKey = (typeof SORTS)[number][0];
// Her own rate: level or special (owner, 29 Oct 2026).
const mine = (p: Product) => rateFor(p).rate;
const earn = (p: Product) => (p.price * mine(p)) / 100;

/**
 * Marketplace: every product in Techwide's TAP campaigns, with her rate now (target plan if she has one, else open plan) next to the Rezekii rate and what you earn
 * per sale. Add to showcase in one tap; request a free sample where the product has one. Filter by category, samples and tier, then sort.
 */
export default function Marketplace() {
  const t = useT();
  const { linked, setLinked, toast, requireWa, live, me } = useDemo();
  const [q, setQ] = useKept("mk-q", "");
  const [cat, setCat] = useKept("mk-cat", "All");
  const [sort, setSort] = useKept<SortKey>("mk-sort", "sold");
  const [onlySamples, setOnlySamples] = useKept("mk-samples", false);
  // Grid or list (owner, 28 Oct 2026: a list is easier to browse), remembered on this device.
  const [view, setView] = useKept<"grid" | "list">("mk-view", "grid");
  useEffect(() => {
    try {
      if (localStorage.getItem("rz2_market_view") === "list") setView("list");
    } catch {}
  }, []);
  const pickView = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem("rz2_market_view", v);
    } catch {}
  };
  const router = useRouter();
  const [requested, setRequested] = useState<string[]>([]);
  useEffect(() => setRequested(requestedSamples()), []);

  // Arriving with ?p=<product> (older links) opens that product's page at its free sample.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("p");
    if (id) router.replace(productHref(id, { sample: true }));
  }, [router]);

  // Signed in (owner, 30 Oct 2026): the real Marketplace, Techwide's TAP products, 24 at a time.
  const [real, setReal] = useState<{ items: Product[]; total: number; cats: [string, number][]; all: number; asOf: string | null } | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, cat, sort, onlySamples]);
  useEffect(() => {
    if (!live) return;
    let gone = false;
    const t = window.setTimeout(() => {
      loadMarket({ q: q.trim(), cat, sort, onlySamples, page }, me?.level ?? "bronze").then((d) => {
        if (gone || !d) return;
        setReal((r) => (page > 1 && r ? { ...d, items: [...r.items, ...d.items] } : d));
      });
    }, q ? 300 : 0);
    return () => {
      gone = true;
      window.clearTimeout(t);
    };
  }, [live, me?.level, q, cat, sort, onlySamples, page]);

  const term = q.trim().toLowerCase();
  const list = live && real ? real.items : PRODUCTS.filter((p) => (!onlySamples || CAN_GET.includes(p)) && (cat === "All" || p.category === cat) && (!term || `${p.name} ${p.shop}`.toLowerCase().includes(term))).sort((a, b) => {
    if (sort === "rate") return mine(b) - mine(a);
    if (sort === "earn") return earn(b) - earn(a);
    if (sort === "cheap") return a.price - b.price;
    if (sort === "dear") return b.price - a.price;
    if (sort === "samples") return (b.samples !== null ? SAMPLE_LEFT[b.id] ?? 10 : -1) - (a.samples !== null ? SAMPLE_LEFT[a.id] ?? 10 : -1);
    return b.sold - a.sold;
  });
  return (
    <div className="v2-stack v2-in mk-page" style={{ gap: 20 }}>
      <Title title={t("Marketplace")} sub={t("Better rates than TikTok's open plan. Free Samples on many.")}>
        <Link href="/app/account#samples" className="mk-mysamples" aria-label={live ? t("My samples") : t("My samples: {n} in progress", { n: MY_SAMPLES.filter((s) => !["Done", "Not approved"].includes(s.status)).length })} title={t("My samples")}><Icon name="box" size={20} />{!live && <span className="badge">{MY_SAMPLES.filter((s) => !["Done", "Not approved"].includes(s.status)).length}</span>}</Link>
      </Title>
      {live && <DataNote latest={real?.asOf} what={t("Products and rates from")} />}


      <div className="mk-bar">
        <span className="mk-bar-h">{t("Filters")}</span>
        <label className="mk-search">
          <Icon name="search" size={18} />
          <input className="np-input" type="search" placeholder={t("Search products")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search products or shops")} />
        </label>
        <label className="mk-select">
          <span>{t("Category")}</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="All">{t("All categories ({n})", { n: live && real ? real.all : PRODUCTS.length })}</option>
            {live && real
              ? real.cats.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)
              : CATS.map((c) => <option key={c} value={c}>{t(c)} ({PRODUCTS.filter((p) => p.category === c).length})</option>)}
          </select>
        </label>
        <label className="mk-select">
          <span>{t("Sort by")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}
          </select>
        </label>
        <button type="button" role="switch" aria-checked={onlySamples} className={`mk-switch ${onlySamples ? "on" : ""}`} onClick={() => setOnlySamples((o) => !o)}>
          <span className="np-switch-like" aria-hidden="true"><i /></span>
          <Icon name="gift" size={16} /> {t("Free Samples")} {!live && <em>{CAN_GET.length}</em>}
        </button>
      </div>

      <section className="v2-card tight">
        <Flow
          label={t("How the marketplace works")}
          steps={[
            { icon: "tag", title: t("Better rate") },
            { icon: "plus", title: t("Add to showcase") },
            { icon: "gift", title: t("Or Free Samples") },
            { icon: "video", title: t("Post 1 video") },
            { icon: "wallet", title: t("Earn per sale") },
          ]}
        />
      </section>

      <p className="mk-count">
        {(live && real ? real.total : list.length) === 1 ? t("{n} product", { n: 1 }) : t("{n} products", { n: live && real ? real.total : list.length })}
        {(cat !== "All" || onlySamples || term) && <button type="button" className="v2-link" onClick={() => { setQ(""); setCat("All"); setOnlySamples(false); }}>{t("Clear")}</button>}
        <span className="mk-view" role="group" aria-label={t("Grid or list view")}>
          <button type="button" aria-pressed={view === "grid"} aria-label={t("Grid view")} onClick={() => pickView("grid")}><Icon name="grid" size={16} /></button>
          <button type="button" aria-pressed={view === "list"} aria-label={t("List view")} onClick={() => pickView("list")}><Icon name="list" size={16} /></button>
        </span>
      </p>

      <div className="mk-nosplit">
      <div className={`mk-grid${view === "list" ? " list" : ""}`}>
        {list.map((p, i) => {
          const left = SAMPLE_LEFT[p.id] ?? 10;
          const now = bestRate(p);
          // Kept only when a target plan really pays as much or more; a Rezekii rate equal to the open plan is just her rate.
          const better = now.rate < mine(p);
          const kept = !better && now.plan === "Target plan";
          const asked = requested.includes(p.id);
          // Option A, clean grid (owner, 28 Oct 2026): name, open → Rezekii rate, what she earns, Add and a gift button.
          return (
            <article key={p.id} className="mk-card mka" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <Link href={productHref(p.id)} className="mk-img" aria-label={p.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                {p.samples !== null && <SampleTag streak={p.samples} label={false} />}
                {asked && <span className="cr1-reqd"><Icon name="check" size={13} width={3} /> {t("Requested")}</span>}
              </Link>
              <Link href={productHref(p.id)} className="mka-name"><strong>{p.name}</strong></Link>
              {/* Its TikTok rating when Rezekii already knows it (owner, 2 Nov 2026); TikTok is never asked per card. */}
              <small className="mk-meta">{rm(p.price)} · {t("{sold} sold", { sold: p.sold >= 1e6 ? `${(p.sold / 1e6).toFixed(1)}M` : `${Math.round(p.sold / 1e3)}K` })}{p.rating > 0 && <> · <span className="mk-score"><Icon name="star" size={11} width={2.4} /> {p.rating.toFixed(1)}</span></>}</small>
              {better ? (
                <span className="mka-rate" aria-label={t("{plan} {rate}%, Rezekii {mine}%", { plan: t(now.plan), rate: now.rate, mine: mine(p) })}><s>{now.rate}%</s><Icon name="arrow" size={13} /><b><Hidden>{mine(p)}%</Hidden></b>{now.plan === "Target plan" && <em className="mka-target">{t("Target")}</em>}{rateFor(p).special && <em className="mka-special">{t("Special")}</em>}</span>
              ) : kept ? (
                <span className="mka-rate" aria-label={t("Your target plan {rate}%, more than Rezekii's {mine}%", { rate: now.rate, mine: mine(p) })}><b><Hidden>{now.rate}%</Hidden></b><em className="mka-target">{t("Your target plan")}</em></span>
              ) : (
                <span className="mka-rate" aria-label={`Rezekii ${mine(p)}%`}><b><Hidden>{mine(p)}%</Hidden></b>{rateFor(p).special && <em className="mka-special">{t("Special")}</em>}</span>
              )}
              <span className="mka-earn">{fillEl(t("Earn {r}"), { r: <b><Hidden>{rm((p.price * Math.max(now.rate, mine(p))) / 100)}</Hidden></b> })}</span>
              <span className="mka-acts">
                {!kept ? (
                  <AddButton id={p.id} name={p.name} rate={mine(p)} />
                ) : (
                  <button type="button" className="mka-add done" disabled title={t("Your target plan pays more, so it stays as it is")}><Icon name="shield" size={15} width={2.4} /> {t("Kept")}</button>
                )}
                {p.samples !== null ? (
                  <button type="button" className={`mka-gift ${asked ? "asked" : ""}`} disabled={asked} onClick={() => requireWa(() => router.push(productHref(p.id, { sample: true })))} aria-label={asked ? t("Free sample requested") : t("Free sample, {n} left", { n: left })} title={asked ? t("Requested") : t("Free sample · {n} left", { n: left })}>
                    <Icon name={asked ? "check" : "gift"} size={16} />
                  </button>
                ) : (
                  <button type="button" className="mka-gift off" disabled aria-label={t("No free sample")} title={t("No free sample")}><Icon name="gift" size={16} /></button>
                )}
              </span>
            </article>
          );
        })}
      </div>
      </div>
      {live && real && real.items.length < real.total && (
        <button type="button" className="btn-outline" style={{ alignSelf: "center" }} onClick={() => setPage((n) => n + 1)}>{t("Show More Products")}</button>
      )}
      {list.length === 0 && (
        <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>{t("No products match")}</b>
          <span className="v2-muted">{t("Try other filters.")}</span>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { setQ(""); setCat("All"); setOnlySamples(false); }}>{t("Show All")}</button>
        </div>
      )}

    </div>
  );
}
