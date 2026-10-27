"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, ShareSheet, Sheet, Title } from "@/components/ui";
import { Honour, ShareButton } from "@/components/creator2/bits";
import { BADGES, CREATOR } from "@/lib/mock";
import { BADGE_INFO, LEVELS, TIERS } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const BADGE_ICON: Record<string, IconName> = {
  "First scan": "scan", "Link master": "link", "7-day streak": "flame", "Sample star": "gift", "First RM 1,000": "wallet", Silver: "medal", Gold: "trophy",
};
const CONFETTI = ["#ffd34d", "#f5a623", "#00c073", "#22dc95", "#fff6c9", "#e8005a"];

/** Level (Bronze / Silver / Gold), activity tiers with the Highly active honour badge, and the badge wall. */
export default function RewardsLevel() {
  const { toast } = useDemo();
  const [badge, setBadge] = useState<(typeof BADGES)[number] | null>(null);
  const [unlock, setUnlock] = useState(false);
  const [lit, setLit] = useState(false);
  const [share, setShare] = useState<{ big: string; label: string; lines: string[] } | null>(null);
  const got = BADGES.filter((b) => b.got).length;
  const levelAt = LEVELS.findIndex((l) => l.name === CREATOR.level);
  const tierAt = TIERS.findIndex((t) => t.name === CREATOR.activity);

  useEffect(() => {
    if (!unlock) return;
    setLit(false);
    const t = window.setTimeout(() => setLit(true), 650);
    return () => window.clearTimeout(t);
  }, [unlock]);

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Level & badges" sub={`You're ${CREATOR.level} · TikTok Shop Lv.${CREATOR.tiktokLevel} · ${got} badges`}>
        <ShareButton big={CREATOR.level} label="My creator level on Rezekii" lines={[`TikTok Shop Lv.${CREATOR.tiktokLevel}`, `${got} badges earned`]} />
      </Title>

      <section className="v2-stack" style={{ gap: 12 }}>
        <div className="v2-card-h">
          <h2 className="v2-h2">Your level</h2>
          <span className="v2-small">Sets your TAP commission rates</span>
        </div>
        <div className="cr2-levels">
          {LEVELS.map((l, i) => (
            <article key={l.name} className={`cr2-level ${i === levelAt ? "on" : i < levelAt ? "past" : ""}`}>
              {i === levelAt && <span className="badge cr2-here">You&apos;re here</span>}
              <div className="cr2-level-top">
                <span className={`cr2-coin ${l.name.toLowerCase()}`}><Icon name={i === 2 ? "trophy" : "medal"} size={24} width={2.1} /></span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <h3>{l.name}</h3>
                  <small>{l.how}</small>
                </span>
              </div>
              <ul>
                {l.gives.map((g) => <li key={g}><Icon name="check" size={16} width={2.6} /><span>{g}</span></li>)}
              </ul>
              {i === 2 && (
                <button type="button" className="btn-outline v2-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => toast("Thanks. The Techwide team will contact you on WhatsApp about Gold.")}>
                  Ask about Gold
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Activity</h2>
          <span className="badge">{CREATOR.activity}</span>
        </div>
        <span className="v2-muted">Decides which samples you can get. Miss a day or let a sample go overdue and you drop back a step; catch up and you&apos;re back.</span>
        <div className="cr2-track">
          {TIERS.map((t, i) => (
            <div key={t.name} className={`cr2-stop ${i <= tierAt ? "reached" : ""} ${i === tierAt ? "now" : ""} ${i === 2 ? "honour" : ""}`}>
              <span className="cr2-node"><Icon name={i === 2 ? "star" : i <= tierAt ? "check" : "user"} size={18} width={2.4} /></span>
              <b>{t.name}</b>
              <small>{t.how}</small>
              <em>{t.samples}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="v2-card">
        <div className="cr2-honourcard">
          <Honour state="off" size={128} />
          <span>
            <span className="badge badge-amber cr2-honourtag">Honour badge</span>
            <h2 className="v2-h2" style={{ fontSize: 22 }}>Highly active</h2>
            <span className="v2-muted">Post every day for 30 days in a row and deliver every sample on time. It&apos;s the rarest badge on Rezekii, shows on your profile and share cards, and opens designated samples.</span>
            <span className="v2-small"><b style={{ color: "var(--text)" }}>Day {CREATOR.streak} of 30</b> · sample delivery 100%</span>
            <Progress value={CREATOR.streak} max={30} />
            <span className="v2-small">Goes grey if you miss a day, and lights up again when you get back to 30.</span>
            <div className="v2-row">
              <button type="button" className="np-btn v2-btn-sm" onClick={() => setUnlock(true)}><Icon name="eye" size={16} /> Preview the unlock</button>
            </div>
          </span>
        </div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Badges</h2>
          <span className="badge">{got} of {BADGES.length}</span>
        </div>
        <div className="v2-badges">
          {BADGES.map((b) => (
            <button key={b.name} type="button" className="v2-badge cr2-badgebtn" onClick={() => setBadge(b)}>
              {"honour" in b && b.honour ? (
                <Honour state={b.got ? "on" : "off"} size={64} />
              ) : (
                <span className={`v2-medal ${b.got ? "" : "grey"}`}><Icon name={BADGE_ICON[b.name] ?? "medal"} size={28} width={2.1} /></span>
              )}
              {b.name}
            </button>
          ))}
        </div>
      </section>

      {badge && (
        <Sheet title={badge.name} onClose={() => setBadge(null)}>
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
            {"honour" in badge && badge.honour ? (
              <Honour state={badge.got ? "on" : "off"} size={110} />
            ) : (
              <span className={`v2-medal ${badge.got ? "" : "grey"}`}><Icon name={BADGE_ICON[badge.name] ?? "medal"} size={46} width={2.2} /></span>
            )}
          </div>
          <p style={{ margin: 0, textAlign: "center", lineHeight: 1.5 }}>{BADGE_INFO[badge.name]}</p>
          <span className={`badge ${badge.got ? "" : "badge-gray"}`} style={{ alignSelf: "center" }}>{badge.got ? "Earned" : "Not yet"}</span>
          {badge.got ? (
            <button type="button" className="np-btn" onClick={() => { setBadge(null); setShare({ big: badge.name.includes("RM") ? "Unlocked" : badge.name, label: "New badge on Rezekii", lines: [`${CREATOR.level} creator`, `${got} badges so far`] }); }}><Icon name="share" size={18} /> Share this badge</button>
          ) : (
            <button type="button" className="btn-outline" style={{ height: 46 }} onClick={() => setBadge(null)}>Got it</button>
          )}
        </Sheet>
      )}

      {unlock && (
        <div className="v2-celebrate cr2-unlock" onClick={() => setUnlock(false)}>
          <div className="v2-cele-card" role="dialog" aria-modal="true" aria-label="Highly active unlocked" onClick={(e) => e.stopPropagation()}>
            {lit && (
              <div className="v2-confetti" aria-hidden="true">
                {Array.from({ length: 32 }, (_, i) => (
                  <i key={i} style={{ left: `${(i * 31) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 8) * 80}ms`, transform: `rotate(${i * 27}deg)` }} />
                ))}
              </div>
            )}
            <span className="badge badge-gray">Preview · what you&apos;ll see on day 30</span>
            <div className="cr2-unlock-stage"><Honour state={lit ? "lit" : "off"} size={124} /></div>
            <h2>{lit ? "Highly active!" : "Day 30…"}</h2>
            <p style={{ fontWeight: 800, color: "var(--gink)" }}>30 days in a row · every sample delivered</p>
            <p>Your honour badge is lit. Designated samples are open to you now.</p>
            <div className="v2-stack" style={{ width: "100%", marginTop: 6 }}>
              <button type="button" className="np-btn" onClick={() => { setUnlock(false); setShare({ big: `Day ${CREATOR.streak} of 30`, label: "On my way to Highly active", lines: ["Posting every day", `${CREATOR.level} creator on Rezekii`] }); }}><Icon name="share" size={18} /> Share this moment</button>
              <button type="button" className="btn-outline" onClick={() => setUnlock(false)}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {share && <ShareSheet onClose={() => setShare(null)} big={share.big} label={share.label} lines={share.lines} />}
    </div>
  );
}
