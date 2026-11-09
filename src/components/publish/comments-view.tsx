"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logos";
import { Empty, Loading, Title } from "@/components/ui";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, tx } from "@/lib/i18n/lang";
import type { Comment, CommentAction, CommentedPost } from "@/integrations/meta/comments.ts";
import type { ChannelComments } from "@/modules/social/comments.ts";
import "@/app/social.css";

type Ch = { id: string; platform: "facebook" | "instagram"; name: string; status: "active" | "reconnect" };
type Account = { id: string; platform: string; name: string | null; username: string | null; status: "active" | "reconnect" };
const DONE: Record<CommentAction, string> = { reply: tx("Reply sent."), hide: tx("Comment hidden."), unhide: tx("Comment shown again."), delete: tx("Comment deleted.") };
const FILTERS = ["All", "Not Answered"] as const;

/** A comment nobody from the channel has answered yet. */
const unanswered = (c: Comment) => !c.mine && !c.replies.some((r) => r.mine);

/** Changes one comment (or one reply) wherever it sits in the list. */
function update(posts: CommentedPost[], id: string, change: (c: Comment) => Comment | null): CommentedPost[] {
  const walk = (list: Comment[]): Comment[] => list.flatMap((c) => (c.id === id ? [change(c)].filter((x): x is Comment => !!x) : [{ ...c, replies: walk(c.replies) }]));
  const size = (list: Comment[]) => list.length + list.reduce((s, c) => s + c.replies.length, 0);
  return posts.map((p) => {
    const comments = walk(p.comments);
    return { ...p, comments, total: Math.max(0, p.total + size(comments) - size(p.comments)) };
  });
}

async function read(id: string): Promise<{ data: ChannelComments | null; error: string }> {
  try {
    const r = await fetch(`/api/social/comments?account=${encodeURIComponent(id)}`, { cache: "no-store" });
    const b = (await r.json().catch(() => ({}))) as ChannelComments & { error?: string };
    return r.ok ? { data: b, error: "" } : { data: null, error: b.error ?? tx("That didn't work. Try again.") };
  } catch {
    return { data: null, error: tx("That didn't work. Try again.") };
  }
}

/**
 * Comments (owner, 9 Nov 2026, after Meta approved the app): the latest comments on one of the account's Facebook Pages or Instagram
 * accounts, with Reply, Hide and Delete. Creators and sellers share it; `newPost` is where channels are connected.
 */
