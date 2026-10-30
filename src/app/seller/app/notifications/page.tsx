"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { SELLER_NOTES } from "@/lib/mock-seller";
import { loadNotes, markNote, noteDay, noteWhen } from "@/lib/live-notes";

const TONE: Record<string, string> = { alert: "red", x: "red", video: "blue", gift: "amber", link: "amber" };
type Row = { id: string; icon: IconName; title: string; line: string; when: string; unread: boolean; href: string; today: boolean };

/** Seller notifications: newest first, tap to open. Signed in (owner, 31 Oct 2026): built from what happened on her account. */
export default function SellerNotifications() {
  const { toast, live } = useDemo();
  const [notes, setNotes] = useState<Row[]>(SELLER_NOTES.map((n) => ({ ...n, today: n.when.startsWith("Today") })));
  const [state, setState] = useState<"wait" | "ok" | "failed">(live ? "wait" : "ok");
  useEffect(() => {
    if (!live) return;
    setState("wait");
    loadNotes("seller").then((d) => {
      if (!d) return setState("failed");
      setNotes(d.notes.map((n) => ({ id: n.id, icon: n.icon, title: n.title, line: n.urgent ? `${n.urgent} · ${n.line}` : n.line, when: noteWhen(n.at), unread: n.unread, href: n.href ?? "/seller/app", today: noteDay(n.at) === "Today" })));
      setState("ok");
    });
  }, [live]);
  const unread = notes.filter((n) => n.unread).length;
  const today = notes.filter((n) => n.today);
  const earlier = notes.filter((n) => !n.today);
  const readOne = (id: string) => {
    setNotes((all) => all.map((x) => (x.id === id ? { ...x, unread: false } : x)));
    if (live && notes.find((x) => x.id === id)?.unread) void markNote("seller", id);
  };

  const list = (items: Row[]) => items.map((n) => {
    const inner = (
      <>
        <span className={`sl-ico ${TONE[n.icon] ?? ""}`}><Icon name={n.icon} size={18} /></span>
        <span><b>{n.title}</b><small>{n.line}</small><small>{n.when}</small></span>
        {n.unread ? <span className="sl-unread" aria-label="Unread" /> : <span />}
      </>
    );
    // Reconnect links go to a sign-in page, and posts can open on another site.
    return n.href.startsWith("/api/") || n.href.startsWith("http") ? (
      <a key={n.id} href={n.href} className="sl-note" onClick={() => readOne(n.id)} {...(n.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{inner}</a>
    ) : (
      <Link key={n.id} href={n.href} className="sl-note" onClick={() => readOne(n.id)}>{inner}</Link>
    );
  });

  return (
    <div className="v2-stack v2-in v2-narrow">
      <Title title="Notifications" sub={state === "wait" ? "Loading…" : state === "failed" ? "Couldn't load your notifications" : unread ? `${unread} unread` : "You're all caught up"}>
        <button type="button" className="btn-outline" disabled={!unread} onClick={() => { setNotes((all) => all.map((x) => ({ ...x, unread: false }))); if (live) void markNote("seller", null); toast("All marked as read"); }}>Mark all as read</button>
      </Title>
      <section className="v2-card">
        {state === "ok" && !notes.length && <p className="v2-muted" style={{ margin: 0 }}>Nothing yet. Product reviews, missions, invites and posts show up here.</p>}
        {today.length > 0 && (
          <>
            <h3 className="sl-group-h">Today</h3>
            <div>{list(today)}</div>
          </>
        )}
        {earlier.length > 0 && (
          <>
            <h3 className="sl-group-h">Earlier</h3>
            <div>{list(earlier)}</div>
          </>
        )}
      </section>
      <p className="v2-small" style={{ margin: 0 }}>{live ? "Showing the last 30 days." : <>Change alerts in <Link href="/seller/app/account">Account</Link>.</>}</p>
    </div>
  );
}
