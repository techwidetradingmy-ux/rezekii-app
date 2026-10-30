"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { CREATOR } from "@/lib/mock";
import { NOTES } from "@/lib/mock-creator1";
import { SELLER_CREDITS, SELLER_NOTES, SELLER_STREAK } from "@/lib/mock-seller";
import { loadWallet } from "@/lib/live-rewards";
import { loadNotes, noteWhen, type LiveNote } from "@/lib/live-notes";

/**
 * Desktop option B (mock-up, owner, 31 Oct 2026): a panel on the right of every page with what she checks most: credits and
 * streak, today's to-dos and the latest notifications. Signed in, credits, streak and notifications are hers (owner, 31 Oct 2026).
 */
export function DeskRail({ app }: { app: "creator" | "seller" }) {
  const { live } = useDemo();
  const seller = app === "seller";
  const [wallet, setWallet] = useState<{ balance: number; streak: number } | null>(null);
  const [real, setReal] = useState<LiveNote[] | null>(null);
  useEffect(() => {
    if (!live) return;
    loadWallet(app).then((w) => setWallet({ balance: w.balance, streak: w.streak })).catch(() => {});
    loadNotes(app).then((d) => setReal(d?.notes ?? [])).catch(() => setReal([]));
  }, [live, app]);
  const credits = live ? wallet?.balance ?? null : seller ? SELLER_CREDITS : CREATOR.credits;
  const streak = live ? wallet?.streak ?? null : seller ? SELLER_STREAK : CREATOR.streak;
  const base = seller ? "/seller/app" : "/app";
  const todos: { icon: IconName; text: string; href: string }[] = seller
    ? [
        { icon: "check", text: "Check in", href: `${base}/rewards` },
        { icon: "chart", text: "Check today's results", href: `${base}/results` },
        { icon: "box", text: "Submit a product", href: `${base}/submit` },
      ]
    : [
        { icon: "check", text: "Check in", href: `${base}/rewards` },
        { icon: "video", text: "Post a video", href: `${base}/publish` },
        { icon: "scan", text: "Run a scan", href: base },
      ];
  const notes = live
    ? (real ?? []).slice(0, 3).map((n) => ({ id: n.id, icon: n.icon, title: n.title, when: noteWhen(n.at), href: n.href ?? `${base}/notifications` }))
    : seller
    ? SELLER_NOTES.slice(0, 3).map((n) => ({ id: n.id, icon: n.icon, title: n.title, when: n.when, href: n.href }))
    : NOTES.slice(0, 3).map((n) => ({ id: n.id, icon: n.icon, title: n.title, when: n.when, href: n.href ?? `${base}/notifications` }));

  return (
    <aside className="dk-rail" aria-label="Your day">
      <section className="v2-card dk-card">
        <div className="dk-stats">
          <Link href={seller ? `${base}/rewards/wallet` : `${base}/account#wallet`}><small>Credits</small><b>{credits === null ? "–" : credits.toLocaleString("en-MY")}</b></Link>
          <Link href={`${base}/rewards`}><small>Streak</small><b><Icon name="flame" size={16} /> {streak === null ? "–" : `${streak} day${streak === 1 ? "" : "s"}`}</b></Link>
        </div>
      </section>
      <section className="v2-card dk-card">
        <div className="v2-card-h"><h2 className="v2-h2">Today</h2><Link href={`${base}/rewards`} className="v2-link">Missions</Link></div>
        <ul className="dk-list">
          {todos.map((t) => (
            <li key={t.text}><Link href={t.href}><i><Icon name={t.icon} size={15} /></i><span>{t.text}</span><Icon name="arrow" size={14} /></Link></li>
          ))}
        </ul>
      </section>
      <section className="v2-card dk-card">
        <div className="v2-card-h"><h2 className="v2-h2">Notifications</h2><Link href={`${base}/notifications`} className="v2-link">All</Link></div>
        <ul className="dk-list">
          {live && real !== null && !notes.length && <li><span className="v2-muted">Nothing new</span></li>}
          {notes.map((n) => (
            <li key={n.id}><Link href={n.href}><i><Icon name={n.icon} size={15} /></i><span>{n.title}<small>{n.when}</small></span></Link></li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
