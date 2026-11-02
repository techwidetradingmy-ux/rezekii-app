/**
 * Three new looks for the share card (owner, 2 Nov 2026: "the sharing card is not well designed"), for the owner to pick one:
 * A Bold Ticket (Rezekii green, white ticket), B Night Glow (dark with a green glow), C Poster (a big colour block over a white
 * panel). All in Rezekii's own font, Albert Sans, with its logo and Rimau. Portrait 1080×1920.
 */
export type CardData = {
  moment: "invite" | "story" | "achievement";
  kicker: string; label: string; big: string; tag: string; sub: string; reward: string; code: string; date: string;
  handle: string; name: string; lines: string[]; link: string; qr: string; photo: string | null; rimau: string | null; logo: string;
};
export type Style = "a" | "b" | "c";

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

const T = { green: "#00c073", deep: "#00874f", teal: "#25c8f4", ink: "#0d1f17", gold: "#ffc700" };
const row = { display: "flex" } as const;
const col = { display: "flex", flexDirection: "column" } as const;

/** Her photo, or her initials in a circle. */
function Face({ d, size, ring }: { d: CardData; size: number; ring: string }) {
  const initials = (d.name || d.handle.replace("@", "")).slice(0, 2).toUpperCase();
  return d.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={d.photo} width={size} height={size} alt="" style={{ borderRadius: 999, objectFit: "cover", border: `6px solid ${ring}` }} />
  ) : (
    <span style={{ ...row, width: size, height: size, borderRadius: 999, alignItems: "center", justifyContent: "center", background: T.green, color: "#fff", fontSize: size * 0.4, fontWeight: 900, border: `6px solid ${ring}` }}>{initials}</span>
  );
}

