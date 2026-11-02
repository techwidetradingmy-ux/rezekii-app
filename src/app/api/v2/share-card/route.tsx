import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { StyledCard, cardFonts, type CardData } from "./styles";

export const dynamic = "force-dynamic";

/** A Daily Story page's accent, by its tone. */
const STORY_ACCENT: Record<string, string> = { good: "#5ef0ae", heads: "#ffc46b", trend: "#25f4ee" };
const POSES = new Set(["wave", "dance", "viral", "found", "parcel", "money", "party", "posted", "sad", "worried", "detective", "sleep", "tehtarik", "cheeky", "love", "think"]);

/**
 * Her photo as a PNG (owner, 3 Nov 2026: saved photos are WebP, which the card maker can't draw, so the circle came out empty).
 * Null when it can't be read: the card then shows her initials.
 */
async function asPng(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const sharp = (await import("sharp")).default;
    const png = await sharp(Buffer.from(await res.arrayBuffer())).resize(240, 240, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * The share card as a real picture (owner, 1 Nov 2026): what "Share your proud moment" shows, made as a PNG so the phone's share
 * menu, Save image and the 5-second video all use the same file. Portrait 1080×1920 or landscape 1200×675. The QR and the link
 * are her own invite link on this site. `moment=invite` draws the invite ticket, `moment=story` a Daily Story page,
 * `moment=rate` her Rate Card (`line` = "name|price"), otherwise an achievement. One look for all (owner, 3 Nov 2026).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const wide = q.get("fmt") === "wide";
  const m = q.get("moment");
  const moment: CardData["moment"] = m === "invite" || m === "story" || m === "rate" ? m : "achievement";
  const clip = (v: string | null, n: number) => (v ?? "").slice(0, n);
  const origin = req.nextUrl.origin;
  const link = (q.get("link") ?? "").startsWith(origin) ? q.get("link")! : `${process.env.APP_URL ?? origin}`;
  const pose = POSES.has(q.get("pose") ?? "") ? q.get("pose")! : moment === "invite" ? "wave" : moment === "rate" ? null : "party";
  const d: CardData = {
    moment, kicker: clip(q.get("kicker"), 40), label: clip(q.get("label"), 80), big: clip(q.get("big"), 40), tag: clip(q.get("tag"), 60), sub: clip(q.get("sub"), 120),
    reward: clip(q.get("reward"), 6), code: clip(q.get("code"), 16), date: clip(q.get("date"), 40), bless: clip(q.get("bless"), 120),
    handle: clip(q.get("handle"), 40), name: clip(q.get("name"), 40),
    lines: q.getAll("line").slice(0, moment === "rate" ? 7 : 4).map((l) => l.slice(0, 70)), contacts: q.getAll("contact").slice(0, 2).map((c) => c.slice(0, 60)),
    link, qr: await QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#0d1117", light: "#ffffff" } }),
    photo: (q.get("photo") ?? "").startsWith("/api/img/") ? await asPng(`${origin}${q.get("photo")}`) : null,
    rimau: pose ? `${origin}/mascot/png/rimau-${pose}.png` : null, logo: `${origin}/master-logo-transparent.png`,
    accent: moment === "story" ? STORY_ACCENT[q.get("tone") ?? ""] ?? "#ffd34d" : undefined,
  };
  return new ImageResponse(<StyledCard d={d} wide={wide} />, { width: wide ? 1200 : 1080, height: wide ? 675 : 1920, fonts: await cardFonts(), headers: { "cache-control": "public, max-age=300" } });
}
