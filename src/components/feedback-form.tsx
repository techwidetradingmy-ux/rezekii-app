"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Seg } from "@/components/ui";

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
 * screenshot if it helps, choose how we reply. The page and device go along so the team can act on it fast.
 */
export function FeedbackForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState(TYPES[0]);
  const [msg, setMsg] = useState("");
  const [shot, setShot] = useState<string | null>(null);
  const [reply, setReply] = useState<"WhatsApp" | "Email" | "No need">("WhatsApp");
  const [face, setFace] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="fb-done" aria-live="polite">
        <span className="v2-medal green" style={{ width: 64, height: 64 }}><Icon name="check" size={28} width={2.6} /></span>
        <b>Thanks, we got it!</b>
        <p className="v2-muted" style={{ margin: 0 }}>{reply === "No need" ? "Every message is read by the team." : `We usually reply within 1 working day by ${reply}.`}</p>
        <button type="button" className="np-btn" onClick={onDone}>Done</button>
      </div>
    );
  }

  const send = () => {
    if (!msg.trim()) return setErr("Write a few words first.");
    setSent(true);
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
          <span className="fb-file"><Icon name="doc" size={16} /><span>{shot}</span><button type="button" className="v2-iconbtn" aria-label="Remove screenshot" onClick={() => setShot(null)}><Icon name="x" size={15} /></button></span>
        ) : (
          <label className="btn-outline v2-btn-sm fb-add">
            <Icon name="plus" size={15} /> Add a screenshot
            <input type="file" accept="image/*" hidden onChange={(e) => setShot(e.target.files?.[0]?.name ?? null)} />
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

      <div className="fb-sec">
        <b>How should we reply?</b>
        <Seg value={reply} options={["WhatsApp", "Email", "No need"] as const} onChange={setReply} />
      </div>

      <small className="fb-note"><Icon name="info" size={14} /> We attach this page and your device, so we can fix things faster.</small>
      <button type="button" className="np-btn" onClick={send}><Icon name="send" size={17} /> Send Feedback</button>
    </div>
  );
}
