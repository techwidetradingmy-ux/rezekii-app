import Image from "next/image";
import { LangSwitch } from "@/lib/i18n/client.tsx";
import { makeT, type Lang } from "@/lib/i18n/lang.ts";
import { wordsFor } from "@/lib/i18n/translate.ts";

const TILES: [string, string, string, string, string][] = [
  // position, background, icon colour, rotation, icon path (video, yellow cart, coins, LIVE, link)
  ["top: 12%; left: 12%", "#fe2c55", "#ffffff", "-10deg", "M4 5h16v14H4zM10 9l5 3-5 3z"],
  ["top: 10%; right: 14%", "#ffc700", "#3b2a00", "12deg", "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6M10 20.5h.01M17 20.5h.01"],
  ["bottom: 16%; left: 10%", "#00c073", "#ffffff", "8deg", "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"],
  ["bottom: 14%; right: 11%", "#0d1117", "#25f4ee", "-8deg", "M12 12h.01M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"],
  ["top: 46%; left: 5%", "#25c8f4", "#ffffff", "6deg", "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
];
const css = (s: string) => Object.fromEntries(s.split(";").map((p) => p.split(":").map((x) => x.trim())).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]));

/**
 * Brand screen (Style A) shared by sign-in and the connected page: the logo's ripple stands for a post going viral. `lang` words
 * it, with the EN | 中文 switch in the corner (the page wraps it in LangProvider).
 */
export function Splash({ lang = "en", children }: { lang?: Lang; children: React.ReactNode }) {
  const t = makeT(wordsFor(lang));
  return (
    <main className="rz-splash">
      <div className="rz-langbar"><LangSwitch /></div>
      <div className="rz-tiles" aria-hidden="true">
        {TILES.map(([pos, bg, fg, rot, d], i) => (
          <span key={i} className="rz-tile" style={{ ...css(pos), animationDelay: `${-i * 0.7}s` }}>
            <span style={{ background: bg, transform: `rotate(${rot})` }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            </span>
          </span>
        ))}
      </div>
      <div className="rz-logo-wrap">
        <span className="rz-ripple" aria-hidden="true" />
        <span className="rz-ripple" aria-hidden="true" style={{ animationDelay: "-1s" }} />
        <span className="rz-ripple" aria-hidden="true" style={{ animationDelay: "-2s" }} />
        <div className="rz-logo">
          <Image src="/master-logo-transparent.png" alt="Rezekii" width={64} height={64} priority />
        </div>
      </div>
      <p className="rz-name">Rezekii</p>
      <p className="rz-tag">{t("CONNECTING AFFILIATES")}</p>
      <div className="rz-card">{children}</div>
      <p className="rz-foot">
        <a href="mailto:support@rezekii.com">support@rezekii.com</a>
      </p>
    </main>
  );
}
