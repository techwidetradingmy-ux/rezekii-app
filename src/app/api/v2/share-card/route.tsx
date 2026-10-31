import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/** The three card looks, as the share window shows them. */
const LOOKS = [
  { bg: "linear-gradient(160deg, #fff7fb 0%, #eefcf5 55%, #e8f0ff 100%)", ink: "#13241c", soft: "#5b6b63", accent: "#00a862", pill: "#ffffff", pillInk: "#0f5a3a" },
  { bg: "linear-gradient(160deg, #fffaf0 0%, #fff2d6 60%, #f7e3b5 100%)", ink: "#3b2a0a", soft: "#7a6440", accent: "#b8860b", pill: "#fffdf5", pillInk: "#6b4e0b" },
  { bg: "linear-gradient(160deg, #0b1f17 0%, #0f3a2a 55%, #1b1440 100%)", ink: "#f2fff8", soft: "#a9c9bb", accent: "#5ef0ae", pill: "rgba(255,255,255,0.12)", pillInk: "#e8fff3" },
];

/**
 * The share card as a real picture (owner, 1 Nov 2026): what "Share your proud moment" shows, made as a PNG so the phone's share
 * menu, Save image and the 5-second video all use the same file. Portrait 1080×1920 or landscape 1200×675. The QR and the link
 * are her own invite link on this site.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const wide = q.get("fmt") === "wide";
  const look = LOOKS[Math.min(2, Math.max(0, Number(q.get("design")) || 0))];
  const clip = (v: string | null, n: number) => (v ?? "").slice(0, n);
  const kicker = clip(q.get("kicker"), 40), label = clip(q.get("label"), 60), big = clip(q.get("big"), 30), bless = clip(q.get("bless"), 120);
  const handle = clip(q.get("handle"), 40), name = clip(q.get("name"), 40);
  const lines = q.getAll("line").slice(0, 3).map((l) => l.slice(0, 40));
  const origin = req.nextUrl.origin;
  const link = (q.get("link") ?? "").startsWith(origin) ? q.get("link")! : `${process.env.APP_URL ?? origin}`;
  const photo = (q.get("photo") ?? "").startsWith("/api/img/") ? `${origin}${q.get("photo")}` : null;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#0d1117", light: "#ffffff" } });
  const W = wide ? 1200 : 1080, H = wide ? 675 : 1920;
  const s = wide ? 0.62 : 1;
  const initials = (name || handle.replace("@", "")).slice(0, 2).toUpperCase();

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: look.bg, color: look.ink, padding: 72 * s, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 * s }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${origin}/master-logo-transparent.png`} width={84 * s} height={84 * s} alt="" style={{ borderRadius: 20 * s }} />
            <span style={{ fontSize: 52 * s, fontWeight: 800 }}>Rezekii</span>
          </div>
          <span style={{ display: "flex", fontSize: 30 * s, fontWeight: 700, color: look.soft }}>TikTok Shop Partner</span>
        </div>

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
      </div>
    ),
    { width: W, height: H, headers: { "cache-control": "public, max-age=300" } },
  );
}
