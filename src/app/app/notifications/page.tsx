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

  return (
    <div className="v2-stack v2-in v2-narrow" style={{ gap: 20 }}>
      <Title title="Notifications" sub={unread.length ? `${unread.length} new` : "You're all caught up"}>
        <button type="button" className="btn-outline v2-btn-sm" disabled={!unread.length} onClick={() => { setUnread([]); toast("All marked as read"); }}>
          <Icon name="check" size={16} /> Mark all as read
        </button>
      </Title>

      {(["Today", "Earlier"] as const).map((day) => (
        <section key={day} className="v2-card">
          <h2 className="v2-h2">{day}</h2>
          <ul className="cr1-notes v2-divide">
            {NOTES.filter((n) => n.day === day).map((n) => {
              const isNew = unread.includes(n.id);
              const done = n.action === "reconnect" && reconnected;
              return (
                <li key={n.id} className={`cr1-note ${isNew ? "unread" : ""}`}>
                  <span className="cr1-note-ico" style={{ background: done ? "linear-gradient(135deg,#22dc95,#00a862)" : n.bg }}>
                    <Icon name={done ? "check" : n.icon} size={20} />
                  </span>
                  <span className="cr1-note-main">
                    <b>{done ? "TikTok Shop reconnected" : n.title}</b>
                    <span>{done ? "Access renewed for another year." : n.line}</span>
                    <small>{n.when}</small>
                  </span>
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
      ))}

      <p className="hm-fine">
        We also email you. No WhatsApp messages for now.
      </p>
    </div>
  );
}
