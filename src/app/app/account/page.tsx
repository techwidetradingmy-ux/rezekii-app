"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { PlatformIcon } from "@/components/creator2/bits";
import { CREATOR, MY_SAMPLES, SOCIALS } from "@/lib/mock";
import { MySamples } from "@/components/creator1/my-samples";
import { SCOPES } from "@/components/consent";
import { LevelFace } from "@/components/level-face";
import { LevelBadges } from "@/components/account/level-badges";
import { Referral } from "@/components/account/referral";
import { Wallet } from "@/components/account/wallet";
import type { IconName } from "@/components/icons";
import { MY_STATES, NICHES, NOTIFY } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const TYPES = ["Affiliate", "UGC", "Artist", "Influencer"] as const;
/** One account page, every personal section; the address bar keeps the section (#referral) so links can open it. */
const TABS = [
  ["profile", "Profile", "user"],
  ["level", "Level & badges", "medal"],
  ["wallet", "Wallet", "wallet"],
  ["referral", "Referral", "users"],
  ["samples", "Samples & delivery", "box"],
  ["connections", "Connections", "link"],
  ["rate-card", "Rate card", "tag"],
  ["settings", "Settings", "gear"],
] as const satisfies readonly (readonly [string, string, IconName])[];
type TabKey = (typeof TABS)[number][0];
const active = MY_SAMPLES.filter((x) => !["Done", "Not approved"].includes(x.status)).length;
type Theme = "Light" | "Dark" | "Auto";

/** 012-345 6789 → +60123456789; anything that isn't a Malaysian mobile number returns null. */
function toMsia(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = `6${d}`;
  if (!d.startsWith("60")) d = `60${d}`;
  return /^601\d{8,9}$/.test(d) ? `+${d}` : null;
}

