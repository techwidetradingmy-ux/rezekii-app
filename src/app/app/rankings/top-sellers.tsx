"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";
import { tx } from "@/lib/i18n/lang.ts";
import type { SellerRow } from "@/modules/rankings/boards.ts";
import { LevelFace } from "../../tts-ring";
import { Crown, Medal } from "./rank-icons";

type Result = { rows: SellerRow[]; total: number; counts: { all: number; official: number; channel: number }; period: string; asOf: string | null };
const PERIODS: [string, string][] = [["1D", tx("1 day")], ["7D", tx("7 days")], ["30D", tx("30 days")]];
const KINDS: [string, string][] = [["all", tx("All shops")], ["official", tx("Official accounts")], ["channel", tx("Channel accounts")]];
const big = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));

/**
 * Top sellers (owner, 14 Oct 2026): shop accounts kept apart from affiliates, since competing with them isn't fair. TikTok's lists
 * of a brand's official accounts and its channel accounts, ranked by GMV or by followers.
 */
export function TopSellers() {
  const t = useT();
  const [period, setPeriod] = useState("30D");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("gmv");
  const [dir, setDir] = useState("d");
  const [d, setD] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/rankings/sellers?${new URLSearchParams({ period, kind, sort, dir })}`)
      .then(async (r) => { const x = await r.json(); if (!live) return; if (!r.ok) setError(x.error || tx("Top sellers could not load.")); else { setError(""); setD(x); } })
      .catch(() => live && setError(tx("Top sellers could not load.")));
    return () => { live = false; };
  }, [period, kind, sort, dir]);

  const head = (k: string, label: string) => {
    const on = sort === k;
    return (
      <button type="button" className={`tc-sort ${on ? "on" : ""}`} onClick={() => { setSort(k); setDir(on && dir === "d" ? "a" : "d"); }} aria-label={t("Sort by {label}", { label })}>
        {label}<span className="tc-ar" aria-hidden="true"><b className={on && dir === "a" ? "on" : ""}>▲</b><b className={on && dir === "d" ? "on" : ""}>▼</b></span>
      </button>
    );
  };
  const rows = d ? d.rows.slice(0, all ? d.rows.length : 30) : [];
  const pidx = PERIODS.findIndex(([k]) => k === period);

  return (
    <section className="nv-card tc-card" aria-label={t("Top sellers")}>
      <div className="tc-tools">
        <strong style={{ fontSize: 17 }}>{t("Top sellers")} · {t("TikTok Shop Malaysia")}</strong>
        <span style={{ flex: "1 1 0" }} />
        <div className="nv-seg" role="group" aria-label={t("Period")} style={{ width: 300, maxWidth: "100%" }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${pidx * 100}%)` }} />
          {PERIODS.map(([k, label]) => <button key={k} type="button" className={period === k ? "on" : ""} aria-pressed={period === k} onClick={() => { setPeriod(k); setAll(false); }}>{t(label)}</button>)}
        </div>
      </div>
      <div className="tc-tabs nv-noscroll" role="group" aria-label={t("Kind of shop account")}>
        {KINDS.map(([k, label]) => <button key={k} type="button" className={`nv-chip nv-press ${kind === k ? "on" : ""}`} aria-pressed={kind === k} onClick={() => { setKind(k); setAll(false); }}>{t(label)} <span style={{ opacity: 0.7 }}>{d ? d.counts[k as keyof Result["counts"]] : ""}</span></button>)}
      </div>
      <div className="tc-sortbar">
        <span className="nv-cap">{t("Sort")}</span>
        {head("gmv", "GMV")}
        {head("fol", t("Followers"))}
        <span className="tc-count">{d ? t("{n} shop accounts", { n: d.total }) : ""}</span>
      </div>
      {error && <p className="np-error" role="alert">{t(error)}</p>}
      {!d && !error && <span className="tc-load"><span className="nv-spin" aria-hidden="true" />{t("Loading top sellers…")}</span>}
      {d && (
        <div className="tc-list">
          <div className="tc-row tc-headrow" aria-hidden="true"><span>#</span><span>{t("Shop account")}</span><span>{t("GMV range")}</span><span>{t("Followers")}</span><span>{t("Kind")}</span></div>
          {rows.map((r, i) => (
            <a key={`${r.kind}-${r.user}`} className="tc-row" href={`https://www.tiktok.com/@${r.user}`} target="_blank" rel="noopener" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <span className="tc-pos">{sort === "gmv" && dir === "d" && r.rank <= 3 ? (r.rank === 1 ? <Crown size={24} /> : <Medal place={r.rank as 2 | 3} size={18} />) : sort === "gmv" ? r.rank : i + 1}</span>
              <span className="tc-who">
                <LevelFace lv={null} size={42} img={r.avatar} name={r.user} />
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <strong className="tc-ellip">@{r.user}</strong>
                  <span className="tc-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{r.nick}</span>
                </span>
              </span>
              <span className="tc-gmv"><b>{r.lo || r.hi ? `RM${big(r.lo)} – ${big(r.hi)}` : "–"}</b><small>{t("TikTok's range")}</small></span>
              <span className="tc-fol">{short(r.fol)}</span>
              <span><span className={`tc-kind ${r.kind}`}>{r.kind === "official" ? t("Official") : t("Channel")}</span></span>
            </a>
          ))}
        </div>
      )}
      {d && d.rows.length > 30 && <div className="tc-more"><button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setAll(!all)}>{all ? t("Show the top 30") : t("Show all {n}", { n: d.rows.length })}</button></div>}
      <p className="tc-foot">{d?.asOf ? t("TikTok's best-seller lists of shop accounts in Malaysia, {date}: a brand's official account and its channel accounts, with the RM range TikTok gives (accounts in both its RM and US$ lists).", { date: d.asOf }) : t("TikTok's best-seller lists of shop accounts in Malaysia: a brand's official account and its channel accounts, with the RM range TikTok gives (accounts in both its RM and US$ lists).")}</p>
    </section>
  );
}
