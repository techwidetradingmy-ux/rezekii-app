"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Plat } from "@/components/seller/seller-ui";
import { ConnectSocialSheet, useSellerSocials } from "@/components/seller/connect-social";
import { SHOP_ITEMS, type Platform } from "@/lib/mock-seller";

const LIMIT: Record<Platform, number> = { Facebook: 63206, Instagram: 2200, Threads: 500 };
const PHOTOS = Array.from(new Set(SHOP_ITEMS.map((s) => s.img)));

/** Cross-post to the shop's own Facebook Page, Instagram and Threads: connect, write once, post now or schedule. */
export default function SellerNewPost() {
  const { toast } = useDemo();
  const { socials, connect } = useSellerSocials();
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [media, setMedia] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [targets, setTargets] = useState<Platform[]>(socials.filter((s) => s.linked).map((s) => s.name));
  const [when, setWhen] = useState<"now" | "later">("later");
  const [date, setDate] = useState("2026-10-29");
  const [time, setTime] = useState("20:00");
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const linked = socials.filter((s) => s.linked);
  const tightest = targets.length ? Math.min(...targets.map((t) => LIMIT[t])) : LIMIT.Instagram;
  const over = caption.length > tightest;
  const errors = [!media && "Add a photo or video.", !caption.trim() && "Write a caption.", targets.length === 0 && "Pick at least one account.", over && `Caption is over ${tightest.toLocaleString("en-MY")} characters for ${targets.find((t) => LIMIT[t] === tightest)}.`].filter(Boolean) as string[];

  const toggle = (p: Platform) => setTargets((t) => (t.includes(p) ? t.filter((x) => x !== p) : [...t, p]));
  const pretty = () => {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const h12 = ((hh + 11) % 12) + 1;
    return `${d} ${months[m - 1]} ${y}, ${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
  };
  const submit = () => {
    setTried(true);
    if (errors.length) return;
    setDone(when === "now" ? `Posting now to ${targets.join(", ")}` : `Scheduled for ${pretty()} on ${targets.join(", ")}`);
  };

  if (done) {
    return (
      <div className="v2-stack v2-in v2-narrow">
        <section className="v2-card sl-done">
          <span className="sl-check"><Icon name="check" size={38} width={2.8} /></span>
          <h2>{when === "now" ? "Posting now" : "Scheduled"}</h2>
          <p className="v2-muted" style={{ margin: 0 }}>{done}. You&apos;ll see each account&apos;s status in Calendar &amp; history.</p>
          <div className="v2-row" style={{ justifyContent: "center" }}>
            <Link href="/seller/app/publish/calendar" className="np-btn">See calendar</Link>
            <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => { setDone(null); setMedia(null); setCaption(""); setTried(false); }}>New post</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="v2-stack v2-in v2-narrow">
      <Title title="New post" sub="Post to your shop's Facebook Page, Instagram and Threads in one go." />

      <section className="v2-card">
        <h2 className="v2-h2">Your accounts</h2>
        <div>
          {socials.map((s) => (
            <div key={s.name} className="sl-acct">
              <Plat p={s.name} />
              <span><b>{s.name}</b><small>{s.linked ? s.handle : "Not connected"}</small></span>
              {s.linked ? <span className="badge">Connected</span> : <button type="button" className="np-btn v2-btn-sm" onClick={() => setConnecting(s.name)}>Connect</button>}
            </div>
          ))}
        </div>
      </section>

      {linked.length === 0 ? (
        <section className="v2-card flat"><b>Connect an account first</b><span className="v2-muted">Log in with Facebook, Instagram or Threads and allow Rezekii to post for your shop.</span></section>
      ) : (
        <section className="v2-card np">
          <h2>Photo or video</h2>
          {media ? (
            <div className="sl-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media} alt="Selected media" />
              <button type="button" className="btn-outline" onClick={() => setMedia(null)}>Remove</button>
            </div>
          ) : (
            <>
              <button type="button" className="np-drop" style={{ font: "inherit", width: "100%" }} onClick={() => { setMedia("/products/tap-21.jpg"); toast("Video added · 0:24"); }}>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><Icon name="video" size={26} /> Tap to add a photo or video<small className="v2-small">JPG, PNG or MP4 up to 15 minutes</small></span>
              </button>
              <div className="v2-field">Or use a product photo
                <div className="v2-row" style={{ gap: 8 }}>
                  {PHOTOS.map((src) => (
                    <button key={src} type="button" onClick={() => setMedia(src)} style={{ padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: 12 }} aria-label="Use this product photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <label className="v2-field">Caption
            <textarea className="np-input" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Hot kopi at 7 AM, still hot at 3 PM. Link in bio." />
          </label>
          <span className="np-count" style={over ? { color: "var(--red)", fontWeight: 800 } : undefined}>{caption.length.toLocaleString("en-MY")} / {tightest.toLocaleString("en-MY")}</span>

          <h2>Post to</h2>
          <div className="np-checks">
            {linked.map((s) => (
              <label key={s.name} className="np-check">
                <input type="checkbox" checked={targets.includes(s.name)} onChange={() => toggle(s.name)} />
                <Plat p={s.name} sm /> {s.name}
                <small>{s.handle}{s.name === "Threads" ? " · text up to 500 characters" : ""}</small>
              </label>
            ))}
          </div>

          <h2>When</h2>
          <div className="np-when">
            <label className={`np-radio ${when === "now" ? "on" : ""}`}><input type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} /> Post now</label>
            <label className={`np-radio ${when === "later" ? "on" : ""}`}><input type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} /> Schedule</label>
          </div>
          {when === "later" && (
            <div className="v2-row" style={{ gap: 8 }}>
              <input className="np-input" type="date" value={date} min="2026-10-28" onChange={(e) => setDate(e.target.value)} style={{ flex: "1 1 160px" }} aria-label="Date" />
              <input className="np-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ flex: "1 1 120px" }} aria-label="Time" />
            </div>
          )}

          {tried && errors.length > 0 && <ul className="np-errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <button type="button" className="np-btn np-submit" onClick={submit}>{when === "now" ? "Post now" : "Schedule post"}</button>
          <p className="np-consent">We post exactly what you write, to the accounts you tick. Times are Malaysia time.</p>
        </section>
      )}

      {connecting && (
        <ConnectSocialSheet
          platform={connecting}
          onClose={() => setConnecting(null)}
          onDone={(handle) => { connect(connecting, handle); setTargets((t) => [...t, connecting]); toast(`${connecting} connected`); setConnecting(null); }}
        />
      )}
    </div>
  );
}
