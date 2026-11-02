/**
 * The share card (owner, 3 Nov 2026: picked "Night Glow" from three looks, with less empty space and a code that's easy to
 * read): near-black with green and blue light, Rimau in a glow, everything centred, in Rezekii's own font, Albert Sans.
 * Portrait 1080×1920 or wide 1200×675. Moments: an invite (ticket with her code), a Daily Story page, an achievement, and her
 * Rate Card (packages and prices).
 */
export type CardData = {
  moment: "invite" | "story" | "achievement" | "rate";
  kicker: string; label: string; big: string; tag: string; sub: string; reward: string; code: string; date: string; bless: string;
  handle: string; name: string; lines: string[]; contacts: string[]; link: string; qr: string; photo: string | null; rimau: string | null; logo: string;
  /** A Daily Story page's own accent (green for good news, amber for a heads-up…). */
  accent?: string;
};

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 600 | 800 | 900; style: "normal" }[]> | null = null;
/** Albert Sans from Google Fonts (TrueType, which the card maker reads), loaded once per server. */
export function cardFonts() {
  fonts ??= (async () => {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Albert+Sans:wght@600;800;900")).text();
    const faces = [...css.matchAll(/font-weight: (\d+);[\s\S]*?url\((https:[^)]+\.ttf)\)/g)];
    return Promise.all(faces.map(async ([, w, url]) => ({ name: "Albert Sans", data: await (await fetch(url)).arrayBuffer(), weight: Number(w) as 600 | 800 | 900, style: "normal" as const })));
  })().catch((err) => {
    fonts = null;
    throw err;
  });
  return fonts;
}

const INK = "#ffffff", SOFT = "#b4dccb", GREEN = "#00c073", GLOW = "#5ef0ae", GLASS = "rgba(255,255,255,0.10)";
const BG = "#06120d";
const LIGHTS = "radial-gradient(circle at 85% 12%, rgba(37,200,244,0.32), transparent 40%), radial-gradient(circle at 12% 70%, rgba(0,192,115,0.38), transparent 46%)";
const row = { display: "flex" } as const;
const col = { display: "flex", flexDirection: "column" } as const;

function Face({ d, size }: { d: CardData; size: number }) {
  const initials = (d.name || d.handle.replace("@", "")).slice(0, 2).toUpperCase();
  return d.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={d.photo} width={size} height={size} alt="" style={{ borderRadius: 999, objectFit: "cover", border: `5px solid ${GLOW}` }} />
  ) : (
    <span style={{ ...row, width: size, height: size, borderRadius: 999, alignItems: "center", justifyContent: "center", background: GREEN, color: INK, fontSize: size * 0.4, fontWeight: 900, border: `5px solid ${GLOW}` }}>{initials}</span>
  );
}

