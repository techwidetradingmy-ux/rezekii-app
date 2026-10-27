"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import type { Platform } from "@/lib/mock-creator2";
import { Dot, PlatformIcon } from "./bits";

type Result = { kind: "posted" | "scheduled" | "needs"; title: string; line: string; action?: "connect" | "tiktok" };

/**
 * The signature publish moment: the video card pops in, splits into one icon per platform, the icons fly out and tick
 * one by one, then a summary says what was posted, scheduled, or still needs you.
 */
export function PublishFly({ cover, targets, connected, schedule, whenLabel, onConnect, onClose, onNew }: {
  cover: string;
  targets: Platform[];
  connected: Record<Platform, boolean>;
  schedule: boolean;
  whenLabel: string;
  onConnect: (p: Platform) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  const { toast } = useDemo();
  const [split, setSplit] = useState(false);
  const [ticked, setTicked] = useState(0);
  const [summary, setSummary] = useState(false);
  const n = targets.length;

  useEffect(() => {
    const t: number[] = [];
    t.push(window.setTimeout(() => setSplit(true), 750));
    for (let i = 1; i <= n; i++) t.push(window.setTimeout(() => setTicked(i), 1450 + i * 380));
    t.push(window.setTimeout(() => setSummary(true), 1450 + n * 380 + 450));
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      t.forEach(clearTimeout);
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, []); // the sequence runs once per opening

  const result = (p: Platform): Result => {
    if (!connected[p]) return { kind: "needs", title: `${p}: connect first`, line: "Not connected yet. Connect it and we post there straight away.", action: "connect" };
    if (p === "TikTok")
      return schedule
        ? { kind: "scheduled", title: "TikTok: scheduled", line: `Goes to your TikTok drafts ${whenLabel}. Public posting is waiting for TikTok's review.` }
        : { kind: "needs", title: "TikTok: in your drafts", line: "Public posting is waiting for TikTok's review. Open TikTok to post it.", action: "tiktok" };
    return schedule ? { kind: "scheduled", title: `${p}: scheduled`, line: `Goes out ${whenLabel}.` } : { kind: "posted", title: `${p}: posted`, line: "The platform confirmed it." };
  };

  const results = targets.map((p) => ({ p, r: result(p) }));
  const count = (k: Result["kind"]) => results.filter((x) => x.r.kind === k).length;
  const tickColour = (k: Result["kind"]) => (k === "posted" ? "#00c073" : k === "scheduled" ? "#1d4ed8" : "#f5a623");

  return (
    <div className="cr2-fly" onClick={summary ? onClose : undefined}>
      <div className="cr2-fly-card" role="dialog" aria-modal="true" aria-label="Publishing" onClick={(e) => e.stopPropagation()}>
        <h2>{summary ? (schedule ? "All set" : "Sent") : schedule ? "Scheduling…" : "Publishing…"}</h2>
        <div className={`cr2-fly-stage ${split ? "split" : ""} ${summary ? "compact" : ""}`} aria-hidden="true">
          <div className="cr2-fly-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" />
          </div>
          {results.map(({ p, r }, i) => {
            const off = i - (n - 1) / 2;
            return (
              <div
                key={p}
                className={`cr2-fly-ico ${ticked > i ? "done" : ""}`}
                style={{ ["--tx" as string]: `${off * 74}px`, ["--ty" as string]: `${Math.abs(off) * 14 - 8}px`, ["--i" as string]: i }}
              >
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <PlatformIcon name={p} size={56} />
                  <span className="cr2-fly-tick" style={{ background: tickColour(r.kind) }}>
                    <Icon name={r.kind === "posted" ? "check" : r.kind === "scheduled" ? "cal" : "alert"} size={12} width={3} />
                  </span>
                </span>
                <small>{p}</small>
              </div>
            );
          })}
        </div>

        {summary ? (
          <div className="cr2-fly-sum">
            <div className="cr2-fly-counts">
              <span><b>{count("posted")}</b>Posted</span>
              <span><b>{count("scheduled")}</b>Scheduled</span>
              <span className={count("needs") ? "warn" : undefined}><b>{count("needs")}</b>Needs you</span>
            </div>
            <div>
              {results.map(({ p, r }) => (
                <div key={p} className={`cr2-fly-row ${r.action ? "act" : ""}`}>
                  <PlatformIcon name={p} size={36} />
                  <span>
                    <strong>{r.title}</strong>
                    <small>{r.line}</small>
                  </span>
                  {r.action === "connect" ? (
                    <button type="button" className="np-btn v2-btn-sm" onClick={() => { onConnect(p); toast(`${p} connected. ${schedule ? "Scheduled" : "Posted"} there too.`); }}>Connect</button>
                  ) : r.action === "tiktok" ? (
                    <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("Opening TikTok…")}>Open TikTok</button>
                  ) : (
                    <Dot kind={r.kind === "posted" ? "ok" : "sched"} />
                  )}
                </div>
              ))}
            </div>
            <div className="v2-row">
              <Link href="/app/publish/calendar" className="np-btn" style={{ flex: "1 1 160px" }}>See calendar</Link>
              <button type="button" className="btn-outline" style={{ flex: "1 1 120px", height: 48 }} onClick={onNew}>New post</button>
            </div>
          </div>
        ) : (
          <p className="v2-small" style={{ margin: 0, textAlign: "center" }}>One video, {n} platform{n === 1 ? "" : "s"}. Each one gets its own caption and checks.</p>
        )}
      </div>
    </div>
  );
}
