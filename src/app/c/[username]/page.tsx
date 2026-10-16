import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicLevel } from "@/modules/levels/store.ts";
import { Emblem } from "../../emblems";
import "../../app/marketplace/marketplace.css";
import "../../app/levels/levels.css";

export const dynamic = "force-dynamic";
const NAMES = { bronze: "Bronze", silver: "Silver", gold: "Gold" } as const;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const c = await publicLevel((await params).username);
  return c ? { title: `${c.handle} is ${NAMES[c.level]} on Rezekii`, robots: { index: false } } : { title: "Rezekii" };
}

/** The link creators share from the level-up screen: their level card, never their sales. */
export default async function CreatorCard({ params }: { params: Promise<{ username: string }> }) {
  const c = await publicLevel((await params).username);
  if (!c) notFound();
  return (
    <main className="nv nv-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: "32px 16px" }}>
      <div className="lv-story" role="img" aria-label={`${c.handle} is ${NAMES[c.level]} on Rezekii`} style={{ width: 300 }}>
        <span className="st-bub" aria-hidden="true" style={{ width: 90, height: 90, left: -24, top: 40, background: "radial-gradient(circle, rgba(179,107,214,.35), transparent 70%)" }} />
        <span className="st-bub" aria-hidden="true" style={{ width: 120, height: 120, right: -40, top: 180, background: "radial-gradient(circle, rgba(125,132,184,.35), transparent 70%)", animationDelay: "1.2s" }} />
        <span className="st-chip">✦ REZEKII CREATOR</span>
        <span style={{ position: "relative", display: "inline-flex" }}><Emblem level={c.level} size={110} animate /></span>
        <strong className="st-name">{c.handle}</strong>
        <span className="st-lvl">{NAMES[c.level]} creator</span>
        <span className="st-quote">Shares TikTok Shop finds through Rezekii.</span>
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
      <Link href="/" className="nv-btn nv-press nv-cta" style={{ height: 50, minWidth: 220 }}>Earn with Rezekii</Link>
    </main>
  );
}
