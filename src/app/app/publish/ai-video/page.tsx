"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiMark, Stepper, Tip, Title } from "@/components/ui";
import { AI_EXAMPLES, MY_SPOT, PLATFORMS, VIDEO_TYPES, type WaitlistAnswers } from "@/lib/mock-ai-video";
import "@/app/ai-video.css";

/** Her waitlist spot, remembered for this browser tab (the preview has no server). */
const KEY = "rz2_ai_video_waitlist";
type Saved = WaitlistAnswers & { spot: number };
function readSaved(): Saved | null {
  try {
    const s = sessionStorage.getItem(KEY);
    return s ? (JSON.parse(s) as Saved) : null;
  } catch {
    return null;
  }
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** One example: plays muted while it's on screen; a tap turns the sound on or off. */
function Example({ id, type, product }: (typeof AI_EXAMPLES)[number]) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <li className="av-ex">
      <button type="button" className="av-ex-vid" aria-label={`${type}: ${product}. ${sound ? "Mute" : "Play with sound"}`} onClick={() => { const v = ref.current; if (!v) return; v.muted = sound; setSound(!sound); v.play().catch(() => {}); }}>
        <video ref={ref} src={`/ai-videos/${id}.mp4`} poster={`/ai-videos/${id}.jpg`} muted loop playsInline preload="none" />
        <span className="av-ex-sound">{sound ? "Sound On" : "Tap for Sound"}</span>
      </button>
      <b>{type}</b>
      <small>{product}</small>
    </li>
  );
}

/**
 * AI Video (owner, 29 Oct 2026): not launched yet. We collect interest first: she joins the waitlist by saying what she'd make,
 * how often and where, and the waitlist becomes the first trial batch at launch. Nothing here claims the tool works yet.
 */
export default function AiVideo() {
  const { linked, setLinked, toast } = useDemo();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [types, setTypes] = useState<WaitlistAnswers["types"]>([]);
  const [videos, setVideos] = useState(10);
  const [platforms, setPlatforms] = useState<WaitlistAnswers["platforms"]>(["TikTok"]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setSaved(readSaved());
    setLoaded(true);
  }, []);

  const edit = () => {
    if (!saved) return;
    setTypes(saved.types);
    setVideos(saved.videos);
    setPlatforms(saved.platforms);
    setNote(saved.note ?? "");
    setErr("");
    setEditing(true);
  };
  const join = () => {
    if (!linked) return setLinked(true);
    if (!types.length) return setErr("Pick at least 1 type of video.");
    if (!platforms.length) return setErr("Pick at least 1 platform.");
    const next: Saved = {
      types: VIDEO_TYPES.filter((t) => types.includes(t)),
      videos,
      platforms: PLATFORMS.filter((p) => platforms.includes(p)),
      note: note.trim() || undefined,
      spot: saved?.spot ?? MY_SPOT,
    };
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    if (saved) toast("Waitlist answers saved");
    setSaved(next);
    setEditing(false);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="AI Video" sub="Short product videos made with AI, for you to check and post. Not launched yet." />

      <section className="v2-card av-hero">
        <AiMark size={52} />
        <span className="av-hero-txt">
          <span className="badge badge-amber">Coming soon</span>
          <b>
            Turn a product link into short videos to post
            <Tip text="We're still building it. Paste a TikTok Shop product link, pick a type of video, and it makes a few short ones. You check each video and post it yourself. People on the waitlist try it first." />
          </b>
        </span>
      </section>

      <section className="v2-card av-examples">
        <div className="v2-card-h">
          <h2 className="v2-h2">See What It Makes <Tip text="Real videos our team made with AI for TikTok Shop products, cut to 15 seconds. Yours are made from your product link." /></h2>
        </div>
        <ul className="av-rail">
          {AI_EXAMPLES.map((x) => <Example key={x.id} {...x} />)}
        </ul>
      </section>

      {!loaded ? null : saved && !editing ? (
        <section className="v2-card av-joined" aria-live="polite">
          <span className="v2-medal green" style={{ width: 76, height: 76 }}><Icon name="check" size={32} width={2.6} /></span>
          <b>You&apos;re #{saved.spot} on the waitlist</b>
          <p className="v2-muted" style={{ margin: 0 }}>We&apos;ll invite the first batch soon.</p>
          <p className="av-sum">
            {saved.types.join(", ")} · {saved.videos} video{saved.videos === 1 ? "" : "s"} a month · {saved.platforms.join(", ")}
          </p>
          <button type="button" className="btn-outline v2-btn-sm" onClick={edit}><Icon name="edit" size={15} /> Edit Answers</button>
        </section>
      ) : (
        <section className="v2-card av-form">
          <h2 className="v2-h2">{saved ? "Edit Your Answers" : "Join the Waitlist"}</h2>
          <div className="wf-rows">
            <div className="wf-row col">
              <span>What would you make?</span>
              <div className="v2-chips av-chips" role="group" aria-label="What would you make?">
                {VIDEO_TYPES.map((t) => {
                  const on = types.includes(t);
                  return (
                    <button key={t} type="button" className={`v2-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => { setTypes((l) => toggle(l, t)); setErr(""); }}>
                      {on && <Icon name="check" size={14} width={2.8} />}{t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="wf-row">
              <span>Videos a month</span>
              <Stepper label="Videos a month" value={videos} min={1} max={60} onChange={setVideos} />
            </div>
            <div className="wf-row col">
              <span>Where would you post?</span>
              <div className="v2-chips av-chips" role="group" aria-label="Where would you post?">
                {PLATFORMS.map((p) => {
                  const on = platforms.includes(p);
                  return (
                    <button key={p} type="button" className={`v2-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => { setPlatforms((l) => toggle(l, p)); setErr(""); }}>
                      {on && <Icon name="check" size={14} width={2.8} />}{p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <textarea className="np-input wf-note-in" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything you'd want it to do? (optional)" aria-label="Note (optional)" />
          {err && <p className="wf-err" role="alert">{err}</p>}
          <button type="button" className="np-btn" onClick={join}>{saved ? "Save" : "Join Waitlist"}</button>
          <p className="wf-fine">
            {linked ? "Free to join. You can change your answers any time." : "Joining needs your TikTok Shop linked."}
          </p>
          {saved && <button type="button" className="wf-quiet" onClick={() => setEditing(false)}>Cancel</button>}
        </section>
      )}
    </div>
  );
}
