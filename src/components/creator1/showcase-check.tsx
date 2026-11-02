"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { PRODUCTS, short } from "@/lib/mock";
import { useT } from "@/lib/i18n/client";
import type { T } from "@/lib/i18n/lang";

/** TikTok usernames: 2–24 letters, numbers, dots or underscores. */
const tidy = (s: string) => s.trim().replace(/^@+/, "").toLowerCase();
const VALID = /^[a-z0-9._]{2,24}$/;

type Found = { handle: string; img: string; followers: number; cats: string[] };

/**
 * Her public TikTok Shop creator profile: photo, followers and the categories she sells in. The real app gets these from TikTok
 * Shop's Creator Marketplace (our saved daily creator list first, the API only when she isn't in it). The preview has no TikTok
 * connection, so every username finds the same sample photo; "nobody.here" shows the not-found path.
 */
function lookup(handle: string): Found | null {
  if (handle === "nobody.here") return null;
  const h = [...handle].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0;
  return { handle, img: "/avatars/aisyah.jpg", followers: 1200 + (h % 84000), cats: ["Fashion", "Home & Kitchen"] };
}

/** "You sell in Fashion and Home & Kitchen", with our own category names in her language. */
const sellsIn = (t: T, cats: string[]) =>
  cats.length === 1 ? t("You sell in {cat}", { cat: t(cats[0]) }) : t("You sell in {a} and {b}", { a: cats.slice(0, -1).map((c) => t(c)).join(", "), b: t(cats[cats.length - 1]) });

const STEPS = (t: T, f: Found | null, n: number) => [
  f ? t("Found {handle} on TikTok Shop", { handle: `@${f.handle}` }) : t("Looking on TikTok Shop"),
  f ? sellsIn(t, f.cats) : t("Reading your categories"),
  t("{n} products on Rezekii to compare", { n }),
];

/**
 * Landing showcase checker (owner, 29 Oct 2026). She types her TikTok username and we find her public creator profile: photo,
 * followers and the categories she sells in. Then real Rezekii products in those categories show blurred until she signs up.
 * We never claim to have seen her showcase: that needs her OK in TikTok Shop, and the real scan runs once she links it. When
 * the username isn't found, the blurred list is a labelled example instead.
 */
export function ShowcaseCheck() {
  const t = useT();
  const [raw, setRaw] = useState("");
  const [tried, setTried] = useState(false);
  const [stage, setStage] = useState<"type" | "check" | "locked">("type");
  const [step, setStep] = useState(0);
  const [found, setFound] = useState<Found | null>(null);
  const handle = tidy(raw);
  const err = !handle ? t("Type your TikTok username") : VALID.test(handle) ? "" : t("Use letters, numbers, dots or underscores");

  useEffect(() => {
    if (stage !== "check") return;
    const ts = [900, 1800, 3000].map((ms, i) => window.setTimeout(() => (i < 2 ? setStep(i + 1) : setStage("locked")), ms));
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [stage]);

  if (stage === "type") {
    return (
      <form
        className="sc-check"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (err) return;
          setFound(lookup(handle));
          setStep(0);
          setStage("check");
        }}
      >
        <div className="sc-row">
          <label className={`sc-field ${tried && err ? "bad" : ""}`}>
            <span aria-hidden="true">@</span>
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={t("TikTok username")}
              aria-label={t("Your TikTok username")}
              aria-invalid={tried && !!err}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
              enterKeyHint="go"
            />
          </label>
          <button type="submit" className="np-btn cr1-bigbtn">{t("Check My Showcase")} <Icon name="arrow" size={20} /></button>
        </div>
        {tried && err && <span className="sc-err" role="alert">{err}</span>}
        {/* Price is just "free to join", by the button (owner, 29 Oct 2026). */}
        <p className="sc-free"><b>{t("Beta open now. Join now for free.")}</b> · <a href="#how" className="sc-how">{t("How It Works")}</a></p>
      </form>
    );
  }

  const inCats = found ? PRODUCTS.filter((p) => found.cats.includes(p.category)) : PRODUCTS;
  // Shown as a modest +1% (owner, 29 Oct 2026: don't overclaim on the landing).
  const shown = inCats.filter((p) => p.tapRate > p.publicRate).slice(0, 3);
  const who = (
    <div className={`sc-who ${found && step > 0 ? "found" : ""}`}>
      {found && step > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sc-av" src={found.img} alt="" />
      ) : (
        <span className="v2-av">{handle.replace(/[._]/g, "").slice(0, 2).toUpperCase()}</span>
      )}
      <span>
        <b>@{handle}</b>
        <small>{found && step > 0 ? t("{n} followers", { n: short(found.followers) }) : stage === "check" ? t("Looking you up…") : t("Not found on TikTok Shop yet")}</small>
      </span>
      {found && step > 0 && <span className="sc-found"><Icon name="check" size={12} width={3.2} /> {t("Found You")}</span>}
    </div>
  );

  if (stage === "check") {
    return (
      <div className="sc-card" aria-live="polite">
        {who}
        <ul className="sc-steps">
          {STEPS(t, found, inCats.length).map((l, i) => (
            <li key={i} className={i < step ? "ok" : i === step ? "now" : ""}>
              {i < step ? <Icon name="check" size={16} width={3} /> : <span className="sc-spin" aria-hidden="true" />}
              {l}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="sc-card" aria-live="polite">
      {who}
      {found && (
        <div className="sc-cats">
          <small>{t("You sell in")}</small>
          {found.cats.map((c) => <span key={c}>{t(c)}</span>)}
        </div>
      )}
      <h3>{found ? t("{n} Products on Rezekii in Your Categories", { n: inCats.length }) : t("Sign Up to See Your Better Rates")}</h3>
      <div className="sc-lock">
        <div className="sc-blur" aria-hidden="true">
          {shown.map((p) => (
            <div key={p.id} className="sc-ex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" />
              <span>{p.name}<small>{p.shop}</small></span>
              <b><s>{p.publicRate}%</s> {p.publicRate + 1}%</b>
            </div>
          ))}
        </div>
        <span className="sc-tag"><Icon name="lock" size={14} /> {found ? t("Which ones are in your showcase?") : t("Example only")}</span>
      </div>
      <small className="sc-note">{t("Free during Beta. Link TikTok Shop to see your real rates; you can unlink anytime.")}</small>
      <Link href={`/signin?u=${encodeURIComponent(handle)}`} className="np-btn cr1-bigbtn">{t("Sign Up to Reveal")} <Icon name="arrow" size={20} /></Link>
      {/* Under every CTA (owner, 29 Oct 2026): people feel safe signing up to a TikTok-related app. */}
      <span className="sc-trust">
        <span className="sc-trust-logo"><Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={62} height={18} /></span>
        {t("Official TikTok Shop Partner App")}
      </span>
      <button type="button" className="v2-link sc-again" onClick={() => { setStage("type"); setTried(false); }}>{t("Use Another Username")}</button>
    </div>
  );
}
