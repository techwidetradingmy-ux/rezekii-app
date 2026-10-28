"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { AiMark } from "@/components/ui";
import { ScanHub } from "@/components/creator1/scan-hub";
import { ShootToday } from "@/components/creator1/shoot-today";
import { AI_PICKS, CREATOR, product } from "@/lib/mock";
import "@/app/creator1.css";

/** Creator home: the showcase scanner with every result, and a door to AI picks. Reminders live in Notifications and My account. */
export default function CreatorHome() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>Good morning, {CREATOR.first}</h1>
        <p className="v2-muted" style={{ margin: "4px 0 0" }}>{CREATOR.activatedThisMonth} better rates active this month. Here&apos;s what we found today.</p>
      </div>
      <ShootToday />
      <ScanHub />
      <Link href="/app/ai-picks" className="v2-aicard ai-teaser">
        <AiMark size={44} />
        <span>
          <span className="v2-ailabel">AI picks for you</span>
          <b>{AI_PICKS.length} products matched to your account</b>
          <small>{AI_PICKS.filter((p) => p.fit === "video").length} best for video · {AI_PICKS.filter((p) => p.fit === "live").length} best for LIVE</small>
        </span>
        <span className="sh-thumbs" aria-hidden="true">
          {AI_PICKS.slice(0, 4).map((pk) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={pk.productId} src={product(pk.productId).img} alt="" />
          ))}
        </span>
        <Icon name="arrow" size={18} />
      </Link>
    </div>
  );
}
