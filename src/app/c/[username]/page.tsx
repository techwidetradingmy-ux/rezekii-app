import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { tx } from "@/lib/i18n/lang.ts";
import { publicLevel } from "@/modules/levels/store.ts";
import { Emblem } from "../../emblems";
import "../../app/marketplace/marketplace.css";
import "../../app/levels/levels.css";

export const dynamic = "force-dynamic";
const NAMES = { bronze: tx("Bronze"), silver: tx("Silver"), gold: tx("Gold") };

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const [c, lang] = await Promise.all([params.then((p) => publicLevel(p.username)), getLang()]);
  const t = tFor(lang);
  return c ? { title: t("{handle} is {level} on Rezekii", { handle: c.handle, level: t(NAMES[c.level]) }), robots: { index: false } } : { title: "Rezekii" };
}

/** The link creators share from the level-up screen: their level card, never their sales. */
export default async function CreatorCard({ params }: { params: Promise<{ username: string }> }) {
  const [c, lang] = await Promise.all([params.then((p) => publicLevel(p.username)), getLang()]);
  if (!c) notFound();
  const t = tFor(lang);
  const level = t(NAMES[c.level]);
  return (
    <main className="nv nv-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: "32px 16px" }}>
      <div className="lv-story" role="img" aria-label={t("{handle} is {level} on Rezekii", { handle: c.handle, level })} style={{ width: 300 }}>
        <span className="st-bub" aria-hidden="true" style={{ width: 90, height: 90, left: -24, top: 40, background: "radial-gradient(circle, rgba(179,107,214,.35), transparent 70%)" }} />
        <span className="st-bub" aria-hidden="true" style={{ width: 120, height: 120, right: -40, top: 180, background: "radial-gradient(circle, rgba(125,132,184,.35), transparent 70%)", animationDelay: "1.2s" }} />
        <span className="st-chip">{t("✦ REZEKII CREATOR")}</span>
        <span style={{ position: "relative", display: "inline-flex" }}><Emblem level={c.level} size={110} animate lang={lang} /></span>
        <strong className="st-name">{c.handle}</strong>
        <span className="st-lvl">{t("{level} creator", { level })}</span>
        <span className="st-quote">{t("Shares TikTok Shop finds through Rezekii.")}</span>
        <span className="st-cobrand">
          <span className="st-cb-side">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/master-logo-transparent.png" alt="" className="st-cb-logo" />
            <span className="st-cb-txt"><b>Rezekii</b><small>rezekii.com</small></span>
          </span>
          <span className="st-cb-side st-cb-tt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="st-cb-plogo" src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" />
          </span>
        </span>
      </div>
      <Link href="/" className="nv-btn nv-press nv-cta" style={{ height: 50, minWidth: 220 }}>{t("Earn with Rezekii")}</Link>
    </main>
  );
}
