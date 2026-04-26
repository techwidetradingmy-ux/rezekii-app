"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { notifications } from "@/lib/mock-data";
import { ArrowLeft, CheckCheck, Package, Wallet, TrendingUp, Megaphone, Gift } from "lucide-react";
import Link from "next/link";

const iconMap = {
  approved:  { icon: CheckCheck, color: "#00c073", bg: "rgba(0,192,115,0.12)" },
  payout:    { icon: Wallet,     color: "#e8005a", bg: "rgba(232,0,90,0.10)" },
  commission:{ icon: TrendingUp, color: "#00c073", bg: "rgba(0,192,115,0.12)" },
  campaign:  { icon: Megaphone,  color: "#f5a623", bg: "rgba(245,166,35,0.12)" },
  sample:    { icon: Package,    color: "#25f4ee", bg: "rgba(37,244,238,0.12)" },
} as const;

type NotifType = keyof typeof iconMap;

export default function NotificationsPage() {
  const [items, setItems] = useState(notifications);
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems(items.map((n) => ({ ...n, read: true })));

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white border-b border-[#d8f0e4] sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-0">
          <Link href="/" className="tap-target">
            <ArrowLeft size={20} color="#4a5568" />
          </Link>
          <h1 className="text-[20px] font-[800] text-[#0d1117] flex-1">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[12px] text-[#00c073] font-[600] tap-target"
            >
              Mark all read
            </button>
          )}
        </div>
        {unreadCount > 0 && (
          <p className="text-[12px] text-[#9aa5b1] mt-1 ml-8">{unreadCount} unread</p>
        )}
      </div>

      <div className="flex flex-col">
        {/* Unread section */}
        {items.some((n) => !n.read) && (
          <div>
            <p className="px-5 pt-4 pb-2 text-[11px] font-[700] text-[#9aa5b1] uppercase tracking-wider">
              New
            </p>
            {items.filter((n) => !n.read).map((notif) => {
              const { icon: Icon, color, bg } = iconMap[notif.type as NotifType];
              return (
                <button
                  key={notif.id}
                  onClick={() => setItems(items.map((n) => n.id === notif.id ? { ...n, read: true } : n))}
                  className="w-full flex items-start gap-3 px-5 py-4 bg-[rgba(0,192,115,0.04)] border-b border-[#f5fdf7] tap-target"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: bg }}
                  >
                    <Icon size={18} color={color} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-[700] text-[#0d1117]">{notif.title}</p>
                      <span className="w-2 h-2 rounded-full bg-[#00c073] shrink-0 mt-1.5" />
                    </div>
                    <p className="text-[13px] text-[#4a5568] leading-relaxed mt-0.5">{notif.body}</p>
                    <p className="text-[11px] text-[#9aa5b1] mt-1.5">{notif.time}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Read section */}
        {items.some((n) => n.read) && (
          <div>
            <p className="px-5 pt-4 pb-2 text-[11px] font-[700] text-[#9aa5b1] uppercase tracking-wider">
              Earlier
            </p>
            {items.filter((n) => n.read).map((notif) => {
              const { icon: Icon, color, bg } = iconMap[notif.type as NotifType];
              return (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 px-5 py-4 border-b border-[#f5fdf7]"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 opacity-60"
                    style={{ background: bg }}
                  >
                    <Icon size={18} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-[600] text-[#4a5568]">{notif.title}</p>
                    <p className="text-[13px] text-[#9aa5b1] leading-relaxed mt-0.5">{notif.body}</p>
                    <p className="text-[11px] text-[#9aa5b1] mt-1.5">{notif.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <Gift size={48} color="#d8f0e4" />
            <p className="text-[16px] font-[700] text-[#0d1117] mt-4 mb-1">All caught up!</p>
            <p className="text-[13px] text-[#9aa5b1]">No new notifications</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
