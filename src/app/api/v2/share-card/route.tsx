import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { StyledCard, cardFonts, type CardData } from "./styles";

export const dynamic = "force-dynamic";

/** The three card looks, as the share window shows them. */
const LOOKS = [
  { bg: "linear-gradient(160deg, #fff7fb 0%, #eefcf5 55%, #e8f0ff 100%)", ink: "#13241c", soft: "#5b6b63", accent: "#00a862", pill: "#ffffff", pillInk: "#0f5a3a" },
  { bg: "linear-gradient(160deg, #fffaf0 0%, #fff2d6 60%, #f7e3b5 100%)", ink: "#3b2a0a", soft: "#7a6440", accent: "#b8860b", pill: "#fffdf5", pillInk: "#6b4e0b" },
  { bg: "linear-gradient(160deg, #0b1f17 0%, #0f3a2a 55%, #1b1440 100%)", ink: "#f2fff8", soft: "#a9c9bb", accent: "#5ef0ae", pill: "rgba(255,255,255,0.12)", pillInk: "#e8fff3" },
];
/** A Daily Story page's own colours, by its tone. */
const STORY: Record<string, { bg: string; ink: string; soft: string; accent: string }> = {
  good: { bg: "linear-gradient(170deg, #062b1c 0%, #0b5a38 60%, #10834f 100%)", ink: "#f2fff8", soft: "#b8ead2", accent: "#5ef0ae" },
  heads: { bg: "linear-gradient(170deg, #2b1606 0%, #6b3a0c 60%, #a4570f 100%)", ink: "#fff7ec", soft: "#f5d6b0", accent: "#ffc46b" },
  trend: { bg: "linear-gradient(170deg, #12093a 0%, #3b2a8a 60%, #6d5efc 100%)", ink: "#f4f2ff", soft: "#cfc8ff", accent: "#25f4ee" },
  other: { bg: "linear-gradient(170deg, #0b1f17 0%, #123b2b 60%, #1f5a43 100%)", ink: "#f2fff8", soft: "#b8ead2", accent: "#ffd34d" },
};
const POSES = new Set(["wave", "dance", "viral", "found", "parcel", "money", "party", "posted", "sad", "worried", "detective", "sleep", "tehtarik", "cheeky", "love", "think"]);

