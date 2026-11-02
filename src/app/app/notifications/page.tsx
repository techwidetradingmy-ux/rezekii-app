"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title, Loading } from "@/components/ui";
import { NOTES } from "@/lib/mock-creator1";
import { loadNotes, markNote, notesChanged, noteBg, noteDay, noteWhen, type LiveNote, type NoteCategory } from "@/lib/live-notes";
import { CAT_LABEL, NoteFilter, passes, type NoteFilterValue } from "@/components/note-filter";
import { useLang, useT } from "@/lib/i18n/client";
import "../../creator1.css";

type Row = { id: string; day: "Today" | "Earlier"; when: string; icon: IconName; bg: string; title: string; line: string; href?: string | null; cta?: string | null; urgent?: string | null; action?: "reconnect"; cat?: NoteCategory };

/** Notifications: samples, commission chances, missions and account health, newest first. Each one links to where you act. */
export default function Notifications() {
  const { setLinked, toast, live } = useDemo();
  // The screen's own words in her language (owner, 3 Nov 2026); each notification's text comes from the server.
  const t = useT();
  const lang = useLang();
  const [unread, setUnread] = useState<string[]>(["n1", "n2", "n3"]);
  const [reconnected, setReconnected] = useState(false);
  // Signed in (owner, 31 Oct 2026): her real notifications, built from what happened on her account.
  const [real, setReal] = useState<LiveNote[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!live) return;
    loadNotes("creator").then((d) => {
      if (!d) return setFailed(true);
      setReal(d.notes);
      setUnread(d.notes.filter((n) => n.unread).map((n) => n.id));
      notesChanged(d.unread);
    });
  }, [live]);
  const read = (id: string) => {
    if (!unread.includes(id)) return;
    setUnread((u) => u.filter((x) => x !== id));
    if (live) void markNote("creator", id, unread.length - 1);
  };
  const readAll = () => {
    setUnread([]);
    if (live) void markNote("creator", null, 0);
    toast(t("All marked as read"));
  };
  // Phones show each one as a short row (owner, 29 Oct 2026); a tap opens the full text and its button, and marks it read.
  const [open, setOpen] = useState<string | null>(null);
  const [show, setShow] = useState<NoteFilterValue>("all");

  const notes: Row[] = live
    ? (real ?? []).map((n) => ({ id: n.id, day: noteDay(n.at), when: noteWhen(n.at, t, lang), icon: n.icon, bg: noteBg(n.icon), title: n.title, line: n.line, href: n.href, cta: n.cta, urgent: n.urgent, cat: n.cat }))
    : NOTES;
  const shown = notes.filter((n) => passes(n, show));

  return (
    <div className="v2-stack v2-in v2-narrow" style={{ gap: 20 }}>
      <Title title={t("Notifications")} sub={live && !real ? (failed ? t("Couldn't load your notifications") : t("Loading…")) : unread.length ? t("{n} new", { n: unread.length }) : t("You're all caught up")}>
        <button type="button" className="btn-outline v2-btn-sm" disabled={!unread.length} onClick={readAll}>
          <Icon name="check" size={16} /> {t("Mark all as read")}
        </button>
      </Title>

      {live && !real && !failed && <Loading text={t("Loading your notifications…")} />}
      {live && real && real.length > 0 && <NoteFilter notes={notes} value={show} onChange={setShow} />}

      {live && real && !real.length && (
        <section className="v2-card">
          <p className="v2-muted" style={{ margin: 0 }}>{t("Nothing yet. Missions, invites, posts and samples show up here.")}</p>
        </section>
      )}

      {/* Urgent first, in red, whatever the day (owner, 29 Oct 2026); then the rest by day. */}
      {(["Needs you", "Today", "Earlier"] as const).map((day) => {
        // Section names are English (they're also the day each row belongs to); shown with t(day).
        const list = shown.filter((n) => (day === "Needs you" ? n.urgent && !(n.action === "reconnect" && reconnected) : !n.urgent || (n.action === "reconnect" && reconnected) ? n.day === day : false));
        return list.length > 0 && (
        <section key={day} className={`v2-card${day === "Needs you" ? " cr1-urgent" : ""}`}>
          <h2 className="v2-h2">{day === "Needs you" && <Icon name="alert" size={18} />}{t(day)}</h2>
          <ul className="cr1-notes v2-divide">
            {list.map((n) => {
              const isNew = unread.includes(n.id);
              const done = n.action === "reconnect" && reconnected;
              // Reconnect links go to a sign-in page, and posts can open on another site.
              const outside = !!n.href && (n.href.startsWith("/api/") || n.href.startsWith("http"));
              return (
                <li key={n.id} className={`cr1-note ${isNew ? "unread" : ""}${open === n.id ? " open" : ""}`}>
                  <span className="cr1-note-ico" style={{ background: done ? "linear-gradient(135deg,#22dc95,#00a862)" : n.bg }}>
                    <Icon name={done ? "check" : n.icon} size={20} />
                  </span>
                  <button type="button" className="cr1-note-main" aria-expanded={open === n.id} onClick={() => { setOpen(open === n.id ? null : n.id); read(n.id); }}>
                    {n.urgent && !done && <i className="cr1-note-tag">{n.urgent}</i>}
                    {n.cat && <i className={`nt-cat ${n.cat}`}>{t(CAT_LABEL[n.cat])}</i>}
                    <b>{done ? t("TikTok Shop reconnected") : n.title}</b>
                    <span>{done ? t("Access renewed for another year.") : n.line}</span>
                    <small>{n.when}</small>
                  </button>
                  <span className="cr1-note-act">
                    {n.action === "reconnect" ? (
                      <button
                        type="button"
                        className={done ? "btn-outline v2-btn-sm" : "np-btn v2-btn-sm"}
                        disabled={done}
                        onClick={() => {
                          read(n.id);
                          setReconnected(true);
                          setLinked(true);
                          toast(t("Reconnected for another year"));
                        }}
                      >
                        {done ? t("Done") : n.cta}
                      </button>
                    ) : n.href && outside ? (
                      <a href={n.href} className={n.urgent ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => read(n.id)} {...(n.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                        {n.cta} <Icon name="arrow" size={16} />
                      </a>
                    ) : n.href ? (
                      <Link href={n.href} className="btn-outline v2-btn-sm" onClick={() => read(n.id)}>
                        {n.cta} <Icon name="arrow" size={16} />
                      </Link>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        );
      })}

      <p className="hm-fine">
        {live ? t("Showing the last 30 days.") : t("We also email you. No WhatsApp messages for now.")}
      </p>
    </div>
  );
}
