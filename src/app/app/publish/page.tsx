"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, Seg, Title } from "@/components/ui";
import { Dot, PlatformIcon } from "@/components/creator2/bits";
import { PublishFly } from "@/components/creator2/publish-fly";
import { SOCIALS, product } from "@/lib/mock";
import { CAPTION_MAX, PLATFORMS, type Platform } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const COVER = product("p21").img;
const BASE = "Thermos test part 3: is coffee still hot after 12 hours? I tried it on a full work day. Link is in my showcase.";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRESETS: [string, string][] = [["Today 8:00 PM", "2026-10-28T20:00"], ["Tomorrow 12:30 PM", "2026-10-29T12:30"], ["Fri 9:00 PM", "2026-10-30T21:00"]];

/** "2026-10-29T20:00" → "Thu 29 Oct, 8:00 PM" (no locale lookups, so server and browser agree). */
function when(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return "at the time you picked";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const h = Number(m[4]);
  return `${DAYS[d.getDay()]} ${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
}

const HANDLE: Record<Platform, string> = Object.fromEntries(SOCIALS.map((s) => [s.name, s.handle])) as Record<Platform, string>;

/** New post: one video, several platforms, each with its own caption and checks. */
export default function PublishNew() {
  const { toast } = useDemo();
  const [video, setVideo] = useState<"none" | "uploading" | "ready">("none");
  const [pct, setPct] = useState(0);
  const [connected, setConnected] = useState<Record<Platform, boolean>>(
    Object.fromEntries(SOCIALS.map((s) => [s.name, s.linked])) as Record<Platform, boolean>,
  );
  const [picked, setPicked] = useState<Platform[]>([...PLATFORMS]);
  const [tabPick, setTab] = useState<"All" | Platform>("All");
  const [base, setBase] = useState(BASE);
  const [own, setOwn] = useState<Partial<Record<Platform, string>>>({});
  const [mode, setMode] = useState<"Post now" | "Schedule">("Post now");
  const [at, setAt] = useState(PRESETS[0][1]);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    if (video !== "uploading") return;
    const id = window.setInterval(() => setPct((p) => {
      if (p >= 100) { window.clearInterval(id); setVideo("ready"); return 100; }
      return p + 12;
    }), 120);
    return () => window.clearInterval(id);
  }, [video]);

  const caption = (p: Platform) => own[p] ?? base;
  const toggle = (p: Platform) => setPicked((l) => (l.includes(p) ? l.filter((x) => x !== p) : PLATFORMS.filter((x) => x === p || l.includes(x))));
  const connect = (p: Platform) => setConnected((c) => ({ ...c, [p]: true }));
  const ordered = PLATFORMS.filter((p) => picked.includes(p));
  const schedule = mode === "Schedule";
  const tab: "All" | Platform = tabPick !== "All" && !ordered.includes(tabPick) ? "All" : tabPick;
  const ready = video === "ready" && ordered.length > 0;

  const checks: { kind: "ok" | "warn" | "bad"; who: string; text: string }[] = [];
  if (video !== "ready") checks.push({ kind: "bad", who: "Video", text: "Add a video first (9:16, up to 10 minutes)." });
  for (const p of ordered) {
    const len = caption(p).length;
    if (!connected[p]) { checks.push({ kind: "bad", who: p, text: `Not connected. Connect ${p} first, or untick it.` }); continue; }
    if (len > CAPTION_MAX[p]) { checks.push({ kind: "warn", who: p, text: `Caption is ${len} characters; ${p} allows ${CAPTION_MAX[p].toLocaleString("en-MY")}. Shorten it in the ${p} tab.` }); continue; }
    if (p === "TikTok") checks.push({ kind: "warn", who: "TikTok", text: "Public posting is waiting for TikTok's review, so it goes to your TikTok drafts for now. You tap Post in the TikTok app." });
    if (p === "Instagram") checks.push({ kind: "ok", who: "Instagram", text: "Reel · 9:16 · 42 s (up to 90 s)." });
    if (p === "Facebook") checks.push({ kind: "ok", who: "Facebook", text: `Reel on your Page, ${HANDLE.Facebook}.` });
    if (p === "Threads") checks.push({ kind: "ok", who: "Threads", text: `Caption ${len} of 500 characters.` });
  }

  const reset = () => {
    setFlying(false);
    setVideo("none");
    setPct(0);
    setBase(BASE);
    setOwn({});
    setTab("All");
    setMode("Post now");
  };

  const editing = tab === "All" ? base : caption(tab);
  const max = tab === "All" ? Math.min(...ordered.map((p) => CAPTION_MAX[p]), 2200) : CAPTION_MAX[tab];

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="New post" sub="One video to TikTok, Instagram, Facebook and Threads">
        <Link href="/app/publish/calendar" className="btn-outline v2-btn-sm"><Icon name="cal" size={16} /> Calendar</Link>
      </Title>

      <div className="v2-split">
        <div className="v2-stack" style={{ gap: 16 }}>
          <section className="v2-card">
            <h2 className="v2-h2">Video</h2>
            {video === "none" && (
              <button type="button" className="cr2-upload" onClick={() => { setPct(0); setVideo("uploading"); }}>
                <span className="cr2-upload-ico"><Icon name="video" size={26} /></span>
                <b>Tap to add a video</b>
                <span className="v2-small">9:16 works on every platform · MP4 or MOV · up to 10 minutes</span>
              </button>
            )}
            {video === "uploading" && (
              <div className="cr2-asset">
                <span className="cr2-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={COVER} alt="" style={{ opacity: 0.4 }} />
                </span>
                <span>
                  <b>thermos-part3.mp4</b>
                  <Progress value={pct} />
                  <span className="v2-small">Uploading… {Math.min(pct, 100)}%</span>
                </span>
              </div>
            )}
            {video === "ready" && (
              <div className="cr2-asset">
                <span className="cr2-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={COVER} alt="Video cover" />
                  <span>0:42</span>
                </span>
                <span>
                  <b>thermos-part3.mp4</b>
                  <span className="v2-small">9:16 · 42 seconds · 38 MB</span>
                  <span className="badge" style={{ alignSelf: "flex-start" }}>Ready</span>
                  <button type="button" className="v2-link" style={{ alignSelf: "flex-start" }} onClick={() => setVideo("none")}>Replace video</button>
                </span>
              </div>
            )}
          </section>

          <section className="v2-card">
            <div className="v2-card-h">
              <h2 className="v2-h2">Post to</h2>
              <span className="v2-small">{ordered.length} selected</span>
            </div>
            <div className="cr2-plats">
              {PLATFORMS.map((p) => {
                const on = picked.includes(p);
                const ok = connected[p];
                return (
                  <div
                    key={p}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    className={`cr2-plat ${on ? "on" : ""} ${ok ? "" : "off"}`}
                    onClick={() => toggle(p)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(p); } }}
                  >
                    <span className="cr2-tick"><Icon name="check" size={14} width={3} /></span>
                    <PlatformIcon name={p} size={40} />
                    <b>{p === "Facebook" ? "Facebook Page" : p}</b>
                    {ok ? (
                      <small>{HANDLE[p] || "Connected"}</small>
                    ) : (
                      <>
                        <small style={{ color: "var(--amber)", fontWeight: 800 }}>Connect first</small>
                        <button type="button" className="np-btn v2-btn-sm" onClick={(e) => { e.stopPropagation(); connect(p); toast(`${p} connected`); }}>Connect</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="v2-card">
            <h2 className="v2-h2">Caption</h2>
            <div className="cr2-tabs" role="tablist" aria-label="Caption per platform">
              <button type="button" role="tab" aria-selected={tab === "All"} className={tab === "All" ? "on" : undefined} onClick={() => setTab("All")}>All platforms</button>
              {ordered.map((p) => (
                <button key={p} type="button" role="tab" aria-selected={tab === p} className={tab === p ? "on" : undefined} onClick={() => setTab(p)}>
                  {p}{own[p] !== undefined && <i aria-label="edited" />}
                </button>
              ))}
            </div>
            <textarea
              className="np-input"
              rows={5}
              value={editing}
              onChange={(e) => (tab === "All" ? setBase(e.target.value) : setOwn((o) => ({ ...o, [tab]: e.target.value })))}
              aria-label={tab === "All" ? "Caption for all platforms" : `Caption for ${tab}`}
            />
            <div className="v2-row" style={{ justifyContent: "space-between" }}>
              <span className="v2-small">
                {tab === "All" ? "Used everywhere unless you write a different one in a platform's tab." : own[tab] !== undefined ? `Only for ${tab}.` : `Same as All platforms. Type to make a ${tab} version.`}
              </span>
              <span className="v2-small v2-num" style={{ color: editing.length > max ? "var(--red)" : undefined }}>{editing.length} / {max.toLocaleString("en-MY")}</span>
            </div>
            {tab !== "All" && own[tab] !== undefined && (
              <button type="button" className="v2-link" style={{ alignSelf: "flex-start" }} onClick={() => setOwn((o) => { const n = { ...o }; delete n[tab]; return n; })}>
                Use the main caption again
              </button>
            )}
          </section>
        </div>

        <div className="v2-stack" style={{ gap: 16, position: "sticky", top: 90 }}>
          <section className="v2-card">
            <h2 className="v2-h2">When</h2>
            <Seg value={mode} options={["Post now", "Schedule"] as const} onChange={setMode} />
            {schedule && (
              <>
                <div className="v2-chips">
                  {PRESETS.map(([label, v]) => (
                    <button key={v} type="button" className={`v2-chip ${at === v ? "on" : ""}`} onClick={() => setAt(v)}>{label}</button>
                  ))}
                </div>
                <label className="v2-field">
                  Date and time (Malaysia time)
                  <input type="datetime-local" className="np-input" value={at} min="2026-10-28T09:15" onChange={(e) => setAt(e.target.value)} />
                </label>
              </>
            )}
          </section>

          <section className="v2-card">
            <h2 className="v2-h2">Checks</h2>
            <div className="cr2-checks">
              {checks.length === 0 && <span className="v2-muted">Pick at least one platform.</span>}
              {checks.map((c, i) => (
                <div key={i} className="cr2-checkrow">
                  <Dot kind={c.kind} />
                  <span><b>{c.who}</b> · {c.text}</span>
                </div>
              ))}
            </div>
          </section>

          <button type="button" className="np-btn" disabled={!ready} onClick={() => setFlying(true)}>
            <Icon name={schedule ? "cal" : "send"} size={18} />
            {schedule ? `Schedule for ${when(at)}` : `Post now to ${ordered.length} platform${ordered.length === 1 ? "" : "s"}`}
          </button>
          <button type="button" className="btn-outline" style={{ height: 46 }} onClick={() => toast("Draft saved")}>Save draft</button>
          {!ready && <span className="v2-small" style={{ textAlign: "center" }}>{video !== "ready" ? "Add a video to continue." : "Pick at least one platform."}</span>}
        </div>
      </div>

      {flying && (
        <PublishFly
          cover={COVER}
          targets={ordered}
          connected={connected}
          schedule={schedule}
          whenLabel={schedule ? `on ${when(at)}` : "now"}
          onConnect={connect}
          onClose={() => setFlying(false)}
          onNew={reset}
        />
      )}
    </div>
  );
}
