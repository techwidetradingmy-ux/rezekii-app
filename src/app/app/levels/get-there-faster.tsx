"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";

type Match = { productId: string; name: string };

/**
 * "Get there faster" on Levels (owner's pick C, 14 Oct 2026): products already in the creator's showcase that are also in the
 * Rezekii Marketplace, added through Techwide's TAP link in one tap so the GMV they convert from then on counts toward their
 * Rezekii level; then sample videos (Bronze) and the marketplace.
 */
export function GetThereFaster({ bronze, sampleVideos }: { bronze: boolean; sampleVideos: number }) {
  const t = useT();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [linked, setLinked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; failed: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/tap/raises", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { matches?: Match[]; linked?: boolean } | null) => { if (!live) return; setMatches(d?.matches ?? []); setLinked(d?.linked !== false); })
      .catch(() => live && setMatches([]));
    return () => { live = false; };
  }, []);

  const addAll = async () => {
    if (!matches?.length || busy) return;
    setBusy(true);
    let added = 0, failed = 0;
    let left = matches;
    for (let i = 0; i < matches.length; i += 50) {
      const r = await fetch("/api/tap/raises", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productIds: matches.slice(i, i + 50).map((m) => m.productId) }) })
        .then((x) => x.json())
        .catch(() => null) as { added?: string[]; failed?: unknown[]; matches?: Match[] } | null;
      added += r?.added?.length ?? 0;
      failed += r?.failed?.length ?? 0;
      if (r?.matches) left = r.matches;
    }
    setMatches(left);
    setDone({ added, failed });
    setBusy(false);
  };

  const count = matches?.length ?? 0;
  const s1 = !linked
    ? { n: "1", title: t("Link your TikTok Shop account"), text: t("Rezekii checks your showcase for products that are also in the Rezekii Marketplace."), ok: false }
    : matches === null
      ? { n: "1", title: t("Checking your showcase…"), text: t("Looking for products that are also in the Rezekii Marketplace."), ok: false }
      : done && done.added > 0
        ? {
            n: "✓",
            title: done.added === 1 ? t("{n} Rezekii product is in your showcase", { n: 1 }) : t("{n} Rezekii products are in your showcase", { n: done.added }),
            text: `${t("GMV you convert from now on counts toward your Rezekii level.")}${done.failed ? t(" TikTok wouldn't take {n} more.", { n: done.failed }) : ""}`,
            ok: true,
          }
        : count > 0
          ? {
              n: "1",
              title: count === 1 ? t("Your showcase has {n} product also in the Rezekii Marketplace", { n: 1 }) : t("Your showcase has {n} products also in the Rezekii Marketplace", { n: count }),
              text: t("Only GMV from the Rezekii products you add to your showcase counts toward your Rezekii level. Add them now."),
              ok: false,
            }
          : { n: "✓", title: t("Your showcase is set"), text: t("Every product in your showcase that is also in the Rezekii Marketplace was added through Rezekii."), ok: true };

  const steps: { title: string; text: string; ok: boolean; action: React.ReactNode }[] = [
    {
      ...s1,
      action: !linked ? (
        <Link href="/app/accounts" className="nv-btn nv-press" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>{t("Link TikTok Shop")}</Link>
      ) : matches === null ? (
        <span className="nv-skel" style={{ width: 130, height: 40, borderRadius: 12 }} />
      ) : count > 0 ? (
        <button type="button" className="nv-btn nv-press" onClick={addAll} disabled={busy} style={{ whiteSpace: "nowrap" }}>{busy ? <><span className="nv-sping" aria-hidden="true" /> {t("Adding…")}</> : t("Add to showcase")}</button>
      ) : null,
    },
    ...(bronze
      ? [{ title: t("Post videos for your samples"), text: t("{n} of 10 sample videos posted · Silver needs 10", { n: Math.min(sampleVideos, 10) }), ok: sampleVideos >= 10, action: <Link href="/app/my-tap" className="nv-btn2 nv-press" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>{t("My samples")}</Link> }]
      : []),
    { title: t("Find more in the Rezekii Marketplace"), text: t("Every product you add through Rezekii counts from day one."), ok: false, action: <Link href="/app/marketplace" className="nv-btn2 nv-press" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>{t("Rezekii Marketplace")}</Link> },
  ];

  return (
    <section className="nv-up nv-card" aria-labelledby="lvfast" style={{ animationDelay: "110ms", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 id="lvfast" className="nv-h2">{t("Get there faster")}</h2>
      <div className="gf-tip">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" /></svg>
        <span><b>{t("New here?")}</b> {t("Only GMV from Rezekii products in your showcase counts toward your Rezekii level, so adding the Rezekii version of products you already show is the quickest start.")}</span>
      </div>
      {steps.map((st, i) => (
        <div key={st.title} className="gf-step" aria-live={i === 0 ? "polite" : undefined}>
          <span className={`gf-num ${st.ok ? "ok" : i === 0 ? "" : "off"}`}>{st.ok ? "✓" : i + 1}</span>
          <span style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <b>{st.title}</b>
            <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{st.text}</span>
          </span>
          {st.action}
        </div>
      ))}
    </section>
  );
}