function Brand({ d, s }: { d: CardData; s: number }) {
  return (
    <div style={{ ...row, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ ...row, alignItems: "center", gap: 16 * s }}>
        <span style={{ ...row, width: 92 * s, height: 92 * s, borderRadius: 26 * s, background: INK, alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.logo} width={76 * s} height={76 * s} alt="" />
        </span>
        <span style={{ ...row, fontSize: 54 * s, fontWeight: 900, color: INK, letterSpacing: -1 }}>Rezekii</span>
      </div>
      <span style={{ ...row, fontSize: 28 * s, fontWeight: 800, color: SOFT }}>{d.moment === "story" && d.date ? d.date : "TikTok Shop Partner"}</span>
    </div>
  );
}

function Footer({ d, s }: { d: CardData; s: number }) {
  return (
    <div style={{ ...row, alignItems: "center", gap: 26 * s, padding: 28 * s, borderRadius: 40 * s, background: GLASS, border: "2px solid rgba(255,255,255,0.10)" }}>
      <Face d={d} size={116 * s} />
      <div style={{ ...col, flex: 1, gap: 4 * s }}>
        <span style={{ ...row, fontSize: 42 * s, fontWeight: 900, color: INK }}>{d.handle || d.name}</span>
        <span style={{ ...row, fontSize: 29 * s, fontWeight: 600, color: SOFT }}>Scan to join me on Rezekii</span>
        <span style={{ ...row, fontSize: 27 * s, fontWeight: 800, color: GLOW }}>{d.link.replace(/^https?:\/\//, "")}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d.qr} width={180 * s} height={180 * s} alt="" style={{ borderRadius: 20 * s, background: INK, padding: 8 * s }} />
    </div>
  );
}

/** The invite's ticket: a solid green half with her credits and a white half with her code in dark ink, easy to read. */
function Ticket({ d, s }: { d: CardData; s: number }) {
  return (
    <div style={{ ...row, borderRadius: 36 * s, overflow: "hidden", boxShadow: "0 24px 60px -20px rgba(0,192,115,0.55)" }}>
      <div style={{ ...col, padding: `${30 * s}px ${38 * s}px`, background: GREEN, color: INK, justifyContent: "center" }}>
        <span style={{ ...row, fontSize: 92 * s, fontWeight: 900, lineHeight: 1 }}>+{d.reward || "50"}</span>
        <span style={{ ...row, fontSize: 29 * s, fontWeight: 800 }}>credits for you</span>
      </div>
      <div style={{ ...col, flex: 1, padding: `${30 * s}px ${38 * s}px`, background: INK, justifyContent: "center", borderLeft: `6px dashed ${GREEN}` }}>
        <span style={{ ...row, fontSize: 27 * s, fontWeight: 800, color: "#4f6259", letterSpacing: 4, textTransform: "uppercase" }}>Invite code</span>
        <span style={{ ...row, fontSize: 80 * s, fontWeight: 900, color: "#06120d", letterSpacing: 3 }}>{d.code}</span>
      </div>
    </div>
  );
}

/** Her Rate Card: packages and prices as rows, then how to reach her. */
function Rates({ d, s }: { d: CardData; s: number }) {
  return (
    <div style={{ ...col, gap: 14 * s, width: "100%" }}>
      {d.lines.map((l) => {
        const [name, price] = l.split("|");
        return (
          <div key={l} style={{ ...row, alignItems: "center", justifyContent: "space-between", gap: 20 * s, padding: `${22 * s}px ${30 * s}px`, borderRadius: 28 * s, background: GLASS, border: "2px solid rgba(255,255,255,0.10)" }}>
            <span style={{ ...row, flex: 1, fontSize: 36 * s, fontWeight: 800, color: INK }}>{name}</span>
            <span style={{ ...row, fontSize: 40 * s, fontWeight: 900, color: GLOW }}>{price}</span>
          </div>
        );
      })}
      {d.contacts.length > 0 && <div style={{ ...row, flexWrap: "wrap", gap: 12 * s, justifyContent: "center" }}>{d.contacts.map((c) => <span key={c} style={{ ...row, padding: `${12 * s}px ${24 * s}px`, borderRadius: 999, background: INK, color: BG, fontSize: 30 * s, fontWeight: 800 }}>{c}</span>)}</div>}
      {d.sub && <span style={{ ...row, justifyContent: "center", fontSize: 28 * s, fontWeight: 600, color: SOFT }}>{d.sub}</span>}
    </div>
  );
}

/** Kicker, the big number or title, the line under it, chips and the blessing, centred. */
function Words({ d, s, center }: { d: CardData; s: number; center: boolean }) {
  const invite = d.moment === "invite", rate = d.moment === "rate";
  const accent = d.accent ?? GLOW;
  const big = invite ? d.big || "Join me on Rezekii" : rate ? d.handle : d.big;
  const align = center ? "center" : "flex-start";
  return (
    <div style={{ ...col, alignItems: align, gap: 20 * s, textAlign: center ? "center" : "left" }}>
      <span style={{ ...row, padding: `${10 * s}px ${24 * s}px`, borderRadius: 999, background: "rgba(94,240,174,0.14)", color: accent, fontSize: 30 * s, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>{d.kicker || (invite ? "You're invited" : rate ? "Rate Card" : "Proud moment")}</span>
      {!invite && !rate && d.label && <span style={{ ...row, fontSize: 50 * s, fontWeight: 800, color: INK, lineHeight: 1.15, justifyContent: align }}>{d.label}</span>}
      {big && <span style={{ ...row, fontSize: (invite || rate ? 100 : 196) * s, fontWeight: 900, color: INK, lineHeight: 1, letterSpacing: -3, justifyContent: align, textShadow: `0 0 ${40 * s}px rgba(94,240,174,0.35)` }}>{big}</span>}
      {(invite ? d.tag : rate ? d.label : d.sub) && <span style={{ ...row, fontSize: 36 * s, fontWeight: 600, color: SOFT, lineHeight: 1.3, justifyContent: align }}>{invite ? d.tag : rate ? d.label : d.sub}</span>}
      {!rate && d.lines.length > 0 && <div style={{ ...row, flexWrap: "wrap", gap: 14 * s, justifyContent: align }}>{d.lines.map((l) => <span key={l} style={{ ...row, padding: `${14 * s}px ${26 * s}px`, borderRadius: 999, background: GLASS, color: INK, fontSize: 32 * s, fontWeight: 800 }}>{l}</span>)}</div>}
      {d.moment === "achievement" && d.bless && <span style={{ ...row, fontSize: 32 * s, fontWeight: 600, color: SOFT, lineHeight: 1.35, justifyContent: align }}>&ldquo;{d.bless}&rdquo;</span>}
    </div>
  );
}

function Rimau({ d, size }: { d: CardData; size: number }) {
  if (!d.rimau) return null;
  return (
    <div style={{ ...row, alignItems: "center", justifyContent: "center", width: size * 1.25, height: size * 1.25, borderRadius: 999, background: "radial-gradient(circle, rgba(94,240,174,0.30), rgba(94,240,174,0) 68%)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d.rimau} width={size} height={size * 1.22} alt="" />
    </div>
  );
}

export function StyledCard({ d, wide = false }: { d: CardData; wide?: boolean }) {
  if (wide) {
    const s = 0.6;
    return (
      <div style={{ ...col, width: 1200, height: 675, padding: 44, gap: 22, background: BG, backgroundImage: LIGHTS, fontFamily: "Albert Sans" }}>
        <Brand d={d} s={s} />
        <div style={{ ...row, flex: 1, alignItems: "center", gap: 36 }}>
          {d.moment !== "rate" && <Rimau d={d} size={230} />}
          <div style={{ ...col, flex: 1, gap: 18 }}>
            <Words d={d} s={s} center={false} />
            {d.moment === "invite" && <Ticket d={d} s={s} />}
            {d.moment === "rate" && <Rates d={d} s={s} />}
          </div>
        </div>
        <Footer d={d} s={0.55} />
      </div>
    );
  }
  return (
    <div style={{ ...col, width: 1080, height: 1920, padding: 72, gap: 34, background: BG, backgroundImage: LIGHTS, fontFamily: "Albert Sans" }}>
      <Brand d={d} s={1} />
      <div style={{ ...col, flex: 1, alignItems: "center", justifyContent: "center", gap: 28 }}>
        {d.moment === "rate" ? <Face d={d} size={200} /> : <Rimau d={d} size={d.moment === "invite" ? 400 : 430} />}
        <Words d={d} s={1} center />
        {d.moment === "rate" && <Rates d={d} s={1} />}
      </div>
      {d.moment === "invite" && <Ticket d={d} s={1} />}
      <Footer d={d} s={1} />
    </div>
  );
}
