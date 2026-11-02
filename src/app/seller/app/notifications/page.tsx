"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title, withParts } from "@/components/ui";
import { SELLER_NOTES } from "@/lib/mock-seller";
import { loadNotes, markNote, notesChanged, noteDay, noteWhen, type NoteCategory } from "@/lib/live-notes";
import { CAT_LABEL, NoteFilter, passes, type NoteFilterValue } from "@/components/note-filter";
import { useLang, useT } from "@/lib/i18n/client";

const TONE: Record<string, string> = { alert: "red", x: "red", video: "blue", gift: "amber", link: "amber" };
type Row = { id: string; icon: IconName; title: string; line: string; when: string; unread: boolean; href: string; today: boolean; cat?: NoteCategory; urgent?: string | null };

/** Seller notifications: newest first, tap to open. Signed in (owner, 31 Oct 2026): built from what happened on her account. */
export default function SellerNotifications() {
  const { toast, live } = useDemo();
  // The screen's own words in her language (owner, 3 Nov 2026); each notification's text comes from the server.
  const t = useT();
  const lang = useLang();
  const [notes, setNotes] = useState<Row[]>(SELLER_NOTES.map((n) => ({ ...n, today: n.when.startsWith("Today") })));
  const [state, setState] = useState<"wait" | "ok" | "failed">(live ? "wait" : "ok");
  useEffect(() => {
    if (!live) return;
    setState("wait");
    loadNotes("seller").then((d) => {
      if (!d) return setState("failed");
      setNotes(d.notes.map((n) => ({ id: n.id, icon: n.icon, title: n.title, line: n.line, when: noteWhen(n.at, t, lang), unread: n.unread, href: n.href ?? "/seller/app/notifications", today: noteDay(n.at) === "Today", cat: n.cat, urgent: n.urgent })));
      setState("ok");
      notesChanged(d.unread);
    });
    // The list loads once per visit; a language change reloads the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);
  const unread = notes.filter((n) => n.unread).length;
  const [show, setShow] = useState<NoteFilterValue>("all");
  const shown = notes.filter((n) => passes(n, show));
  // Important ones first, whatever the day (owner, 31 Oct 2026).
  const urgent = shown.filter((n) => n.urgent);
  const today = shown.filter((n) => !n.urgent && n.today);
  const earlier = shown.filter((n) => !n.urgent && !n.today);
  const readOne = (id: string) => {
    setNotes((all) => all.map((x) => (x.id === id ? { ...x, unread: false } : x)));
    if (live && notes.find((x) => x.id === id)?.unread) void markNote("seller", id, unread - 1);
  };

  const list = (items: Row[]) => items.map((n) => {
    const inner = (
      <>
        <span className={`sl-ico ${TONE[n.icon] ?? ""}`}><Icon name={n.icon} size={18} /></span>
        <span>{(n.urgent || n.cat) && <span className="nt-tags">{n.urgent && <i className="cr1-note-tag">{n.urgent}</i>}{n.cat && <i className={`nt-cat ${n.cat}`}>{t(CAT_LABEL[n.cat])}</i>}</span>}<b>{n.title}</b><small>{n.line}</small><small>{n.when}</small></span>
        {n.unread ? <span className="sl-unread" aria-label={t("Unread")} /> : <span />}
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
      <Title title={t("Notifications")} sub={state === "wait" ? t("Loading…") : state === "failed" ? t("Couldn't load your notifications") : unread ? t("{n} unread", { n: unread }) : t("You're all caught up")}>
        <button type="button" className="btn-outline" disabled={!unread} onClick={() => { setNotes((all) => all.map((x) => ({ ...x, unread: false }))); if (live) void markNote("seller", null, 0); toast(t("All marked as read")); }}>{t("Mark All as Read")}</button>
      </Title>
      {live && notes.length > 0 && <NoteFilter notes={notes} value={show} onChange={setShow} />}
      <section className="v2-card">
        {urgent.length > 0 && (
          <>
            <h3 className="sl-group-h" style={{ color: "#d92d20" }}>{t("Needs You")}</h3>
            <div>{list(urgent)}</div>
          </>
        )}
        {state === "ok" && !notes.length && <p className="v2-muted" style={{ margin: 0 }}>{t("Nothing yet. Product reviews, missions, invites and posts show up here.")}</p>}
        {today.length > 0 && (
          <>
            <h3 className="sl-group-h">{t("Today")}</h3>
            <div>{list(today)}</div>
          </>
        )}
        {earlier.length > 0 && (
          <>
            <h3 className="sl-group-h">{t("Earlier")}</h3>
            <div>{list(earlier)}</div>
          </>
        )}
      </section>
      <p className="v2-small" style={{ margin: 0 }}>{live ? t("Showing the last 30 days.") : withParts(t("Change Alerts in {account}."), { account: <Link href="/seller/app/account">{t("Account")}</Link> })}</p>
    </div>
  );
}