/** My account: profile, connections, samples & delivery, rate card (later) and settings, grouped like iOS Settings. Nothing is saved. */
export default function Account() {
  const { linked, setLinked, toast, consent } = useDemo();
  const [unlink, setUnlink] = useState(false);
  const [tab, setTab] = useState<TabKey>("profile");
  const [email, setEmail] = useState("aisyah.r@example.com");
  const [emailSheet, setEmailSheet] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [delSheet, setDelSheet] = useState(false);
  const [delText, setDelText] = useState("");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      const hit = TABS.find(([k]) => k === h);
      if (hit) setTab(hit[0]);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (k: TabKey) => {
    setTab(k);
    window.history.replaceState(null, "", `#${k}`);
  };

  const [name, setName] = useState(CREATOR.name);
  const [state, setState] = useState(CREATOR.state);
  const [phone, setPhone] = useState("012-345 6789");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [waSheet, setWaSheet] = useState(false);
  const [gender, setGender] = useState<"Female" | "Male">("Female");
  const [types, setTypes] = useState<string[]>(["Affiliate", "UGC"]);
  const [niche, setNiche] = useState("Home Supplies");
  const [sub1, setSub1] = useState("Muslim Fashion");
  const [sub2, setSub2] = useState("");
  const [addr, setAddr] = useState({ to: "", phone: "", line: "", postcode: "", city: "", state: "" });
  const [conn, setConn] = useState<Record<string, boolean>>(Object.fromEntries(SOCIALS.map((s) => [s.name, s.linked])));
  const [notify, setNotify] = useState<Record<string, [boolean, boolean]>>({ samples: [true, true], chances: [true, true], posts: [true, false], rewards: [true, false] });
  const [pwSheet, setPwSheet] = useState(false);
  const [hasPw, setHasPw] = useState(false);
  const [pw, setPw] = useState(["", ""]);
  const [topic, setTopic] = useState("Idea");
  const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState<Theme>("Auto");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("rz2_theme");
    } catch {}
    const attr = document.documentElement.getAttribute("data-theme");
    const t: Theme = saved === "Light" || saved === "Dark" ? saved : attr === "light" ? "Light" : attr === "dark" ? "Dark" : "Auto";
    setTheme(t);
    if (t !== "Auto") document.documentElement.setAttribute("data-theme", t.toLowerCase());
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    const html = document.documentElement;
    if (t === "Auto") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", t.toLowerCase());
    try {
      localStorage.setItem("rz2_theme", t);
    } catch {}
  };

  const intl = toMsia(phone);
  const verifyNow = () => {
    setVerifying(true);
    toast("Opening WhatsApp…");
    window.setTimeout(() => {
      setVerifying(false);
      setVerified(true);
      setWaSheet(false);
      toast("WhatsApp number verified");
    }, 1800);
  };

  const socials: { key: string; label: string; icon: React.ReactNode; detail: string; on: boolean }[] = [
    { key: "TikTok Shop", label: "TikTok Shop", icon: <span className="cr2-cico" style={{ background: "#111111" }}><Icon name="bag" size={18} /></span>, detail: linked ? "Linked · commission, scans and one-tap add" : "Not linked", on: linked },
    { key: "TikTok", label: "TikTok account", icon: <PlatformIcon name="TikTok" size={34} />, detail: conn.TikTok ? `${SOCIALS[0].handle} · video data and posting` : "Not connected", on: conn.TikTok },
    { key: "Facebook", label: "Facebook Page", icon: <PlatformIcon name="Facebook" size={34} />, detail: conn.Facebook ? SOCIALS[2].handle : "Not connected", on: conn.Facebook },
    { key: "Instagram", label: "Instagram", icon: <PlatformIcon name="Instagram" size={34} />, detail: conn.Instagram ? `${SOCIALS[1].handle} · Reels` : "Not connected", on: conn.Instagram },
    { key: "Threads", label: "Threads", icon: <PlatformIcon name="Threads" size={34} />, detail: conn.Threads ? "@aisyah.glow" : "Not connected", on: conn.Threads },
  ];

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <Title title="My account" sub="Your details, level, wallet, referrals, samples and settings in one place" />

      <div className="cr2-settings">
        <div className="cr2-cells">
          <div className="cr2-profile">
            <LevelFace lv={linked ? CREATOR.tiktokLevel : null} size={76} img={CREATOR.photo} name={CREATOR.name} />
            <span>
              <strong className="cr2-name">
                {name || CREATOR.name}
                {linked && (
                  <span className="cr2-tick" title="TikTok Shop account linked and approved" aria-label="Verified TikTok Shop account">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#25f4ee" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                  </span>
                )}
              </strong>
              <span className="v2-small">{CREATOR.handle} · TikTok Shop Malaysia · {state}</span>
              <span className="cr2-chips">
                <span className={`cr2-lvchip ${CREATOR.level.toLowerCase()}`}>{CREATOR.level} creator</span>
                <span className="cr2-actchip"><Icon name="flame" size={12} /> {CREATOR.activity} · {CREATOR.streak} days</span>
                {!verified && <button type="button" className="cr2-wachip" onClick={() => setWaSheet(true)}>Verify WhatsApp</button>}
              </span>
            </span>
          </div>
        </div>

        <div className="acc-tabs nv-noscroll" role="tablist" aria-label="Account sections">
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : undefined} onClick={() => go(k)}>
              <Icon name={icon} size={17} /> {label}
              {k === "samples" && <span className="badge badge-amber">{active}</span>}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <>
        <section className="cr2-group">
          <h2>Profile</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <label htmlFor="cr2-name">Name</label>
              <input id="cr2-name" className="np-input val" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-state">State</label>
              <select id="cr2-state" className="np-input val" value={state} onChange={(e) => setState(e.target.value)}>
                {MY_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-wa">WhatsApp number</label>
              <span className="val v2-stack" style={{ gap: 8 }}>
                <input id="cr2-wa" className="np-input" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setVerified(false); }} />
                <span className="v2-row" style={{ gap: 8 }}>
                  {intl ? <span className="v2-small">Saved as {intl}</span> : <span className="v2-small cr2-red" style={{ fontWeight: 700 }}>Enter a Malaysian mobile number, e.g. 012-345 6789</span>}
                  <span className="sp" style={{ flex: 1 }} />
                  {verified ? (
                    <span className="badge"><Icon name="check" size={13} width={3} /> Verified</span>
                  ) : (
                    <button type="button" className="np-btn v2-btn-sm cr2-wabtn" disabled={!intl} onClick={() => setWaSheet(true)}>
                      <Icon name="whatsapp" size={16} /> Verify with WhatsApp
                    </button>
                  )}
                </span>
              </span>
            </div>
            <div className="cr2-cell">
              <span className="lbl">Gender</span>
              <span className="val"><Seg value={gender} options={["Female", "Male"] as const} onChange={setGender} /></span>
            </div>
          </div>
          <p>Your WhatsApp number is only for the Techwide team, for samples and parcels. It&apos;s never shown to sellers.</p>
        </section>

        <section className="cr2-group">
          <h2>What you do</h2>
          <div className="cr2-cells">
            <div className="cr2-cell stack">
              <span className="lbl">Creator type <span className="v2-small" style={{ fontWeight: 600 }}>· pick all that fit</span></span>
              <div className="v2-chips">
                {TYPES.map((t) => {
                  const on = types.includes(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} className={`v2-chip ${on ? "on" : ""}`} onClick={() => setTypes((l) => (on ? l.filter((x) => x !== t) : [...l, t]))}>
                      {on && <Icon name="check" size={14} width={3} />}{t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-n1">Main niche</label>
              <select id="cr2-n1" className="np-input val" value={niche} onChange={(e) => setNiche(e.target.value)}>
                {NICHES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-n2">Second niche <span className="v2-small" style={{ fontWeight: 600 }}>optional</span></label>
              <select id="cr2-n2" className="np-input val" value={sub1} onChange={(e) => setSub1(e.target.value)}>
                <option value="">None</option>
                {NICHES.filter((n) => n !== niche).map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-n3">Third niche <span className="v2-small" style={{ fontWeight: 600 }}>optional</span></label>
              <select id="cr2-n3" className="np-input val" value={sub2} onChange={(e) => setSub2(e.target.value)}>
                <option value="">None</option>
                {NICHES.filter((n) => n !== niche && n !== sub1).map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <p>Sellers use your niche, type and gender to match samples and campaigns. Same categories as TikTok Shop.</p>
          <button type="button" className="np-btn" style={{ alignSelf: "flex-start", marginLeft: 0 }} onClick={() => toast("Profile saved")}>Save profile</button>
        </section>

        <section className="cr2-group">
          <h2>Shipping address <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>· optional</span></h2>
          <p style={{ color: "var(--body)" }}>
            Only for PR kits and other parcels that don&apos;t go through TikTok. TAP samples use your address in TikTok. Only the Techwide team sees it.
          </p>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <label htmlFor="cr2-a1">Recipient</label>
              <input id="cr2-a1" className="np-input val" placeholder="Full name" value={addr.to} onChange={(e) => setAddr({ ...addr, to: e.target.value })} />
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-a2">Phone</label>
              <input id="cr2-a2" className="np-input val" inputMode="tel" placeholder="012-345 6789" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-a3">Address</label>
              <input id="cr2-a3" className="np-input val" placeholder="House number, street, area" value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value })} />
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-a4">Postcode</label>
              <input id="cr2-a4" className="np-input val" inputMode="numeric" maxLength={5} placeholder="40000" value={addr.postcode} onChange={(e) => setAddr({ ...addr, postcode: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-a5">City</label>
              <input id="cr2-a5" className="np-input val" placeholder="Shah Alam" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
            </div>
            <div className="cr2-cell">
              <label htmlFor="cr2-a6">State</label>
              <select id="cr2-a6" className="np-input val" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })}>
                <option value="">Choose a state</option>
                {MY_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="btn-outline" style={{ alignSelf: "flex-start" }} onClick={() => toast(addr.line ? "Address saved" : "Nothing to save yet. It's optional.")}>Save address</button>
        </section>

          </>
        )}

        {tab === "connections" && (
        <section className="cr2-group">
          <h2>Connections</h2>
          <div className="cr2-cells">
            {socials.map((s) => (
              <div key={s.key} className="cr2-cell row">
                {s.icon}
                <span className="cr2-conn">
                  <b>{s.label}</b>
                  <small>{s.detail}</small>
                </span>
                {s.on && s.key === "TikTok Shop" ? (
                  <button type="button" className="btn-outline v2-btn-sm" onClick={() => setUnlink(true)}>Unlink</button>
                ) : s.on ? (
                  <button
                    type="button"
                    className="btn-outline v2-btn-sm"
                    onClick={() => toast(`${s.label} reconnected`)}
                  >
                    <Icon name="refresh" size={15} /> Reconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    className="np-btn v2-btn-sm"
                    onClick={() => { if (s.key === "TikTok Shop") return setLinked(true); setConn((c) => ({ ...c, [s.key]: true })); toast(`${s.label} connected`); }}
                  >
                    {s.key === "TikTok Shop" ? "Link" : "Connect"}
                  </button>
                )}
              </div>
            ))}
          </div>
          {consent && (
            <div className="cs-record">
              <Icon name="shield" size={16} />
              <span>
                {consent.unlinkedAt
                  ? <>TikTok Shop unlinked on {consent.unlinkedAt}. We stopped reading it then, and delete its data within 30 days.</>
                  : <>You agreed to the Terms v{consent.terms} and Privacy Policy v{consent.privacy} on {consent.at}, letting Rezekii read: {SCOPES.creator.join(", ").toLowerCase()}.</>}
              </span>
            </div>
          )}
          <p>We never see your passwords. You can disconnect any of these in the platform&apos;s own settings.</p>
        </section>
        )}

        {tab === "level" && <LevelBadges />}
        {tab === "wallet" && <Wallet />}
        {tab === "referral" && <Referral />}
        {tab === "samples" && <MySamples />}

        {tab === "rate-card" && (
        <section className="cr2-group">
          <h2>Rate card <span className="badge badge-gray" style={{ textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>Coming later</span></h2>
          <div className="cr2-cells acc-soon">
            {[["TikTok video, 30 to 60 s", "per video"], ["TikTok LIVE", "per hour"], ["Instagram Reel", "per Reel"], ["Usage rights for ads", "per 30 days"]].map(([t, u]) => (
              <div key={t} className="cr2-cell">
                <span className="lbl">{t}</span>
                <span className="val v2-row" style={{ gap: 8, flexWrap: "nowrap" }}>
                  <input className="np-input" disabled placeholder="RM" aria-label={`${t} price`} style={{ maxWidth: 140 }} />
                  <span className="v2-small">{u}</span>
                </span>
              </div>
            ))}
          </div>
          <p>Later you&apos;ll set your prices here for paid reviews and UGC, and sellers see them when they invite you. Nothing to fill in yet.</p>
        </section>
        )}

        {tab === "settings" && (
          <>
        <section className="cr2-group">
          <h2>Login & security</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <span className="lbl">Signed in with</span>
              <span className="val v2-muted">TikTok</span>
            </div>
            <button type="button" className="cr2-cell cr2-cellbtn" onClick={() => { setNewEmail(""); setEmailSheet(true); }}>
              <span className="lbl">Email</span>
              <span className="chev">{email} <Icon name="arrow" size={16} /></span>
            </button>
            <button type="button" className="cr2-cell cr2-cellbtn" onClick={() => setPwSheet(true)}>
              <span className="lbl">Password</span>
              <span className="chev">{hasPw ? "Change" : "Set a password"} <Icon name="arrow" size={16} /></span>
            </button>
            <Link href="/signin" className="cr2-cell cr2-cellbtn">Sign out</Link>
            <button type="button" className="cr2-cell cr2-cellbtn danger" onClick={() => { setDelText(""); setDelSheet(true); }}>Delete account</button>
          </div>
        </section>

        <section className="cr2-group">
          <h2>Privacy & your data</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <span className="lbl">Consent</span>
              <span className="val v2-muted">{consent && !consent.unlinkedAt ? `Terms v${consent.terms} · Privacy v${consent.privacy} · ${consent.at}` : "None. TikTok Shop isn't linked."}</span>
            </div>
            <button type="button" className="cr2-cell cr2-cellbtn" onClick={() => toast("We'll email you a copy of your data within 7 days")}>
              <span className="lbl">Download my data</span>
              <span className="chev">Email me a copy <Icon name="arrow" size={16} /></span>
            </button>
            <a href="#" className="cr2-cell cr2-cellbtn" onClick={(e) => { e.preventDefault(); toast("Opening the Privacy Policy"); }}>
              <span className="lbl">Privacy Policy</span>
              <span className="chev">v1.0 · 28 Oct 2026 <Icon name="arrow" size={16} /></span>
            </a>
          </div>
          <p>We only show your earnings to you. Sellers see your public profile, never your sales, unless you choose to share them.</p>
        </section>

        <section className="cr2-group">
          <h2>Notifications</h2>
          <div className="cr2-cells">
            <div className="cr2-notifyhead"><span>Tell me about</span><span>In-app</span><span>Email</span></div>
            {NOTIFY.map((n) => (
              <div key={n.key} className="cr2-notify">
                <span>
                  <b>{n.label}</b>
                  <small>{n.note}</small>
                </span>
                {[0, 1].map((ch) => {
                  const on = notify[n.key][ch];
                  return (
                    <button
                      key={ch}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${n.label} by ${ch === 0 ? "in-app" : "email"}`}
                      className={`np-switch ${on ? "on" : ""}`}
                      onClick={() => setNotify((s) => {
                        const next: [boolean, boolean] = [...s[n.key]] as [boolean, boolean];
                        next[ch] = !next[ch];
                        return { ...s, [n.key]: next };
                      })}
                    >
                      <span />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p>No marketing messages unless you ask for them.</p>
        </section>

        <section className="cr2-group">
          <h2>Appearance</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <span className="lbl">Theme</span>
              <span className="val"><Seg value={theme} options={["Light", "Dark", "Auto"] as const} onChange={applyTheme} /></span>
            </div>
          </div>
          <p>Auto follows your phone or computer.</p>
        </section>
        <section className="cr2-group">
          <h2>Help & feedback</h2>
          <div className="cr2-cells">
            <div className="cr2-cell stack">
              <span className="lbl">Tell the team</span>
              <div className="v2-chips">
                {["Idea", "Something's broken", "Question"].map((t) => (
                  <button key={t} type="button" className={`v2-chip ${topic === t ? "on" : ""}`} onClick={() => setTopic(t)}>{t}</button>
                ))}
              </div>
              <textarea className="np-input" rows={4} placeholder="What would make Rezekii better for you?" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Your feedback" />
              <button
                type="button"
                className="np-btn"
                style={{ alignSelf: "flex-start" }}
                disabled={!msg.trim()}
                onClick={() => { setMsg(""); toast("Thanks, the team reads every message"); }}
              >
                <Icon name="send" size={17} /> Send
              </button>
            </div>
            <a href="mailto:support@rezekii.com" className="cr2-cell cr2-cellbtn" onClick={(e) => { e.preventDefault(); toast("support@rezekii.com · we reply within 1 working day"); }}>
              <span className="lbl">Email support</span>
              <span className="chev">support@rezekii.com <Icon name="arrow" size={16} /></span>
            </a>
            <Link href="/tour" className="cr2-cell cr2-cellbtn">
              <span className="lbl">How Rezekii works</span>
              <span className="chev">Tour <Icon name="arrow" size={16} /></span>
            </Link>
          </div>
        </section>

          </>
        )}
      </div>
      {waSheet && (
        <Sheet title="Verify with WhatsApp" onClose={() => setWaSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>Takes 10 seconds and it&apos;s free. It proves {intl} really has WhatsApp, so the team can reach you about samples.</p>
          <ol className="cr2-steps">
            <li><i>1</i><span><b>Tap Open WhatsApp.</b> WhatsApp opens with a message already written, with your code in it.</span></li>
            <li><i>2</i><span><b>Send it</b> without changing anything.</span></li>
            <li><i>3</i><span><b>Done.</b> Come back here; your number shows as verified.</span></li>
          </ol>
          <div className="cr2-wamsg">REZEKII verify 482 913<br />Please send this message as it is.</div>
          <button type="button" className="np-btn cr2-wabtn" disabled={verifying} onClick={verifyNow}>
            <Icon name="whatsapp" size={18} /> {verifying ? "Waiting for your message…" : "Open WhatsApp"}
          </button>
          <span className="v2-small" style={{ textAlign: "center" }}>You send the message, so it costs you nothing. We never send you a code.</span>
        </Sheet>
      )}

      {unlink && (
        <Sheet title="Unlink TikTok Shop?" onClose={() => setUnlink(false)}>
          <ul className="cr2-danger" style={{ margin: 0, paddingLeft: 30 }}>
            <li>We stop reading your TikTok Shop data straight away.</li>
            <li>Your scan results, earnings and payouts disappear from Rezekii, and we delete that data within 30 days.</li>
            <li>Products already added through Techwide keep their rate in TikTok until the campaign ends.</li>
          </ul>
          <button type="button" className="np-btn cr2-delbtn" onClick={() => { setLinked(false); setUnlink(false); toast("Unlinked. We stopped reading your TikTok Shop data."); }}>Unlink TikTok Shop</button>
          <button type="button" className="btn-outline" onClick={() => setUnlink(false)}>Keep it linked</button>
        </Sheet>
      )}

      {emailSheet && (
        <Sheet title="Change email" onClose={() => setEmailSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>Now: {email}. We send a link to the new address; it changes once you open it.</p>
          <label className="v2-field">
            New email
            <input type="email" className="np-input" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <button
            type="button"
            className="np-btn"
            disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)}
            onClick={() => { setEmail(newEmail); setEmailSheet(false); toast(`Link sent to ${newEmail}. Open it to confirm.`); }}
          >
            Send confirmation link
          </button>
        </Sheet>
      )}

      {delSheet && (
        <Sheet title="Delete account" onClose={() => setDelSheet(false)}>
          <div className="cr2-danger">
            <b>This can&apos;t be undone.</b>
            <ul>
              <li>Your profile, connections and credits are removed.</li>
              <li>Samples still in progress ({active}) must be finished first, or the Techwide team marks them undelivered.</li>
              <li>Commission TikTok already owes you is paid by TikTok as usual.</li>
            </ul>
          </div>
          <label className="v2-field">
            Type DELETE to confirm
            <input className="np-input" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" />
          </label>
          <button type="button" className="np-btn cr2-delbtn" disabled={delText !== "DELETE"} onClick={() => { setDelSheet(false); toast("Preview only: nothing was deleted"); }}>
            Delete my account
          </button>
          <button type="button" className="btn-outline" onClick={() => setDelSheet(false)}>Keep my account</button>
        </Sheet>
      )}

      {pwSheet && (
        <Sheet title={hasPw ? "Change password" : "Set a password"} onClose={() => setPwSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>You signed in with TikTok. A password also lets you sign in with your email.</p>
          <label className="v2-field">
            New password
            <input type="password" className="np-input" autoComplete="new-password" value={pw[0]} onChange={(e) => setPw([e.target.value, pw[1]])} />
            <small>At least 8 characters</small>
          </label>
          <label className="v2-field">
            Type it again
            <input type="password" className="np-input" autoComplete="new-password" value={pw[1]} onChange={(e) => setPw([pw[0], e.target.value])} />
            {pw[1] && pw[0] !== pw[1] && <small className="cr2-red">These don&apos;t match yet</small>}
          </label>
          <button
            type="button"
            className="np-btn"
            disabled={pw[0].length < 8 || pw[0] !== pw[1]}
            onClick={() => { setHasPw(true); setPw(["", ""]); setPwSheet(false); toast(hasPw ? "Password changed" : "Password set"); }}
          >
            Save password
          </button>
        </Sheet>
      )}
    </div>
  );
}
