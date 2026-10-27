"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { SELLER_NOTES } from "@/lib/mock-seller";

const TONE: Record<string, string> = { alert: "red", x: "red", video: "blue", gift: "amber" };

/** Seller notifications: newest first, tap to open. */
export default function SellerNotifications() {
  const { toast } = useDemo();
  const [notes, setNotes] = useState(SELLER_NOTES);
  const unread = notes.filter((n) => n.unread).length;
  const today = notes.filter((n) => n.when.startsWith("Today"));
  const earlier = notes.filter((n) => !n.when.startsWith("Today"));

  const list = (items: typeof notes) => items.map((n) => (
    <Link key={n.id} href={n.href} className="sl-note" onClick={() => setNotes((all) => all.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}>
      <span className={`sl-ico ${TONE[n.icon] ?? ""}`}><Icon name={n.icon} size={18} /></span>
      <span><b>{n.title}</b><small>{n.line}</small><small>{n.when}</small></span>
      {n.unread ? <span className="sl-unread" aria-label="Unread" /> : <span />}
    </Link>
  ));

  return (
    <div className="v2-stack v2-in v2-narrow">
      <Title title="Notifications" sub={unread ? `${unread} unread` : "You're all caught up"}>
        <button type="button" className="btn-outline" disabled={!unread} onClick={() => { setNotes((all) => all.map((x) => ({ ...x, unread: false }))); toast("All marked as read"); }}>Mark all as read</button>
      </Title>
      <section className="v2-card">
        <h3 className="sl-group-h">Today</h3>
        <div>{list(today)}</div>
        <h3 className="sl-group-h">Earlier</h3>
        <div>{list(earlier)}</div>
      </section>
      <p className="v2-small" style={{ margin: 0 }}>Choose what we send you in <Link href="/seller/app/account">Account</Link>.</p>
    </div>
  );
}
