"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiHead, Stepper, Tip, Title } from "@/components/ui";
import { PickList } from "@/components/pick-list";
import { AI_EXAMPLES, MY_SPOT, PLATFORMS, VIDEO_TYPE_LABEL, VIDEO_TYPES, type WaitlistAnswers } from "@/lib/mock-ai-video";
import { useLang, useT } from "@/lib/i18n/client";
import "@/app/ai-video.css";

/** Her waitlist spot, remembered for this browser tab when signed out (the preview). Signed in, it's kept on her account. */
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


/** One example: plays muted while it's on screen; a tap turns the sound on or off. */
function Example({ id, type, product }: (typeof AI_EXAMPLES)[number]) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  const t = useT();
  const kind = t(VIDEO_TYPE_LABEL[type]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <li className="av-ex">
      <button type="button" className="av-ex-vid" aria-label={sound ? t("{type}: {product}. Mute", { type: kind, product }) : t("{type}: {product}. Play with sound", { type: kind, product })} onClick={() => { const v = ref.current; if (!v) return; v.muted = sound; setSound(!sound); v.play().catch(() => {}); }}>
        <video ref={ref} src={`/ai-videos/${id}.mp4`} poster={`/ai-videos/${id}.jpg`} muted loop playsInline preload="none" />
        <span className="av-ex-sound">{sound ? t("Sound On") : t("Tap for Sound")}</span>
      </button>
      <b>{kind}</b>
      <small>{product}</small>
    </li>
  );
}

/**
 * AI Video (owner, 29 Oct 2026): not launched yet. We collect interest first: she joins the waitlist by saying what she'd make,
 * how often and where, and the waitlist becomes the first trial batch at launch. Nothing here claims the tool works yet.
 */
export default function AiVideo() {
  const { linked, setLinked, toast, live } = useDemo();
  const t = useT();
  const lang = useLang();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [types, setTypes] = useState<WaitlistAnswers["types"]>([]);
  const [videos, setVideos] = useState(10);
  const [platforms, setPlatforms] = useState<WaitlistAnswers["platforms"]>(["TikTok"]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  // Signed in (owner, 31 Oct 2026): her real place on the waitlist.
  useEffect(() => {
    if (!live) {
      setSaved(readSaved());
      setLoaded(true);
      return;
    }
    fetch("/api/v2/ai-video", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entry: Saved | null } | null) => setSaved(d?.entry ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [live]);

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
    if (!types.length) return setErr(t("Pick at least 1 type of video."));
    if (!platforms.length) return setErr(t("Pick at least 1 platform."));
    const next: Saved = {
      types: VIDEO_TYPES.filter((x) => types.includes(x)),
      videos,
      platforms: PLATFORMS.filter((p) => platforms.includes(p)),
      note: note.trim() || undefined,
      spot: saved?.spot ?? MY_SPOT,
    };
    if (live) {
      setBusy(true);
      fetch("/api/v2/ai-video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next) })
        .then(async (r) => {
          const d = (await r.json().catch(() => ({}))) as { entry?: Saved; error?: string };
          if (!r.ok || !d.entry) return setErr(d.error ? t(d.error) : t("Didn't save. Please try again."));
          if (saved) toast(t("Waitlist answers saved"));
          setSaved(d.entry);
          setEditing(false);
        })
        .catch(() => setErr(t("Didn't save. Please try again.")))
        .finally(() => setBusy(false));
      return;
    }
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    if (saved) toast(t("Waitlist answers saved"));
    setSaved(next);
    setEditing(false);
  };

  return (
    <div className="v2-stack v2-in av-page" style={{ gap: 16 }}>
      <Title ai title={t("AI Video")} sub={t("Short product videos made with AI, for you to check and post. Not launched yet.")} />

      <section className="v2-card v2-aicard av-hero">
        <AiHead title={t("Product Link to Video")} sub={t("Turn a product link into short videos to post")} tip={<Tip text={t("We're still building it. Paste a TikTok Shop product link, pick a type of video, and it makes a few short ones. You check each video and post it yourself. People on the waitlist try it first.")} />}>
          <span className="badge badge-amber">{t("Coming Soon")}</span>
        </AiHead>
      </section>

      <section className="v2-card av-examples">
        <div className="v2-card-h">
          <h2 className="v2-h2">{t("See What It Makes")} <Tip text={t("Real videos our team made with AI for TikTok Shop products, cut to 15 seconds. Yours are made from your product link.")} /></h2>
        </div>
        <ul className="av-rail">
          {AI_EXAMPLES.map((x) => <Example key={x.id} {...x} />)}
        </ul>
      </section>

      {!loaded ? null : saved && !editing ? (
        <section className="v2-card av-joined" aria-live="polite">
          <span className="v2-medal green" style={{ width: 76, height: 76 }}><Icon name="check" size={32} width={2.6} /></span>
          <b>{t("You're #{n} on the waitlist", { n: saved.spot })}</b>
          <p className="v2-muted" style={{ margin: 0 }}>{t("We'll invite the first batch soon.")}</p>
          <p className="av-sum">
            {saved.types.map((x) => t(VIDEO_TYPE_LABEL[x])).join(lang === "zh" ? "、" : ", ")} · {saved.videos === 1 ? t("{n} video a month", { n: 1 }) : t("{n} videos a month", { n: saved.videos })} · {saved.platforms.join(", ")}
          </p>
          <button type="button" className="btn-outline v2-btn-sm" onClick={edit}><Icon name="edit" size={15} /> {t("Edit Answers")}</button>
        </section>
      ) : (
        <section className="v2-card av-form">
          <h2 className="v2-h2">{saved ? t("Edit Your Answers") : t("Join the Waitlist")}</h2>
          <div className="wf-rows">
            <div className="wf-row col">
              <span>{t("What would you make?")}</span>
              {/* A dropdown that takes several picks (owner, 3 Nov 2026: rows of bubbles looked messy). */}
              <PickList label={t("What would you make?")} multi placeholder={t("Choose the kinds of video")} options={VIDEO_TYPES.map((x) => [x, t(VIDEO_TYPE_LABEL[x])])} value={types} onChange={(v) => { setTypes(VIDEO_TYPES.filter((x) => v.includes(x))); setErr(""); }} />
            </div>
            <div className="wf-row">
              <span>{t("Videos a month")}</span>
              <Stepper label={t("Videos a month")} value={videos} min={1} max={60} onChange={setVideos} />
            </div>
            <div className="wf-row col">
              <span>{t("Where would you post?")}</span>
              <PickList label={t("Where would you post?")} multi placeholder={t("Choose where you'd post")} options={PLATFORMS.map((x) => [x, x])} value={platforms} onChange={(v) => { setPlatforms(PLATFORMS.filter((x) => v.includes(x))); setErr(""); }} />
            </div>
          </div>
          <textarea className="np-input wf-note-in" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Anything you'd want it to do? (optional)")} aria-label={t("Note (optional)")} />
          {err && <p className="wf-err" role="alert">{err}</p>}
          <button type="button" className="np-btn" disabled={busy} onClick={join}>{busy ? <span className="sl-spin" /> : saved ? t("Save") : t("Join Waitlist")}</button>
          <p className="wf-fine">
            {linked ? t("Free to join. You can change your answers any time.") : t("Joining needs your TikTok Shop linked.")}
          </p>
          {saved && <button type="button" className="wf-quiet" onClick={() => setEditing(false)}>{t("Cancel")}</button>}
        </section>
      )}
    </div>
  );
}