/** Who shares it, her link and the QR. */
function Footer({ d, bg, ink, soft, ring }: { d: CardData; bg: string; ink: string; soft: string; ring: string }) {
  return (
    <div style={{ ...row, alignItems: "center", gap: 28, padding: 30, borderRadius: 44, background: bg }}>
      <Face d={d} size={124} ring={ring} />
      <div style={{ ...col, flex: 1, gap: 4 }}>
        <span style={{ ...row, fontSize: 44, fontWeight: 900, color: ink }}>{d.handle || d.name}</span>
        <span style={{ ...row, fontSize: 30, fontWeight: 600, color: soft }}>Scan to join me on Rezekii</span>
        <span style={{ ...row, fontSize: 28, fontWeight: 800, color: soft }}>{d.link.replace(/^https?:\/\//, "")}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d.qr} width={190} height={190} alt="" style={{ borderRadius: 22, background: "#fff", padding: 8 }} />
    </div>
  );
}

function Brand({ d, ink, tile }: { d: CardData; ink: string; tile: string }) {
  return (
    <div style={{ ...row, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ ...row, alignItems: "center", gap: 18 }}>
        <span style={{ ...row, width: 96, height: 96, borderRadius: 28, background: tile, alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.logo} width={80} height={80} alt="" />
        </span>
        <span style={{ ...row, fontSize: 56, fontWeight: 900, color: ink, letterSpacing: -1 }}>Rezekii</span>
      </div>
      <span style={{ ...row, fontSize: 28, fontWeight: 800, color: ink, opacity: 0.75 }}>{d.moment === "story" && d.date ? d.date : "TikTok Shop Partner"}</span>
    </div>
  );
}

/** The middle of every look: kicker, the big number or title, the line under it, and the chips. */
function Middle({ d, ink, soft, accent, chipBg, chipInk, bigSize }: { d: CardData; ink: string; soft: string; accent: string; chipBg: string; chipInk: string; bigSize: number }) {
  const invite = d.moment === "invite";
  const big = invite ? d.big || "Join me on Rezekii" : d.big;
  return (
    <div style={{ ...col, gap: 22 }}>
      <span style={{ ...row, alignSelf: "flex-start", padding: "10px 22px", borderRadius: 999, background: chipBg, color: accent, fontSize: 30, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>{d.kicker || (invite ? "You're invited" : "Proud moment")}</span>
      {!invite && d.label && <span style={{ ...row, fontSize: 52, fontWeight: 800, color: ink, lineHeight: 1.15 }}>{d.label}</span>}
      {big && <span style={{ ...row, fontSize: invite ? 104 : bigSize, fontWeight: 900, color: ink, lineHeight: 1, letterSpacing: -4 }}>{big}</span>}
      {(invite ? d.tag : d.sub) && <span style={{ ...row, fontSize: 38, fontWeight: 600, color: soft, lineHeight: 1.3 }}>{invite ? d.tag : d.sub}</span>}
      {d.lines.length > 0 && (
        <div style={{ ...row, flexWrap: "wrap", gap: 14 }}>
          {d.lines.map((l) => <span key={l} style={{ ...row, padding: "14px 26px", borderRadius: 999, background: chipBg, color: chipInk, fontSize: 34, fontWeight: 800 }}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

/** The invite's ticket: her credits and her code. */
function Ticket({ d, main, stub, mainInk, stubInk, line }: { d: CardData; main: string; stub: string; mainInk: string; stubInk: string; line: string }) {
  if (d.moment !== "invite") return null;
  return (
    <div style={{ ...row, borderRadius: 40, overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.35)" }}>
      <div style={{ ...col, padding: "34px 40px", background: main, color: mainInk, justifyContent: "center" }}>
        <span style={{ ...row, fontSize: 92, fontWeight: 900, lineHeight: 1 }}>+{d.reward || "50"}</span>
        <span style={{ ...row, fontSize: 30, fontWeight: 800 }}>credits for you</span>
      </div>
      <div style={{ ...col, flex: 1, padding: "34px 40px", background: stub, justifyContent: "center", borderLeft: `5px dashed ${line}` }}>
        <span style={{ ...row, fontSize: 28, fontWeight: 800, color: stubInk, opacity: 0.6, letterSpacing: 4, textTransform: "uppercase" }}>Invite code</span>
        <span style={{ ...row, fontSize: 76, fontWeight: 900, color: stubInk, letterSpacing: 3 }}>{d.code}</span>
      </div>
    </div>
  );
}

export function StyledCard({ style, d }: { style: Style; d: CardData }) {
  const rimau = (w: number) => (d.rimau ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={d.rimau} width={w} height={w * 1.22} alt="" />
  ) : null);

  if (style === "a") {
    // A · Bold Ticket: Rezekii green, white text, Rimau up top, a white ticket.
    return (
      <div style={{ ...col, width: 1080, height: 1920, padding: 72, gap: 40, background: `linear-gradient(165deg, ${T.green} 0%, ${T.deep} 70%, #005a34 100%)`, fontFamily: "Albert Sans" }}>
        <Brand d={d} ink="#ffffff" tile="#ffffff" />
        <div style={{ ...row, flex: 1, alignItems: "flex-end", justifyContent: "center" }}>{rimau(430)}</div>
        <Middle d={d} ink="#ffffff" soft="#d9fbe9" accent={T.deep} chipBg="#ffffff" chipInk={T.deep} bigSize={190} />
        <Ticket d={d} main={T.gold} stub="#ffffff" mainInk="#3b2a00" stubInk={T.ink} line={T.gold} />
        <Footer d={d} bg="rgba(255,255,255,0.14)" ink="#ffffff" soft="#d9fbe9" ring="#ffffff" />
      </div>
    );
  }
  if (style === "b") {
    // B · Night Glow: near-black with green and blue light, the number glowing, glass chips.
    return (
      <div style={{ ...col, width: 1080, height: 1920, padding: 72, gap: 40, background: "#06120d", backgroundImage: `radial-gradient(circle at 85% 18%, rgba(37,200,244,0.35), transparent 42%), radial-gradient(circle at 10% 62%, rgba(0,192,115,0.42), transparent 48%)`, fontFamily: "Albert Sans" }}>
        <Brand d={d} ink="#eafff4" tile="#ffffff" />
        <div style={{ ...row, flex: 1, alignItems: "center", justifyContent: "flex-end" }}>{rimau(380)}</div>
        <Middle d={d} ink="#ffffff" soft="#a9d8c3" accent="#5ef0ae" chipBg="rgba(255,255,255,0.10)" chipInk="#eafff4" bigSize={200} />
        <Ticket d={d} main={T.green} stub="rgba(255,255,255,0.10)" mainInk="#ffffff" stubInk="#ffffff" line="#5ef0ae" />
        <Footer d={d} bg="rgba(255,255,255,0.08)" ink="#ffffff" soft="#a9d8c3" ring="#5ef0ae" />
      </div>
    );
  }
  // C · Poster: a big colour block with Rimau and the number, then a white panel.
  return (
    <div style={{ ...col, width: 1080, height: 1920, background: "#ffffff", fontFamily: "Albert Sans" }}>
      <div style={{ ...col, height: 1080, padding: 72, gap: 30, background: `linear-gradient(150deg, ${T.green} 0%, ${T.teal} 100%)`, borderBottomLeftRadius: 90, borderBottomRightRadius: 90 }}>
        <Brand d={d} ink="#ffffff" tile="#ffffff" />
        <div style={{ ...row, flex: 1, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ ...col, gap: 10, maxWidth: 560 }}>
            <span style={{ ...row, fontSize: 32, fontWeight: 900, color: "#ffffff", letterSpacing: 3, textTransform: "uppercase" }}>{d.kicker || (d.moment === "invite" ? "You're invited" : "Proud moment")}</span>
            <span style={{ ...row, fontSize: d.moment === "invite" ? 96 : 170, fontWeight: 900, color: "#ffffff", lineHeight: 1, letterSpacing: -4 }}>{d.moment === "invite" ? d.big || "Join me on Rezekii" : d.big}</span>
          </div>
          {rimau(360)}
        </div>
      </div>
      <div style={{ ...col, flex: 1, padding: 72, gap: 34 }}>
        {d.moment !== "invite" && d.label && <span style={{ ...row, fontSize: 54, fontWeight: 900, color: T.ink, lineHeight: 1.15 }}>{d.label}</span>}
        {(d.moment === "invite" ? d.tag : d.sub) && <span style={{ ...row, fontSize: 38, fontWeight: 600, color: "#4f6259", lineHeight: 1.3 }}>{d.moment === "invite" ? d.tag : d.sub}</span>}
        {d.lines.length > 0 && <div style={{ ...row, flexWrap: "wrap", gap: 14 }}>{d.lines.map((l) => <span key={l} style={{ ...row, padding: "14px 26px", borderRadius: 999, background: "#e9fbf2", color: T.deep, fontSize: 34, fontWeight: 800 }}>{l}</span>)}</div>}
        <Ticket d={d} main={T.green} stub="#f1f8f4" mainInk="#ffffff" stubInk={T.ink} line={T.green} />
        <div style={{ ...row, flex: 1 }} />
        <Footer d={d} bg="#f1f8f4" ink={T.ink} soft="#4f6259" ring="#ffffff" />
      </div>
    </div>
  );
}
