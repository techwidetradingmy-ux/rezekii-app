import "./tts-ring.css";

/** TikTok Shop creator level icons, Lv0-8, redrawn from TikTok Shop's own (owner's screenshots, 14 Oct 2026). Static markup we own. */
const spiky = (fill: string) => `<polygon points="12,1 14.6,5.7 20,4 18.3,9.4 23,12 18.3,14.6 20,20 14.6,18.3 12,23 9.4,18.3 4,20 5.7,14.6 1,12 5.7,9.4 4,4 9.4,5.7" fill="${fill}"/>`;
const crown = (fill: string, gem: string) =>
  `<path d="M3 18 L2 7 L7.5 11 L12 4 L16.5 11 L22 7 L21 18 Z" fill="${fill}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/><rect x="3" y="18" width="18" height="3" rx="1" fill="${fill}"/><circle cx="12" cy="14" r="2.6" fill="${gem}"/>`;
const ICON = [
  '<circle cx="12" cy="12" r="9.5" fill="#8e8e93"/><circle cx="12" cy="12" r="4.5" fill="#3a3a3c"/><circle cx="12" cy="12" r="2" fill="#c7c7cc"/>',
  '<circle cx="12" cy="12" r="9.5" fill="#ffffff" stroke="#c7c7cc" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="#e5e5ea"/>',
  '<polygon points="12,1.5 22.5,12 12,22.5 1.5,12" fill="#f5c242" stroke="#b8860b" stroke-width=".8"/><polygon points="12,7 17,12 12,17 7,12" fill="#d4f06b"/>',
  '<polygon points="12,1.5 22,8.5 18.5,21 5.5,21 2,8.5" fill="#cfd8dc" stroke="#78909c" stroke-width=".8"/><polygon points="12,6 13.6,10.2 18,10.4 14.6,13.1 15.8,17.4 12,14.9 8.2,17.4 9.4,13.1 6,10.4 10.4,10.2" fill="#f5f7f8"/><rect x="9" y="20" width="6" height="3" rx="1" fill="#26a69a"/>',
  spiky("#cfd8dc") + '<polygon points="12,7 16.3,9.5 16.3,14.5 12,17 7.7,14.5 7.7,9.5" fill="#29b6f6" stroke="#0277bd" stroke-width=".6"/><path d="M9 21 L12 18 L15 21 Z" fill="#ff4d8d"/>',
  spiky("#b0bec5") + '<circle cx="12" cy="12" r="4.6" fill="#26c281" stroke="#0b7a4b" stroke-width=".6"/><circle cx="10.6" cy="10.6" r="1.2" fill="#c8f7dd"/>',
  crown("#26a69a", "#ff4d8d") + '<path d="M9 23 L12 20 L15 23 Z" fill="#ff4d8d"/>',
  crown("#ffb300", "#e53935") + '<circle cx="12" cy="4" r="1.4" fill="#ffe082"/>',
  crown("#ffc107", "#18181c") +
    '<path d="M12.8 11 v3.6 a1.6 1.6 0 1 1 -1.2 -1.55 V11 h1.2 c0 .8 .7 1.4 1.5 1.4 v1.1 c-.6 0 -1.1 -.2 -1.5 -.5" fill="#ffffff" stroke="#fe2c55" stroke-width=".35"/><path d="M20 2 l.6 1.6 1.6 .6 -1.6 .6 -.6 1.6 -.6 -1.6 -1.6 -.6 1.6 -.6 Z" fill="#fff59d"/>',
];
const RING = [
  "#8e8e93",
  "linear-gradient(135deg,#ffffff,#c7c7cc)",
  "linear-gradient(135deg,#ffe082,#f5c242,#b8860b)",
  "linear-gradient(135deg,#eceff1,#90a4ae)",
  "linear-gradient(135deg,#cfd8dc,#29b6f6)",
  "linear-gradient(135deg,#cfd8dc,#26c281)",
  "linear-gradient(135deg,#26a69a,#ff4d8d)",
  "linear-gradient(135deg,#ffe082,#ffb300,#ff6f00)",
  "#ffc107",
];
const COL = ["#7c3aed", "#e8005a", "#0e7490", "#f2a93b", "#1d4ed8", "#00874f", "#b45309", "#9333ea", "#be123c", "#0f766e"];

/** A TikTok Shop level icon on its own. */
export function LevelIcon({ lv, size = 14 }: { lv: number; size?: number }) {
  return <svg className="tr-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON[lv] ?? ICON[0] }} />;
}

/**
 * A profile photo with its TikTok Shop creator level (owner's pick C, 14 Oct 2026): a ring in the level's colours that shines from
 * Lv2, glows at Lv7 and spins in TikTok's colours with sparkles at Lv8, and the level icon underneath. No level: a plain photo.
 */
export function LevelFace({ lv, size, img, name, badge = true }: { lv: number | null | undefined; size: number; img?: string | null; name: string; badge?: boolean }) {
  const letter = (name.replace(/^[^a-z0-9]+/i, "")[0] ?? "?").toUpperCase();
  const color = COL[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COL.length];
  const has = typeof lv === "number" && lv >= 0 && lv <= 8;
  const inner = (
    <span className="tr-in" style={{ background: color, fontSize: Math.round(size * 0.4) }}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        letter
      )}
    </span>
  );
  if (!has) return <span className="tr-face" style={{ width: size, height: size }}>{inner}</span>;
  return (
    <span className="tr-face" style={{ width: size, height: size }} role="img" aria-label={`TikTok Shop level ${lv}`}>
      <span className={`tr-ring ${lv === 8 ? "tr-tt" : lv === 7 ? "tr-glow" : ""}`} style={{ background: RING[lv] }} aria-hidden="true" />
      {inner}
      {lv >= 2 && <span className="tr-shine" aria-hidden="true" />}
      {lv === 8 && (
        <>
          <span className="tr-spark" style={{ top: "-4%", right: "8%" }} aria-hidden="true" />
          <span className="tr-spark" style={{ bottom: "18%", left: "-6%", animationDelay: "0.8s" }} aria-hidden="true" />
        </>
      )}
      {badge && (
        <span className="tr-badge" aria-hidden="true" style={size < 40 ? { fontSize: 9, bottom: -8 } : undefined}>
          <LevelIcon lv={lv} size={size < 40 ? 11 : 13} />
          Lv{lv}
        </span>
      )}
    </span>
  );
}
