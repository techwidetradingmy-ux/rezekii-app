"use client";

import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import { creatorProfile } from "@/lib/mock-data";
import {
  ChevronRight, CreditCard, Bell, HelpCircle,
  LogOut, Shield, Star, TrendingUp, Video,
} from "lucide-react";

function formatRM(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const menuItems = [
  { icon: CreditCard, label: "Payment & Bank Account", sub: "Maybank **** 4521", color: "#00c073" },
  { icon: Bell,       label: "Notifications",            sub: "3 unread",          color: "#f5a623" },
  { icon: Shield,     label: "Privacy & Security",       sub: null,                color: "#25f4ee" },
  { icon: HelpCircle, label: "Help & Support",           sub: null,                color: "#9aa5b1" },
  { icon: LogOut,     label: "Sign Out",                 sub: null,                color: "#e8005a" },
];

export default function ProfilePage() {
  return (
    <AppShell>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6"
        style={{ background: "#00c073" }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] shrink-0 border-2 border-[#00c073]"
            style={{ background: "linear-gradient(135deg, #00c073, #009a5c)" }}
          >
            👩‍💼
          </div>
          <div>
            <h1 className="text-[20px] font-[800] text-white">{creatorProfile.name}</h1>
            <p className="text-[#9aa5b1] text-[13px]">{creatorProfile.handle}</p>
            {/* Level badge */}
            <div
              className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full"
              style={{ background: "rgba(245,166,35,0.2)" }}
            >
              <span className="text-[11px]">🏅</span>
              <span className="text-[11px] font-[700]" style={{ color: "#f5a623" }}>
                {creatorProfile.level}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-4">

        {/* Total Earnings */}
        <RzCard padding={false} className="animate-fade-up">
          <div
            className="rounded-t-[16px] p-4"
            style={{ background: "linear-gradient(135deg, #00c073 0%, #009a5c 100%)" }}
          >
            <p className="text-white/70 text-[12px] mb-1">Total Lifetime Earnings</p>
            <p className="text-white text-[28px] font-[800]">{formatRM(creatorProfile.totalEarnings)}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#f5fdf7] p-0">
            {[
              { label: "Total GMV", value: `RM ${(creatorProfile.totalGMV / 1000).toFixed(0)}k` },
              { label: "Videos",    value: `${creatorProfile.totalVideos}` },
              { label: "Followers", value: creatorProfile.followers },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-3">
                <p className="text-[16px] font-[800] text-[#0d1117]">{value}</p>
                <p className="text-[10px] text-[#9aa5b1] font-[500]">{label}</p>
              </div>
            ))}
          </div>
        </RzCard>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up delay-100">
          {[
            { icon: TrendingUp, label: "Avg Views",       value: creatorProfile.avgViews,  color: "#00c073" },
            { icon: Video,      label: "Videos Posted",   value: `${creatorProfile.totalVideos}`, color: "#f5a623" },
            { icon: Star,       label: "Creator Since",   value: creatorProfile.joinDate,  color: "#25f4ee" },
            { icon: Star,       label: "Partner Status",  value: "TAP Certified",          color: "#e8005a" },
          ].map(({ icon: Icon, label, value, color }) => (
            <RzCard key={label} padding={false} className="p-3 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}
              >
                <Icon size={16} color={color} />
              </div>
              <div>
                <p className="text-[13px] font-[700] text-[#0d1117]">{value}</p>
                <p className="text-[10px] text-[#9aa5b1]">{label}</p>
              </div>
            </RzCard>
          ))}
        </div>

        {/* Level Progress */}
        <RzCard className="animate-fade-up delay-200" padding={false}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[14px] font-[700] text-[#0d1117]">{creatorProfile.tier} Creator</p>
                <p className="text-[12px] text-[#9aa5b1]">{creatorProfile.progressToNextTier}% to {creatorProfile.nextTier}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-[700] text-[#f5a623] bg-[rgba(245,166,35,0.12)] px-2 py-1 rounded-full">
                  {creatorProfile.tier}
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-[#f5fdf7] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${creatorProfile.progressToNextTier}%`,
                  background: "linear-gradient(90deg, #f5a623, #e8005a)"
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-[#9aa5b1]">Gold (current)</span>
              <span className="text-[10px] text-[#9aa5b1]">Platinum</span>
            </div>
          </div>
        </RzCard>

        {/* Menu items */}
        <RzCard padding={false} className="animate-fade-up delay-300 divide-y divide-[#f5fdf7]">
          {menuItems.map(({ icon: Icon, label, sub, color }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 px-4 py-3.5 tap-target hover:bg-[#f5fdf7] transition-colors"
            >
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}
              >
                <Icon size={15} color={color} />
              </div>
              <div className="flex-1 text-left">
                <p className={[
                  "text-[14px] font-[500]",
                  color === "#e8005a" ? "text-[#e8005a]" : "text-[#0d1117]"
                ].join(" ")}>{label}</p>
                {sub && <p className="text-[11px] text-[#9aa5b1]">{sub}</p>}
              </div>
              <ChevronRight size={15} color="#d8f0e4" />
            </button>
          ))}
        </RzCard>

        <p className="text-center text-[11px] text-[#9aa5b1] pb-2">
          Rezekii v1.0.0 · Techwide Marketing Sdn Bhd
        </p>
      </div>
    </AppShell>
  );
}