/**
 * The share card as a real picture (owner, 1 Nov 2026): what "Share your proud moment" shows, made as a PNG so the phone's share
 * menu, Save image and the 5-second video all use the same file. Portrait 1080×1920 or landscape 1200×675. The QR and the link
 * are her own invite link on this site. `moment=invite` draws the invite ticket with Rimau; `moment=story` a Daily Story page.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const wide = q.get("fmt") === "wide";
  const moment = q.get("moment");
  const clip = (v: string | null, n: number) => (v ?? "").slice(0, n);
  const kicker = clip(q.get("kicker"), 40), label = clip(q.get("label"), 80), big = clip(q.get("big"), 40), bless = clip(q.get("bless"), 120);
  const handle = clip(q.get("handle"), 40), name = clip(q.get("name"), 40), sub = clip(q.get("sub"), 120), tag = clip(q.get("tag"), 60);
  const lines = q.getAll("line").slice(0, 4).map((l) => l.slice(0, 70));
  const origin = req.nextUrl.origin;
  const link = (q.get("link") ?? "").startsWith(origin) ? q.get("link")! : `${process.env.APP_URL ?? origin}`;
  const photo = (q.get("photo") ?? "").startsWith("/api/img/") ? `${origin}${q.get("photo")}` : null;
  const pose = POSES.has(q.get("pose") ?? "") ? q.get("pose") : moment === "invite" ? "wave" : null;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#0d1117", light: "#ffffff" } });
  const W = wide ? 1200 : 1080, H = wide ? 675 : 1920;
  const s = wide ? 0.62 : 1;
  const initials = (name || handle.replace("@", "")).slice(0, 2).toUpperCase();
  const story = moment === "story" ? STORY[q.get("tone") ?? ""] ?? STORY.other : null;
  const look = story ? { ...LOOKS[2], ...story, pill: "rgba(255,255,255,0.12)", pillInk: story.ink } : LOOKS[Math.min(2, Math.max(0, Number(q.get("design")) || 0))];

  // The three new looks for the owner to pick from (owner, 2 Nov 2026), asked for with `style`.
  const style = q.get("style");
  if (!wide && (style === "a" || style === "b" || style === "c")) {
    const d: CardData = {
      moment: moment === "invite" ? "invite" : moment === "story" ? "story" : "achievement",
      kicker, label, big, tag, sub, lines, handle, name, link, qr, photo, reward: clip(q.get("reward"), 6), code: clip(q.get("code"), 16), date: clip(q.get("date"), 40),
      rimau: `${origin}/mascot/png/rimau-${pose ?? (moment === "invite" ? "wave" : "party")}.png`, logo: `${origin}/master-logo-transparent.png`,
    };
    return new ImageResponse(<StyledCard style={style} d={d} />, { width: 1080, height: 1920, fonts: await cardFonts(), headers: { "cache-control": "public, max-age=300" } });
  }

  const head = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * s }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${origin}/master-logo-transparent.png`} width={84 * s} height={84 * s} alt="" style={{ borderRadius: 20 * s }} />
        <span style={{ fontSize: 52 * s, fontWeight: 800 }}>Rezekii</span>
      </div>
      <span style={{ display: "flex", fontSize: 30 * s, fontWeight: 700, color: look.soft }}>{story ? clip(q.get("date"), 40) : "TikTok Shop Partner"}</span>
    </div>
  );
  const foot = (
    <div style={{ display: "flex", alignItems: "center", gap: 28 * s, padding: 28 * s, borderRadius: 36 * s, background: look.pill }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} width={120 * s} height={120 * s} alt="" style={{ borderRadius: 999, objectFit: "cover" }} />
      ) : (
        <span style={{ display: "flex", width: 120 * s, height: 120 * s, borderRadius: 999, alignItems: "center", justifyContent: "center", background: look.accent, color: "#ffffff", fontSize: 48 * s, fontWeight: 800 }}>{initials}</span>
      )}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 6 * s }}>
        <span style={{ display: "flex", fontSize: 44 * s, fontWeight: 800, color: look.pillInk }}>{handle || name}</span>
        <span style={{ display: "flex", fontSize: 32 * s, fontWeight: 600, color: look.soft }}>Join me on Rezekii · {link.replace(/^https?:\/\//, "")}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={180 * s} height={180 * s} alt="" style={{ borderRadius: 16 * s }} />
    </div>
  );
  const rimau = pose ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${origin}/mascot/png/rimau-${pose}.png`} width={(wide ? 220 : 360) * (moment === "invite" ? 1 : 0.9)} height={(wide ? 268 : 440) * (moment === "invite" ? 1 : 0.9)} alt="" />
  ) : null;

  // The middle of the card: the invite ticket, a Daily Story page, or an achievement.
  const middle = moment === "invite" ? (
    <div style={{ display: "flex", flex: 1, flexDirection: wide ? "row" : "column", alignItems: wide ? "center" : "flex-start", justifyContent: "center", gap: 36 * s }}>
      {rimau}
      <div style={{ display: "flex", flexDirection: "column", gap: 26 * s }}>
        <span style={{ display: "flex", fontSize: 34 * s, fontWeight: 800, letterSpacing: 4 * s, textTransform: "uppercase", color: look.accent }}>{kicker || "You're invited"}</span>
        <span style={{ display: "flex", fontSize: 96 * s, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 * s }}>{big}</span>
        {tag && <span style={{ display: "flex", fontSize: 38 * s, fontWeight: 600, color: look.soft }}>{tag}</span>}
        <div style={{ display: "flex", alignSelf: "flex-start", borderRadius: 32 * s, overflow: "hidden", border: `${3 * s}px dashed ${look.accent}` }}>
          <div style={{ display: "flex", flexDirection: "column", padding: `${28 * s}px ${36 * s}px`, background: look.accent, color: "#ffffff" }}>
            <span style={{ display: "flex", fontSize: 76 * s, fontWeight: 900 }}>+{clip(q.get("reward"), 6)}</span>
            <span style={{ display: "flex", fontSize: 30 * s, fontWeight: 700 }}>credits for you</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: `${28 * s}px ${36 * s}px`, background: look.pill }}>
            <span style={{ display: "flex", fontSize: 28 * s, fontWeight: 700, color: look.soft, textTransform: "uppercase", letterSpacing: 3 * s }}>Code</span>
            <span style={{ display: "flex", fontSize: 64 * s, fontWeight: 900, color: look.pillInk, letterSpacing: 2 * s }}>{clip(q.get("code"), 16)}</span>
          </div>
        </div>
      </div>
    </div>
  ) : story ? (
    <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 24 * s }}>
      {rimau}
      <span style={{ display: "flex", fontSize: 34 * s, fontWeight: 800, letterSpacing: 4 * s, textTransform: "uppercase", color: look.accent }}>{kicker}</span>
      {big && <span style={{ display: "flex", fontSize: 140 * s, fontWeight: 900, lineHeight: 1, letterSpacing: -4 * s }}>{big}</span>}
      <span style={{ display: "flex", fontSize: 56 * s, fontWeight: 800, lineHeight: 1.15 }}>{label}</span>
      {sub && <span style={{ display: "flex", fontSize: 38 * s, fontWeight: 600, lineHeight: 1.3, color: look.soft }}>{sub}</span>}
      {lines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * s }}>
          {lines.map((l) => <span key={l} style={{ display: "flex", padding: `${12 * s}px ${22 * s}px`, borderRadius: 20 * s, background: look.pill, color: look.ink, fontSize: 32 * s, fontWeight: 700 }}>{l}</span>)}
        </div>
      )}
    </div>
  ) : (
    <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", gap: 28 * s }}>
      <span style={{ display: "flex", fontSize: 34 * s, fontWeight: 800, letterSpacing: 4 * s, textTransform: "uppercase", color: look.accent }}>{kicker}</span>
      <span style={{ display: "flex", fontSize: 58 * s, fontWeight: 700, lineHeight: 1.15 }}>{label}</span>
      <span style={{ display: "flex", fontSize: 168 * s, fontWeight: 900, lineHeight: 1, letterSpacing: -4 * s }}>{big}</span>
      {lines.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 * s }}>
          {lines.map((l) => <span key={l} style={{ display: "flex", padding: `${12 * s}px ${26 * s}px`, borderRadius: 999, background: look.pill, color: look.pillInk, fontSize: 34 * s, fontWeight: 800 }}>{l}</span>)}
        </div>
      )}
      {!wide && bless && <span style={{ display: "flex", marginTop: 40, fontSize: 40, fontStyle: "italic", lineHeight: 1.35, color: look.soft }}>&ldquo;{bless}&rdquo;</span>}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: look.bg, color: look.ink, padding: 72 * s, fontFamily: "sans-serif" }}>
        {head}
        {middle}
        {foot}
      </div>
    ),
    { width: W, height: H, headers: { "cache-control": "public, max-age=300" } },
  );
}