export function CommentsView({ newPost }: { newPost: string }) {
  const t = useT();
  const lang = useLang();
  const [channels, setChannels] = useState<Ch[] | null>(null);
  const [hasThreads, setHasThreads] = useState(false);
  const [channel, setChannel] = useState("");
  const [data, setData] = useState<ChannelComments | null>(null);
  const [loading, setLoading] = useState(false);
  const [round, setRound] = useState(0);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [busy, setBusy] = useState("");
  const [replying, setReplying] = useState("");
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState("");
  const [note, setNote] = useState("");
  const ch = channels?.find((c) => c.id === channel);

  useEffect(() => {
    let live = true;
    fetch("/api/social/accounts", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ accounts?: Account[] }>)
      .catch(() => ({ accounts: [] as Account[] }))
      .then((b) => {
        if (!live) return;
        const all = b.accounts ?? [];
        const list = all.flatMap((a): Ch[] => (a.platform === "facebook" || a.platform === "instagram" ? [{ id: a.id, platform: a.platform, name: a.name ?? a.username ?? a.platform, status: a.status }] : []));
        setChannels(list);
        setHasThreads(all.some((a) => a.platform === "threads"));
        const first = list.find((c) => c.status === "active")?.id ?? list[0]?.id ?? "";
        setChannel(first);
        setLoading(!!first);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!channel) return;
    let live = true;
    read(channel).then((r) => {
      if (!live) return;
      setData(r.data);
      setError(r.error);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [channel, round]);

  function load(id = channel) {
    setLoading(true);
    setError("");
    setNote("");
    setReplying("");
    setDeleting("");
    if (id === channel) setRound((n) => n + 1);
    else {
      setData(null);
      setChannel(id);
    }
  }

  async function act(c: Comment, action: CommentAction) {
    if (!ch || busy) return;
    setBusy(c.id + action);
    setNote("");
    try {
      const r = await fetch("/api/social/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: ch.id, comment: c.id, action, message: action === "reply" ? draft : "" }) });
      const b = (await r.json().catch(() => ({}))) as { id?: string | null; error?: string };
      if (!r.ok) {
        setNote(b.error ?? t("That didn't work. Try again."));
        return;
      }
      setData((d) => {
        if (!d) return d;
        if (action === "delete") return { ...d, posts: update(d.posts, c.id, () => null) };
        if (action === "hide" || action === "unhide") return { ...d, posts: update(d.posts, c.id, (x) => ({ ...x, hidden: action === "hide" })) };
        const mine: Comment = { id: b.id ?? `${c.id}-reply-${Date.now()}`, text: draft.trim(), at: new Date().toISOString(), author: ch.name, mine: true, hidden: false, canHide: false, canDelete: true, replies: [] };
        return { ...d, posts: update(d.posts, c.id, (x) => ({ ...x, replies: [...x.replies, mine] })) };
      });
      if (action === "reply") {
        setReplying("");
        setDraft("");
      }
      setDeleting("");
      setNote(t(DONE[action]));
    } finally {
      setBusy("");
    }
  }

  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(dateLocale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" }) : "");
  const who = (c: Comment) => (c.mine ? `${ch?.name ?? ""} · ${t("You")}` : c.author ?? (ch?.platform === "instagram" ? t("Instagram User") : t("Facebook User")));
  const title = <Title title={t("Comments")} sub={`${t("Reply to, hide or delete comments on your latest 10 posts, newest first.")}${hasThreads ? ` ${t("Threads replies aren't available here yet.")}` : ""}`} />;

  function row(c: Comment, top: boolean) {
    return (
      <li key={c.id} className={`cm-c${c.hidden ? " hid" : ""}${c.mine ? " mine" : ""}`}>
        <div className="cm-h">
          <b>{who(c)}</b>
          <small>{when(c.at)}</small>
          {c.hidden && <span className="badge badge-gray">{t("Hidden")}</span>}
        </div>
        <p className="cm-t">{c.text}</p>
        {deleting === c.id ? (
          <div className="cm-ask" role="group" aria-label={t("Delete this comment? It can't be undone.")}>
            <span>{t("Delete this comment? It can't be undone.")}</span>
            <button type="button" className="btn-outline cm-red" disabled={!!busy} onClick={() => act(c, "delete")}>{busy === c.id + "delete" ? t("Deleting…") : t("Delete")}</button>
            <button type="button" className="btn-outline" disabled={!!busy} onClick={() => setDeleting("")}>{t("Keep")}</button>
          </div>
        ) : (
          <div className="cm-a">
            {top && <button type="button" onClick={() => { setReplying(replying === c.id ? "" : c.id); setDraft(""); }} aria-expanded={replying === c.id}>{t("Reply")}</button>}
            {c.canHide && <button type="button" disabled={!!busy} onClick={() => act(c, c.hidden ? "unhide" : "hide")}>{busy === c.id + "hide" || busy === c.id + "unhide" ? "…" : c.hidden ? t("Show") : t("Hide")}</button>}
            {c.canDelete && <button type="button" disabled={!!busy} onClick={() => setDeleting(c.id)}>{t("Delete")}</button>}
          </div>
        )}
        {top && replying === c.id && (
          <form className="cm-reply" onSubmit={(e) => { e.preventDefault(); act(c, "reply"); }}>
            <textarea className="np-input" rows={2} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("Write a reply…")} aria-label={t("Reply")} autoFocus />
            <div className="cm-rb">
              <button type="submit" className="np-btn v2-btn-sm" disabled={!draft.trim() || !!busy}>{busy === c.id + "reply" ? t("Sending…") : t("Send")}</button>
              <button type="button" className="btn-outline" onClick={() => { setReplying(""); setDraft(""); }}>{t("Cancel")}</button>
            </div>
          </form>
        )}
        {c.replies.length > 0 && <ul className="cm-r">{c.replies.map((r) => row(r, false))}</ul>}
      </li>
    );
  }

  if (!channels) return <div className="v2-stack v2-in" style={{ gap: 16 }}>{title}<Loading text={t("Loading your channels…")} /></div>;
  if (!channels.length)
    return (
      <div className="v2-stack v2-in" style={{ gap: 16 }}>
        {title}
        <Empty title={t("No Facebook or Instagram Yet")} line={t("Connect a Facebook Page or Instagram account to answer its comments here.")} href={newPost} cta={t("Connect a Channel")} />
      </div>
    );

  const posts = (data?.posts ?? []).map((p) => ({ ...p, comments: filter === "Not Answered" ? p.comments.filter(unanswered) : p.comments })).filter((p) => p.comments.length);
  const open = (data?.posts ?? []).reduce((s, p) => s + p.comments.filter(unanswered).length, 0);

  return (
    <div className="v2-stack v2-in cm" style={{ gap: 16 }}>
      {title}
      <div className="cm-top">
        <label className="cm-pick">
          {ch && <BrandLogo name={ch.platform === "facebook" ? "Facebook" : "Instagram"} size={24} />}
          <select className="np-input" aria-label={t("Channel")} value={channel} onChange={(e) => load(e.target.value)}>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.platform === "facebook" ? "Facebook" : "Instagram"}</option>)}
          </select>
        </label>
        <div className="np-seg" role="group" aria-label={t("Show")}>
          {FILTERS.map((f) => <button key={f} type="button" className={filter === f ? "on" : undefined} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "Not Answered" && open ? t("Not Answered · {n}", { n: open }) : t(f)}</button>)}
        </div>
        <button type="button" className="btn-outline" disabled={loading} onClick={() => load()}>{loading ? t("Loading…") : t("Refresh")}</button>
      </div>
      {note && <p className="np-note" role="status">{note}</p>}
      {error && <p className="np-note cm-err" role="alert">{error}</p>}
      {loading && !data && <Loading text={t("Loading comments…")} />}
      {data?.problem && (
        <Empty title={data.problem === "reconnect" ? t("Connect This Channel Again") : t("One More Step")} line={data.problem === "reconnect" ? t("This channel needs connecting again.") : t("Connect this channel again once so Meta allows reading its comments.")} href={newPost} cta={t("Connect Again")} />
      )}
      {data && !data.problem && !posts.length && <p className="v2-muted">{filter === "Not Answered" ? t("Every comment has an answer.") : t("No comments on your latest 10 posts yet.")}</p>}
      {posts.map((p) => (
        <section key={p.id} className="v2-card cm-post">
          <header className="cm-ph">
            <span className="cm-th">
              {p.thumb && (
                // Meta's signed picture link, so a plain img.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumb} alt="" />
              )}
            </span>
            <span className="cm-pt">
              <b>{p.caption || t("No caption")}</b>
              <small>{when(p.at)} · {p.total === 1 ? t("{n} comment", { n: p.total }) : t("{n} comments", { n: p.total })}</small>
            </span>
            {p.url && <a className="btn-outline cm-open" href={p.url} target="_blank" rel="noreferrer">{t("Open")}</a>}
          </header>
          <ul className="cm-list">{p.comments.map((c) => row(c, true))}</ul>
        </section>
      ))}
      <Link href={newPost} className="v2-muted cm-link">{t("Connect another channel")}</Link>
    </div>
  );
}
