"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx } from "@/lib/i18n/lang.ts";
import type { Benefit, LevelPage } from "@/modules/levels/store.ts";
import { Emblem, type Level } from "../../emblems";
import { GetThereFaster } from "./get-there-faster";
import { BLESS } from "./share-card";
import { ShareSheet } from "./share-sheet";
import "../marketplace/marketplace.css";
import "./levels.css";

const NAMES: Record<Level, string> = { bronze: tx("Bronze"), silver: tx("Silver"), gold: tx("Gold") };
const RANK: Record<Level, number> = { bronze: 0, silver: 1, gold: 2 };
const COLORS = ["#00c073", "#5fe3ab", "#f2c230", "#ffffff", "#b9c4ca", "#e8005a", "#25f4ee"];
const n = (v: number) => Math.round(v).toLocaleString("en-US");
/** The progress ring's dash offset (the mockup's ring of radius 44). */
const ring = (frac: number) => (276.5 * (1 - Math.min(1, Math.max(0, frac)))).toFixed(1);

/** The Levels page from the mockup, with the creator's real level and numbers. */
export function LevelsView({ data, benefits, firstName, handle, username }: { data: LevelPage; benefits: Benefit[]; firstName: string; handle: string; username: string | null }) {
  const t = useT();
  const lang = useLang();
  const level = data.level;
  const keyRow = benefits.find((b) => b.key) ?? benefits[0];
  const getRow = benefits.find((b) => /^how you get/i.test(b.label)) ?? { v: ["", "", ""] };
  const [over, setOver] = useState(RANK[level] > RANK[data.celebrated]);
  const [closing, setClosing] = useState(false);
  const [share, setShare] = useState(false);
  const [spin, setSpin] = useState(false);
  const [bless, setBless] = useState(0);

  // The level-up screen shows once per new level; closing it remembers that.
  const closeOver = () => {
    setClosing(true);
    setTimeout(() => {
      setOver(false);
      setClosing(false);
    }, 250);
    if (RANK[level] > RANK[data.celebrated]) fetch("/api/levels/celebrated", { method: "POST" }).catch(() => {});
  };
  useEffect(() => {
    if (!over || share) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeOver();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const line =
    level === "silver"
      ? t("{rate} on every Techwide campaign link. Keep it with RM1,000 in sales through Rezekii each month.", { rate: t(keyRow.v[1]) })
      : level === "gold"
        ? t("{rate} on every Techwide campaign link.", { rate: t(keyRow.v[2]) })
        : t("{rate} on every Techwide campaign link, and free samples. Reach Silver for {next}.", { rate: t(keyRow.v[0]), next: t(keyRow.v[1]) });
  // This month's TAP sales decide next month's level (levels change on the 1st).
  const monthSales = data.month?.sales ?? 0;
  const nextMonth = new Date(new Date().setDate(28) + 5 * 86400_000).toLocaleDateString(dateLocale(lang), { month: "short", timeZone: "Asia/Kuala_Lumpur" });
  const nextFirst = lang === "zh" ? `${nextMonth}1日` : `1 ${nextMonth}`;
  const salesLeft = Math.max(0, 1000 - monthSales);
  const videosLeft = Math.max(0, 10 - data.sampleVideos);
  const tip =
    salesLeft && videosLeft
      ? videosLeft === 1
        ? t("You're RM{s} and {v} sample video away.", { s: n(salesLeft), v: 1 })
        : t("You're RM{s} and {v} sample videos away.", { s: n(salesLeft), v: videosLeft })
      : salesLeft
        ? t("Your sample videos are done. RM{s} in sales through Rezekii this month to go.", { s: n(salesLeft) })
        : videosLeft
          ? videosLeft === 1
            ? t("Your sales are there. {v} sample video to go.", { v: 1 })
            : t("Your sales are there. {v} sample videos to go.", { v: videosLeft })
          : t("You qualify: Silver from {date}.", { date: nextFirst });
  const monthStart = new Date().toLocaleDateString(dateLocale(lang), { month: "short", timeZone: "Asia/Kuala_Lumpur" });
  const month = data.month;
  const tiles: [string, string, string][] = [
    [t("Sales this month"), month ? `RM${n(month.sales)}` : "—", t("{month} 1 – today", { month: monthStart })],
    [t("Orders"), "—", t("From campaign links")],
    [t("Videos posted"), month ? n(month.videos) : "—", month ? t("{n} for samples", { n: month.sampleVideos }) : t("From TikTok")],
    [t("Samples"), month ? n(month.delivered + month.shipping) : "—", month ? t("{a} delivered, {b} shipping", { a: month.delivered, b: month.shipping }) : t("From TikTok")],
  ];

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <section className="nv-up lv-hero" aria-labelledby="lvh" style={{ padding: 30, display: "flex", flexWrap: "wrap", gap: 34, alignItems: "center" }}>
          <div style={{ position: "relative", width: 190, height: 190, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, margin: "0 auto" }}>
            <span className="lv-rays" aria-hidden="true" />
            <span className="lv-glow" aria-hidden="true" />
            <button type="button" onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 950); }} aria-label={t("Spin the {level} emblem", { level: t(NAMES[level]) })} style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", perspective: 600 }}>
              <span className={`em-float ${spin ? "lv-spin" : ""}`} style={{ display: "inline-flex" }}><Emblem level={level} size={180} animate lang={lang} /></span>
            </button>
          </div>
          <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
            <span className="lv-chip"><span className="nv-dot" />{t("CURRENT LEVEL")}</span>
            <h2 id="lvh" style={{ margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>{t(NAMES[level])}</h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, opacity: 0.9 }}>{line}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {level !== "bronze" && <button type="button" className="nv-btn nv-press nv-cta" onClick={() => { setClosing(false); setOver(true); }} style={{ height: 48 }}>{t("Replay level-up")}</button>}
              <Link href="/app/rankings" className="nv-press" style={{ display: "inline-flex", alignItems: "center", height: 48, padding: "0 18px", borderRadius: 12, background: "rgba(255,255,255,0.12)", color: "#ffffff", textDecoration: "none", fontWeight: 700 }}>{t("See rankings")}</Link>
            </div>
          </div>
        </section>

        {level === "bronze" && (
          <section className="nv-up nv-card" aria-labelledby="lvp" style={{ animationDelay: "80ms", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <h2 id="lvp" className="nv-h2">{t("Your way to Silver")}</h2>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>{t("Both needed · Silver unlocks {rate}", { rate: t(keyRow.v[1]) })}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {[
                { label: t("Sales through Rezekii this month"), value: `RM${n(monthSales)} / 1,000`, note: t("Decides your level on {date}", { date: nextFirst }), frac: monthSales / 1000, color: "#00c073" },
                { label: t("Sample videos"), value: `${n(data.sampleVideos)} / 10`, note: t("Videos posted for samples you received"), frac: data.sampleVideos / 10, color: "#f2a93b" },
              ].map((g) => (
                <div key={g.label} style={{ display: "flex", gap: 18, alignItems: "center", padding: 18, borderRadius: 22, background: "var(--surface2)" }}>
                  <svg className="lv-ring" width="104" height="104" viewBox="0 0 104 104" aria-hidden="true" style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
                    <circle cx="52" cy="52" r="44" fill="none" stroke="var(--line)" strokeWidth="10" />
                    <circle cx="52" cy="52" r="44" fill="none" stroke={g.color} strokeWidth="10" strokeLinecap="round" strokeDasharray="276.5" strokeDashoffset={ring(g.frac)} />
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span className="nv-cap">{g.label}</span>
                    <span style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{g.value}</span>
                    <span style={{ fontSize: 14, color: "var(--muted)" }}>{g.note}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 16, background: "var(--gsoft)", color: "var(--gink)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 8v5M12 16h.01" /><circle cx="12" cy="12" r="9" /></svg>
              <span style={{ fontWeight: 700, lineHeight: 1.5 }}>{tip} {t("Creators who post within 7 days of receiving a sample reach Silver fastest.")}</span>
            </div>
          </section>
        )}

        <GetThereFaster bronze={level === "bronze"} sampleVideos={data.sampleVideos} />

        <section className="nv-up nv-card" aria-labelledby="lvl" style={{ animationDelay: "140ms", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 id="lvl" className="nv-h2">{t("The levels")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {(["bronze", "silver", "gold"] as Level[]).map((l, i) => {
              const cur = RANK[level] === i;
              const done = i < RANK[level];
              const state = cur ? t("You are here") : done ? t("Reached") : i === 2 ? t("Invite only") : t("Next");
              const badge = cur ? "b-green" : done ? "b-gray" : i === 2 ? "b-amber" : "b-blue";
              return (
                <div key={l} className="lv-step" style={{ animationDelay: `${i * 90}ms`, padding: 18, borderRadius: 22, border: `2px solid ${cur ? "#00c073" : "var(--border)"}`, background: cur ? "var(--gsoft)" : "var(--surface)", display: "flex", flexDirection: "column", gap: 10, position: "relative", opacity: i === 2 && !cur ? 0.85 : 1 }}>
                  <span className={`nv-badge ${badge}`} style={{ position: "absolute", top: 14, right: 14 }}>{state}</span>
                  <span className="em-float" style={{ display: "inline-flex", alignSelf: "flex-start" }}><Emblem level={l} size={78} animate lang={lang} /></span>
                  <strong style={{ fontSize: 19 }}>{t(NAMES[l])}</strong>
                  <span style={{ fontSize: 14, color: "var(--body)", lineHeight: 1.5 }}>{t(getRow.v[i])}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--gink)" }}>{t(keyRow.v[i])}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5, flex: "1 1 320px" }}>
              {t("Your level each month comes from the month before: RM1,000 in sales through Rezekii and videos posted for 10 samples give you Silver. Levels change on the 1st of every month.")}
            </p>
            <Link href="/app/levels/benefits" className="nv-btn3 nv-sm nv-press">{t("Compare all benefits")}</Link>
          </div>
        </section>

        <section className="nv-up nv-card" aria-labelledby="lvhist" style={{ animationDelay: "200ms", padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="lvhist" className="nv-h2">{t("This month")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {tiles.map(([label, value, note]) => (
              <div key={label} style={{ padding: 16, borderRadius: 18, background: "var(--surface2)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="nv-cap">{label}</span>
                <span style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{note}</span>
              </div>
            ))}
          </div>
          {!username && <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{t("Sign in with TikTok so your sales and sample videos count towards your level.")}</p>}
        </section>
      </div>

      {over && level !== "bronze" && (
        <div className={`lv-over ${closing ? "out" : ""}`} role="dialog" aria-modal="true" aria-labelledby="lvct">
          {Array.from({ length: 46 }, (_, i) => (
            <span key={i} className="lv-conf" aria-hidden="true" style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], ["--dx" as string]: `${((i * 53) % 160) - 80}px`, ["--rot" as string]: `${360 + ((i * 97) % 720)}deg`, ["--dur" as string]: `${(2.2 + (i % 7) * 0.25).toFixed(2)}s`, ["--delay" as string]: `${((i % 9) * 0.07).toFixed(2)}s` }} />
          ))}
          <div className="lv-card">
            <div style={{ position: "relative", width: 230, height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="lv-rays" aria-hidden="true" style={{ inset: -40 }} />
              <span className="lv-pring" aria-hidden="true" />
              <span className="em-pop" style={{ display: "inline-flex" }}><Emblem level={level} size={200} animate lang={lang} /></span>
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i / 14) * Math.PI * 2;
                return <span key={i} className="em-heart" aria-hidden="true" style={{ ["--hx" as string]: `${Math.round(Math.cos(a) * 150)}px`, ["--hy" as string]: `${Math.round(Math.sin(a) * 120 - 40)}px`, ["--hr" as string]: `${(i * 40) % 360}deg`, ["--hd" as string]: `${(0.5 + (i % 5) * 0.08).toFixed(2)}s` }}>{["💖", "✨", "⭐", "💜"][i % 4]}</span>;
              })}
            </div>
            <span className="lv-chip" style={{ animation: "lvRise .5s .6s both" }}>{t("LEVEL UP")}</span>
            <h3 id="lvct" style={{ margin: 0, fontSize: 36, fontWeight: 900, animation: "lvRise .5s .75s both" }}>{t("Congratulations, {name}!", { name: firstName })}</h3>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#d9dcf5", animation: "lvRise .5s .85s both" }}>{t("You're now {level}", { level: t(NAMES[level]) })} ✨</p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, opacity: 0.9, animation: "lvRise .5s .95s both" }}>
              {level === "gold" ? t("Techwide invited you to Gold. You earned every bit of this.") : t("RM1,000 in sales and 10 sample videos delivered. You earned every bit of this.")}
            </p>
            <p style={{ margin: 0, fontSize: 15, fontStyle: "italic", lineHeight: 1.55, color: "#f6e7ff", animation: "lvRise .5s 1.05s both" }}>“{t(BLESS[bless % BLESS.length])}”</p>
            <Link href="/app/levels/benefits" style={{ color: "#5fe3ab", fontWeight: 800, textDecoration: "none", animation: "lvRise .5s 1.05s both" }}>{t("See what {level} unlocks", { level: t(NAMES[level]) })}</Link>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, animation: "lvRise .5s 1.2s both" }}>
              <button type="button" className="nv-btn nv-press nv-cta" onClick={() => setShare(true)} style={{ height: 50, minWidth: 180 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" /></svg>
                {t("Share the good news")}
              </button>
              <button type="button" className="nv-press" onClick={closeOver} style={{ height: 50, padding: "0 18px", borderRadius: 12, border: 0, background: "rgba(255,255,255,0.14)", color: "#ffffff", fontWeight: 700 }}>{t("Keep going")}</button>
            </div>
          </div>
        </div>
      )}

      {share && <ShareSheet level={level} handle={handle} username={username} bless={bless} onBless={() => setBless(bless + 1)} onClose={() => setShare(false)} />}
    </>
  );
}
