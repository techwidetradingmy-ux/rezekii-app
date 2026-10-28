"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { NOTES } from "@/lib/mock-creator1";
import "../../creator1.css";

/** Notifications: samples, commission chances, missions and account health, newest first. Each one links to where you act. */
export default function Notifications() {
  const { setLinked, toast } = useDemo();
  const [unread, setUnread] = useState<string[]>(["n1", "n2", "n3"]);
  const [reconnected, setReconnected] = useState(false);
  const read = (id: string) => setUnread((u) => u.filter((x) => x !== id));
  // Phones show each one as a short row (owner, 29 Oct 2026); a tap opens the full text and its button, and marks it read.
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="v2-stack v2-in v2-narrow" style={{ gap: 20 }}>
      <Title title="Notifications" sub={unread.length ? `${unread.length} new` : "You're all caught up"}>
        <button type="button" className="btn-outline v2-btn-sm" disabled={!unread.length} onClick={() => { setUnread([]); toast("All marked as read"); }}>
          <Icon name="check" size={16} /> Mark all as read
        </button>
      </Title>

      {/* Urgent first, in red, whatever the day (owner, 29 Oct 2026); then the rest by day. */}
      {(["Needs you", "Today", "Earlier"] as const).map((day) => {
        const list = NOTES.filter((n) => (day === "Needs you" ? n.urgent && !(n.action === "reconnect" && reconnected) : !n.urgent || (n.action === "reconnect" && reconnected) ? n.day === day : false));
        return list.length > 0 && (
        <section key={day} className={`v2-card${day === "Needs you" ? " cr1-urgent" : ""}`}>
          <h2 className="v2-h2">{day === "Needs you" && <Icon name="alert" size={18} />}{day}</h2>
          <ul className="cr1-notes v2-divide">
            {list.map((n) => {
              const isNew = unread.includes(n.id);
              const done = n.action === "reconnect" && reconnected;
              return (
                <li key={n.id} className={`cr1-note ${isNew ? "unread" : ""}${open === n.id ? " open" : ""}`}>
                  <span className="cr1-note-ico" style={{ background: done ? "linear-gradient(135deg,#22dc95,#00a862)" : n.bg }}>
                    <Icon name={done ? "check" : n.icon} size={20} />
                  </span>
                  <button type="button" className="cr1-note-main" aria-expanded={open === n.id} onClick={() => { setOpen(open === n.id ? null : n.id); read(n.id); }}>
                    {n.urgent && !done && <i className="cr1-note-tag">{n.urgent}</i>}
                    <b>{done ? "TikTok Shop reconnected" : n.title}</b>
                    <span>{done ? "Access renewed for another year." : n.line}</span>
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
                          toast("Reconnected for another year");
                        }}
                      >
                        {done ? "Done" : n.cta}
                      </button>
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
        We also email you. No WhatsApp messages for now.
      </p>
    </div>
  );
}
