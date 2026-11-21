import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Emblem } from "@/components/emblems";
import { getLang, tFor } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/lang";
import { publicLevel } from "@/modules/levels/store.ts";
import "../../public-card.css";

export const dynamic = "force-dynamic";
const NAMES = { bronze: tx("Bronze"), silver: tx("Silver"), gold: tx("Gold") };

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const [c, lang] = await Promise.all([params.then((p) => publicLevel(p.username)), getLang()]);
  const t = tFor(lang);
  return c ? { title: t("{handle} is {level} on Rezekii", { handle: c.handle, level: t(NAMES[c.level]) }), robots: { index: false } } : { title: "Rezekii" };
}

/**
 * The link creators share (rezekii.com/c/<TikTok username>, from the level card and the rate card): their level, never their
 * sales. As on rezekii.com.
 */
export default async function CreatorCard({ params }: { params: Promise<{ username: string }> }) {
  const [c, lang] = await Promise.all([params.then((p) => publicLevel(p.username)), getLang()]);
  if (!c) notFound();
  const t = tFor(lang);
  const level = t(NAMES[c.level]);
  return (
    <main className="pc-page">
      <div className="pc-card" role="img" aria-label={t("{handle} is {level} on Rezekii", { handle: c.handle, level })}>
        <span className="pc-chip">{t("✦ REZEKII CREATOR")}</span>
        <Emblem level={c.level} size={110} animate />
        <strong className="pc-name">{c.handle}</strong>
        <span className="pc-level">{t("{level} creator", { level })}</span>
        <span className="pc-quote">{t("Shares TikTok Shop finds through Rezekii.")}</span>
        <span className="pc-brands">
          <span className="pc-brand">
            <Image src="/master-logo-transparent.png" alt="" width={28} height={28} />
            <span><b>Rezekii</b><small>rezekii.com</small></span>
          </span>
          <Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={96} height={28} style={{ width: "auto", height: 28 }} />
        </span>
      </div>
      <Link href="/" className="np-btn pc-cta">{t("Earn with Rezekii")}</Link>
    </main>
  );
}
