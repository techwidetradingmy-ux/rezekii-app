"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { PRODUCTS } from "@/lib/mock";
import { AGENCY } from "@/lib/mock-seller";

/** TikTok usernames: 2–24 letters, numbers, dots or underscores. */
const tidy = (s: string) => s.trim().replace(/^@+/, "").toLowerCase();
const VALID = /^[a-z0-9._]{2,24}$/;
const EXAMPLE: [string, string, string][] = [[PRODUCTS[0].img, "6%", "10%"], [PRODUCTS[1].img, "8%", "12%"], [PRODUCTS[2].img, "5%", "9%"]];

/**
 * Landing showcase checker (owner, 29 Oct 2026): she types her TikTok username, watches a short check, and the results stay
 * locked until she signs up. Nothing is read from TikTok here, so the steps never claim to have seen her showcase and the
 * blurred list is labelled an example. The real scan runs once she links TikTok Shop.
 */
export function ShowcaseCheck() {
  const [raw, setRaw] = useState("");
  const [tried, setTried] = useState(false);
  const [stage, setStage] = useState<"type" | "check" | "locked">("type");
  const [step, setStep] = useState(0);
  const handle = tidy(raw);
  const err = !handle ? "Type your TikTok username" : VALID.test(handle) ? "" : "Use letters, numbers, dots or underscores";

  useEffect(() => {
    if (stage !== "check") return;
    const ts = [700, 1500, 2700].map((ms, i) => window.setTimeout(() => (i < 2 ? setStep(i + 1) : setStage("locked")), ms));
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
              placeholder="your TikTok username"
              aria-label="Your TikTok username"
              aria-invalid={tried && !!err}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
              enterKeyHint="go"
            />
          </label>
          <button type="submit" className="np-btn cr1-bigbtn">Check My Showcase <Icon name="arrow" size={20} /></button>
        </div>
        {tried && err && <span className="sc-err" role="alert">{err}</span>}
        <a href="#how" className="sc-how">How it works</a>
      </form>
    );
  }

  const top = (
    <div className="sc-who">
      <span className="v2-av">{handle.replace(/[._]/g, "").slice(0, 2).toUpperCase()}</span>
      <span>
        <b>@{handle}</b>
        <small>{stage === "check" ? "Getting ready…" : "One step left"}</small>
      </span>
    </div>
  );

  if (stage === "check") {
    const lines = ["Username looks good", `${AGENCY.products.toLocaleString()} products on Rezekii to compare`, "Getting your scan ready"];
    return (
      <div className="sc-card" aria-live="polite">
        {top}
        <ul className="sc-steps">
          {lines.map((l, i) => (
            <li key={l} className={i < step ? "ok" : i === step ? "now" : ""}>
              {i < step ? <Icon name="check" size={16} width={3} /> : <span className="sc-spin" aria-hidden="true" />}
              {l}
            </li>
          ))}
        </ul>
        <small className="sc-note">We read your showcase only after you link TikTok Shop. Nothing is checked without your OK.</small>
      </div>
    );
  }

  return (
    <div className="sc-card" aria-live="polite">
      {top}
      <h3>Sign Up to See Your Better Rates</h3>
      <div className="sc-lock">
        <div className="sc-blur" aria-hidden="true">
          {EXAMPLE.map(([img, from, to]) => (
            <div key={img} className="sc-ex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" />
              <span><i /><i /></span>
              <b><s>{from}</s> {to}</b>
            </div>
          ))}
        </div>
        <span className="sc-tag"><Icon name="lock" size={14} /> Example only</span>
      </div>
      <small className="sc-note">Link TikTok Shop to see your real rates. Free, and you can unlink anytime.</small>
      <Link href={`/signin?u=${encodeURIComponent(handle)}`} className="np-btn cr1-bigbtn">Sign Up to Reveal <Icon name="arrow" size={20} /></Link>
      <button type="button" className="v2-link sc-again" onClick={() => { setStage("type"); setTried(false); }}>Use another username</button>
    </div>
  );
}
