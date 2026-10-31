"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Seg } from "@/components/ui";
import { useDemo } from "@/components/demo";

const TYPES: { key: string; icon: IconName; hint: string }[] = [
  { key: "Idea", icon: "spark", hint: "What would make Rezekii better for you?" },
  { key: "Something's broken", icon: "alert", hint: "What happened, and what did you expect instead?" },
  { key: "Question", icon: "info", hint: "What would you like to know?" },
  { key: "Compliment", icon: "star", hint: "What do you like? We'll share it with the team." },
];
const FACES = ["😞", "😕", "😐", "🙂", "😍"];
const MAX = 500;

/**
 * Feedback (owner, 30 Oct 2026: a complete form, friendly and easy). Pick what it's about, say it in your own words, add a
 * screenshot if it helps. No reply choice (owner, 1 Nov 2026): when the team answers, it's in the app. The page and device go
 * along so the team can act on it fast.
 */
export function FeedbackForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState(TYPES[0]);
  const [msg, setMsg] = useState("");
  const [shot, setShot] = useState<string | null>(null);
  const [face, setFace] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  // Signed in (owner, 31 Oct 2026): it's saved for the team, with a small copy of the screenshot.
  const { live } = useDemo();
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pickShot = (f: File | undefined) => {
    setShot(f?.name ?? null);
    setImg(null);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const pic = new Image();
    pic.onload = () => {
      const k = Math.min(1, 1000 / Math.max(pic.width, pic.height));
      const c = document.createElement("canvas");
      c.width = Math.round(pic.width * k);
      c.height = Math.round(pic.height * k);
      c.getContext("2d")?.drawImage(pic, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.7);
      setImg(data.length <= 700_000 ? data : null);
      URL.revokeObjectURL(url);
    };
    pic.src = url;
  };

  if (sent) {
    return (
      <div className="fb-done" aria-live="polite">
        <span className="v2-medal green" style={{ width: 64, height: 64 }}><Icon name="check" size={28} width={2.6} /></span>
        <b>Thanks, we got it!</b>
        <p className="v2-muted" style={{ margin: 0 }}>Every message is read by the team.</p>
        <button type="button" className="np-btn" onClick={onDone}>Done</button>
      </div>
    );
  }

  const send = () => {
    if (!msg.trim()) return setErr("Write a few words first.");
    if (!live) return setSent(true);
    setBusy(true);
    fetch("/api/v2/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: type.key, message: msg, mood: face === null ? null : face + 1, page: window.location.pathname, screenshot: img }),
    })
      .then(async (r) => (r.ok ? setSent(true) : setErr(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Didn't send. Please try again.")))
      .catch(() => setErr("Didn't send. Please try again."))
      .finally(() => setBusy(false));
  };

  return (
    <div className="fb-form">
      <p className="v2-muted" style={{ margin: 0 }}>Tell us anything. Every message is read by a real person.</p>

      <div className="fb-sec">
        <b>What&apos;s it about?</b>
        <div className="fb-types" role="radiogroup" aria-label="What it's about">
          {TYPES.map((t) => (
            <button key={t.key} type="button" role="radio" aria-checked={type.key === t.key} className={type.key === t.key ? "on" : undefined} onClick={() => setType(t)}>
              <Icon name={t.icon} size={18} width={2.2} />
              {t.key}
            </button>
          ))}
        </div>
      </div>

      <label className="fb-sec">
        <b>Tell us more</b>
        <textarea className="np-input" rows={4} maxLength={MAX} placeholder={type.hint} value={msg} onChange={(e) => { setMsg(e.target.value); setErr(""); }} aria-invalid={!!err} />
        <span className="fb-meta">{err ? <em className="fb-err">{err}</em> : <span />}<small>{msg.length}/{MAX}</small></span>
      </label>

      <div className="fb-sec">
        <b>Screenshot <span className="pf-opt">Optional</span></b>
        {shot ? (
          <span className="fb-file"><Icon name="doc" size={16} /><span>{shot}</span><button type="button" className="v2-iconbtn" aria-label="Remove screenshot" onClick={() => { setShot(null); setImg(null); }}><Icon name="x" size={15} /></button></span>
        ) : (
          <label className="btn-outline v2-btn-sm fb-add">
            <Icon name="plus" size={15} /> Add a screenshot
            <input type="file" accept="image/*" hidden onChange={(e) => pickShot(e.target.files?.[0])} />
          </label>
        )}
      </div>

      <div className="fb-sec">
        <b>How&apos;s Rezekii so far? <span className="pf-opt">Optional</span></b>
        <div className="fb-faces" role="radiogroup" aria-label="Your rating">
          {FACES.map((f, i) => (
            <button key={f} type="button" role="radio" aria-checked={face === i} aria-label={`${i + 1} of 5`} className={face === i ? "on" : undefined} onClick={() => setFace(face === i ? null : i)}>{f}</button>
          ))}
        </div>
      </div>

      <small className="fb-note"><Icon name="info" size={14} /> We attach this page and your device, so we can fix things faster.</small>
      <button type="button" className="np-btn" disabled={busy} onClick={send}>{busy ? <span className="sl-spin" /> : <><Icon name="send" size={17} /> Send Feedback</>}</button>
    </div>
  );
}
