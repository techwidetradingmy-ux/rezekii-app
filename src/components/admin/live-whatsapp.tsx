"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Chips, Pill, type Tone } from "@/components/admin/bits";
import { when } from "@/components/admin/live-lists";
import { labelCase } from "@/lib/label-case";

type Chat = {
  number_id: string; contact: string; name: string | null; last_at: string; last_text: string | null;
  unread: boolean; freeHours: number; member: { name: string; handle: string | null; role: string } | null;
};
type Msg = { wamid: string; direction: "in" | "out"; kind: string; body: string | null; media_id: string | null; media_type: string | null; status: string | null; error: string | null; sent_by: string | null; at: string };
type WaNumber = { id: string; account: string; phone: string; name: string; quality: string | null; status: string | null };
type Numbers = { ready: boolean; numbers: WaNumber[]; accounts: { id: string; on: boolean }[]; error?: string };

const API = "/api/v2/admin/whatsapp";
const STATUS: Record<string, string> = { accepted: "Sending", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed" };
const QUALITY: Record<string, [string, Tone]> = { GREEN: ["High Quality", "ok"], YELLOW: ["Medium Quality", "warn"], RED: ["Low Quality", "bad"] };
const who = (c: Chat) => c.name ?? c.member?.name ?? `+${c.contact}`;
const media = (id: string) => `${API}?media=${id}`;

/** Runs `fn` now and every `ms` while the page is open on screen. */
function usePoll(fn: () => void, ms: number, deps: unknown[]) {
  useEffect(() => {
    fn();
    const t = setInterval(() => { if (document.visibilityState === "visible") fn(); }, ms);
    return () => clearInterval(t);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Admin › Support › WhatsApp Inbox (owner, 23 Nov 2026): customers' messages to our WhatsApp numbers, with free replies. */
export function LiveWhatsApp() {
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [ready, setReady] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [phones, setPhones] = useState<Map<string, string>>(new Map());
  const [show, setShow] = useState<"All" | "New">("All");
  const [line, setLine] = useState("All Numbers");
  const [open, setOpen] = useState<Chat | null>(null);

  const load = () =>
    fetch(`${API}?part=chats`, { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { ready: boolean; items: Chat[] }) => { setChats(d.items); setReady(d.ready); setErr(null); })
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load the chats. Please try again."));
  usePoll(load, 20_000, []);
  useEffect(() => {
    void fetch(`${API}?part=numbers`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: Numbers | null) => {
      if (d) setPhones(new Map(d.numbers.map((n) => [n.id, n.phone])));
    }).catch(() => null);
  }, []);

  const lines = [...new Set((chats ?? []).map((c) => c.number_id))];
  const lineName = (id: string) => phones.get(id) ?? `Number ${id.slice(-4)}`;
  const inLine = (chats ?? []).filter((c) => line === "All Numbers" || lineName(c.number_id) === line);
  const shown = inLine.filter((c) => show === "All" || c.unread);

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="WhatsApp Inbox" sub="Customers' messages to Techwide's WhatsApp numbers. Replies are free for 24 hours after their last message." />
      {!ready && (
        <div className="v2-alert"><Icon name="info" size={16} /><span>WhatsApp isn't connected yet. Once it is, new messages show here. Numbers are in System › Settings › WhatsApp.</span></div>
      )}
      {!chats ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips label="Show" value={show} onChange={setShow} options={[["All", inLine.length], ["New", inLine.filter((c) => c.unread).length]]} />
          {lines.length > 1 && <Chips label="Number" value={line} onChange={setLine} options={[["All Numbers", chats.length], ...lines.map((id) => [lineName(id), chats.filter((c) => c.number_id === id).length] as [string, number])]} />}
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {shown.map((c) => (
                <button key={`${c.number_id}:${c.contact}`} type="button" className="ad-row ad-rowbtn click" onClick={() => setOpen(c)}>
                  <Av name={who(c)} />
                  <span className="main">
                    <b>{who(c)}{c.member ? <small className="wa-member"> · Rezekii {c.member.handle ? `@${c.member.handle}` : c.member.name}</small> : null}</b>
                    <small className="wa-last">{c.last_text ?? ""}</small>
                    <small>{when(c.last_at)}{lines.length > 1 ? ` · To ${lineName(c.number_id)}` : ""}</small>
                  </span>
                  {c.freeHours > 0 ? <span className="ad-tag gray">Free Reply {c.freeHours}h</span> : null}
                  {c.unread && <Pill tone="info">New</Pill>}
                </button>
              ))}
              {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0", margin: 0 }}>{show === "New" ? "No new messages." : "No messages yet."}</p>}
            </div>
          </section>
        </>
      )}
      {open && <ChatSheet chat={open} line={lines.length > 1 ? lineName(open.number_id) : null} onClose={() => { setOpen(null); void load(); }} />}
    </div>
  );
}

function ChatSheet({ chat, line, onClose }: { chat: Chat; line: string | null; onClose: () => void }) {
  const { toast } = useDemo();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [free, setFree] = useState(chat.freeHours);
  const q = `chat=${chat.number_id}&contact=${chat.contact}`;
  const load = () =>
    fetch(`${API}?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { items: Msg[] }) => {
        setMsgs(d.items);
        const lastIn = [...d.items].reverse().find((m) => m.direction === "in");
        if (lastIn) setFree(Math.max(0, Math.ceil((new Date(lastIn.at).getTime() + 24 * 3600_000 - Date.now()) / 3600_000)));
      })
      .catch(() => setMsgs((m) => m ?? []));
  usePoll(load, 10_000, [q]);
  useEffect(() => {
    const el = document.getElementById("wa-end");
    el?.scrollIntoView({ block: "end" });
  }, [msgs?.length]);

  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number: chat.number_id, contact: chat.contact, text: draft }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) return toast(x?.error ?? "Didn't send. Please try again.");
    setDraft("");
    void load();
  };

  return (
    <Sheet title={who(chat)} onClose={onClose} wide>
      <span className="v2-small" style={{ marginTop: -6 }}>
        +{chat.contact}{line ? ` · To ${line}` : ""}{chat.member ? ` · Rezekii ${chat.member.role === "seller" ? "Seller" : "Creator"} ${chat.member.handle ? `@${chat.member.handle}` : chat.member.name}` : ""}
      </span>
      <div className="wa-thread">
        {!msgs ? <p className="v2-muted">Loading…</p> : msgs.map((m) => (
          <div key={m.wamid} className={`wa-msg ${m.direction}`}>
            {m.media_id && (m.kind === "image" || m.kind === "sticker") && <a href={media(m.media_id)} target="_blank" rel="noreferrer"><img src={media(m.media_id)} alt={m.kind === "sticker" ? "Sticker" : "Photo"} loading="lazy" /></a>}
            {m.media_id && m.kind === "audio" && <audio controls preload="none" src={media(m.media_id)} />}
            {m.media_id && m.kind === "video" && <video controls preload="none" src={media(m.media_id)} />}
            {m.media_id && m.kind === "document" && <a className="ad-btn-ghost" href={media(m.media_id)} target="_blank" rel="noreferrer"><Icon name="doc" size={15} /> Open File</a>}
            {m.body ? <span className="wa-body">{m.body}</span> : !m.media_id && <span className="wa-body v2-muted">This message type can't be shown here. Open WhatsApp to see it.</span>}
            <small>
              {when(m.at)}
              {m.direction === "out" ? ` · ${STATUS[m.status ?? ""] ?? "Sent"}${m.sent_by ? ` · ${m.sent_by}` : ""}` : ""}
            </small>
            {m.error && <small className="wa-error">{m.error}</small>}
          </div>
        ))}
        <span id="wa-end" />
      </div>
      {free > 0 ? (
        <form className="ad-replybox" style={{ maxWidth: "none" }} onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <textarea className="np-input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 4096))} placeholder="Write a reply" aria-label="Reply" />
          <span className="v2-row" style={{ gap: 8, alignItems: "center" }}>
            <button type="submit" className="np-btn v2-btn-sm" disabled={!draft.trim() || busy}><Icon name="send" size={15} /> {busy ? "Sending…" : "Send Reply"}</button>
            <span className="v2-small">Free for {free}h more</span>
          </span>
        </form>
      ) : (
        <div className="v2-alert"><Icon name="clock" size={16} /><span>The free 24 hours have passed. You can reply again for free once they send a new message. Paid templates are off.</span></div>
      )}
    </Sheet>
  );
}

/** System › Settings › WhatsApp: our numbers, their quality, and whether their messages reach Rezekii. */
export function WhatsAppNumbersCard() {
  const { toast } = useDemo();
  const [d, setD] = useState<Numbers | null>(null);
  const load = () => fetch(`${API}?part=numbers`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((x: Numbers | null) => setD(x ?? { ready: true, numbers: [], accounts: [], error: "Couldn't load the numbers." })).catch(() => null);
  useEffect(() => { void load(); }, []);
  const turnOn = async (id: string) => {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscribe: id }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    if (!r?.ok) return toast(x?.error ?? "Didn't turn on. Please try again.");
    toast("Messages now reach Rezekii");
    void load();
  };
  return (
    <section className="v2-card" style={{ padding: "6px 20px" }}>
      <div className="v2-card-h"><h2 className="v2-h2">WhatsApp</h2><span className="v2-small">Add numbers in Meta's WhatsApp Manager. Up to 2 now, 20 once Meta verifies the business.</span></div>
      {!d ? <p className="v2-muted">Loading…</p> : !d.ready ? (
        <p className="v2-muted">Not connected yet. The server needs the WhatsApp settings first.</p>
      ) : (
        <div className="ad-list">
          {d.error && <p className="v2-muted">{d.error}</p>}
          {d.numbers.map((n) => (
            <div key={n.id} className="ad-row">
              <span className="ad-qico" style={{ background: "linear-gradient(135deg,#4ade80,#16a34a)" }}><Icon name="whatsapp" size={18} /></span>
              <span className="main"><b>{n.phone}</b><small>{n.name || "No display name yet"}{n.status ? ` · ${labelCase(n.status.toLowerCase().replace(/_/g, " "))}` : ""}</small></span>
              {n.quality && QUALITY[n.quality] ? <Pill tone={QUALITY[n.quality][1]}>{QUALITY[n.quality][0]}</Pill> : null}
            </div>
          ))}
          {d.numbers.length === 0 && !d.error && <p className="v2-muted">No numbers yet.</p>}
          {d.accounts.map((a) => (
            <div key={a.id} className="ad-row">
              <span className="main"><b>Messages Reach Rezekii</b><small>WhatsApp account {a.id}</small></span>
              {a.on ? <Pill tone="ok">On</Pill> : <button type="button" className="np-btn v2-btn-sm" onClick={() => void turnOn(a.id)}>Turn On</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
