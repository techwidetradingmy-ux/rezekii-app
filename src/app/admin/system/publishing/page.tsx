"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Av, Chips, Meta, Pill } from "@/components/admin/bits";
import { FAILED_POSTS } from "@/lib/mock-admin";

type Post = (typeof FAILED_POSTS)[number] & { state?: "Retrying" | "Published" | "User notified" };
const PLATFORMS = ["All", "TikTok", "Instagram", "Facebook", "Threads"];

/** Publishing ops: failed posts across every user, with retry where it can help and a nudge where the user must act. */
export default function PublishingOps() {
  const { toast } = useDemo();
  const [list, setList] = useState<Post[]>(FAILED_POSTS);
  const [pf, setPf] = useState("All");
  const [sum, setSum] = useState<{ tried: number; ok: number } | null>(null);

  const set = (id: string, patch: Partial<Post>) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const shown = list.filter((p) => pf === "All" || p.platform === pf);
  const retryable = list.filter((p) => p.retry && !p.state);
  const left = list.filter((p) => !p.state);

  const retry = (ids: string[]) => {
    ids.forEach((id) => set(id, { state: "Retrying" }));
    window.setTimeout(() => {
      ids.forEach((id) => set(id, { state: "Published", attempts: (list.find((x) => x.id === id)?.attempts ?? 0) + 1 }));
      if (ids.length > 1) setSum({ tried: ids.length, ok: ids.length });
      toast(ids.length > 1 ? `${ids.length} retried · all published` : "Retried · published");
    }, 1400);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Publishing Ops" sub="Failed posts. Retry, or tell the user to act.">
        <button type="button" className="np-btn v2-btn-sm" disabled={retryable.length === 0} onClick={() => retry(retryable.map((p) => p.id))}>
          <Icon name="refresh" size={16} /> Retry all ({retryable.length})
        </button>
      </Title>

      <div className="v2-grid4 ad-stats">
        <div className="v2-stat"><small>Published today</small><b>640</b><em className="up">98.1% succeeded</em></div>
        <div className="v2-stat"><small>Still failed</small><b style={{ color: left.length ? "var(--red)" : undefined }}>{left.length}</b><em>Last 48 hours</em></div>
        <div className="v2-stat"><small>Need user action</small><b>{list.filter((p) => !p.retry && !p.state).length}</b><em>Reconnect or fix video</em></div>
      </div>

      {sum && (
        <div className="v2-alert green"><Icon name="check" size={18} /><span>Retried {sum.tried} · {sum.ok} published · 0 failed</span><button type="button" onClick={() => setSum(null)}>OK</button></div>
      )}

      <Chips label="Platform" value={pf} onChange={setPf} options={PLATFORMS.map((p) => [p, p === "All" ? list.length : list.filter((x) => x.platform === p).length] as [string, number])} />

      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {shown.map((p) => (
            <div key={p.id} className="ad-row" style={p.state === "Published" ? { opacity: 0.6 } : undefined}>
              <Av name={p.who} size={36} />
              <span className="main">
                <b>{p.caption}</b>
                <small>{p.who} · {p.role} · {p.platform} · {p.when} · tried {p.attempts}×</small>
                {!p.state && <small className="ad-down">{p.error}</small>}
              </span>
              <span className="ad-tag gray">{p.id}</span>
              {p.state === "Published" ? (
                <Pill tone="ok">Published</Pill>
              ) : p.state === "Retrying" ? (
                <Pill tone="info">Retrying…</Pill>
              ) : p.state === "User notified" ? (
                <Pill tone="mute">User notified</Pill>
              ) : p.retry ? (
                <button type="button" className="np-btn v2-btn-sm" onClick={() => retry([p.id])}><Icon name="refresh" size={15} /> Retry</button>
              ) : (
                <button type="button" className="ad-btn-ghost" onClick={() => { set(p.id, { state: "User notified" }); toast(`${p.who} notified (app and email)`); }}><Icon name="bell" size={15} /> Notify user</button>
              )}
            </div>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0", margin: 0 }}>Nothing failed on {pf}.</p>}
        </div>
      </section>
      <Meta range="Last 48 hours" source="Rezekii publishing engine" />
    </div>
  );
}
