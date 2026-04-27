"use client";

import { useState } from "react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { campaigns } from "@/lib/mock-data";
import { TrendingUp, Calendar, Users } from "lucide-react";

const statusFilters = ["All", "Active", "Pending", "Completed", "Rejected"] as const;
type Filter = typeof statusFilters[number];

function JoinButton({ status, slotsLeft }: { status: string; slotsLeft: number }) {
  if (status === "Completed") {
    return (
      <div
        className="px-4 py-2 rounded-full text-[12px] font-[700]"
        style={{ background: "#f5fdf7", color: "#9aa5b1" }}
      >
        Completed
      </div>
    );
  }
  if (status === "Rejected") {
    return (
      <div
        className="px-4 py-2 rounded-full text-[12px] font-[700]"
        style={{ background: "rgba(232,0,90,0.08)", color: "#e8005a" }}
      >
        Not Eligible
      </div>
    );
  }
  if (status === "Pending") {
    return (
      <div
        className="px-4 py-2 rounded-full text-[12px] font-[700]"
        style={{ background: "rgba(245,166,35,0.12)", color: "#f5a623" }}
      >
        Pending
      </div>
    );
  }
  // Active
  return (
    <button
      className="px-4 py-2 rounded-full text-[12px] font-[700] tap-target"
      style={{
        background: slotsLeft > 0 ? "#00c073" : "#9aa5b1",
        color: "white",
        boxShadow: slotsLeft > 0 ? "0 2px 8px rgba(0,192,115,0.3)" : "none",
      }}
    >
      {slotsLeft > 0 ? "JOIN NOW" : "Full"}
    </button>
  );
}

export default function CampaignPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = campaigns.filter(
    (c) => filter === "All" || c.status === filter
  );

  return (
    <AppShell>
      {/* Header */}
      <div
        style={{ background: "#00c073" }}
        className="px-5 pt-12 pb-5"
      >
        <h1 className="text-[22px] font-[800] text-white mb-1">Campaigns</h1>
        <p className="text-white/70 text-[13px] mb-4">Browse and join paid brand briefs</p>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "px-4 py-1.5 rounded-full text-[12px] font-[600] whitespace-nowrap shrink-0 tap-target transition-all",
                filter === f
                  ? "bg-white text-[#00c073]"
                  : "text-white/80 border border-white/30",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-3">
        {filtered.map((campaign) => (
          <RzCard key={campaign.id} padding={false} className="overflow-hidden">
            {/* Brand image + title row */}
            <div className="flex gap-3 p-4 pb-3">
              <div
                className="w-14 h-14 rounded-[12px] overflow-hidden shrink-0 relative"
                style={{ background: campaign.imageColor }}
              >
                {campaign.imageUrl && (
                  <Image
                    src={campaign.imageUrl}
                    alt={campaign.brand}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#9aa5b1] font-[500]">{campaign.brand}</p>
                    <p className="text-[15px] font-[700] text-[#0d1117] leading-tight">{campaign.title}</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
              </div>
            </div>

            {/* Brief description */}
            <div className="px-4 pb-3">
              <p className="text-[12px] text-[#4a5568] leading-relaxed">{campaign.description}</p>
            </div>

            {/* Stats row */}
            <div
              className="mx-4 mb-3 rounded-[10px] p-3 flex items-center gap-4"
              style={{ background: "#f5fdf7" }}
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp size={13} color="#00c073" />
                <div>
                  <p className="text-[11px] font-[700] text-[#0d1117]">{campaign.commissionRate}%</p>
                  <p className="text-[9px] text-[#9aa5b1]">Commission</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} color="#9aa5b1" />
                <div>
                  <p className="text-[11px] font-[700] text-[#0d1117]">{campaign.deadline}</p>
                  <p className="text-[9px] text-[#9aa5b1]">Deadline</p>
                </div>
              </div>
              {campaign.slotsLeft > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users size={13} color="#e8005a" />
                  <div>
                    <p className="text-[11px] font-[700] text-[#e8005a]">{campaign.slotsLeft} left</p>
                    <p className="text-[9px] text-[#9aa5b1]">Slots</p>
                  </div>
                </div>
              )}
            </div>

            {/* GMV row for active/completed campaigns */}
            {(campaign.status === "Active" || campaign.status === "Completed") && campaign.gmv > 0 && (
              <div className="px-4 pb-3 flex items-center gap-4 border-t border-[#f5fdf7] pt-3">
                <div>
                  <p className="text-[10px] text-[#9aa5b1]">Your GMV</p>
                  <p className="text-[13px] font-[700] text-[#0d1117]">RM {campaign.gmv.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#9aa5b1]">Videos Posted</p>
                  <p className="text-[13px] font-[700] text-[#0d1117]">{campaign.videos}</p>
                </div>
              </div>
            )}

            {/* CTA row */}
            <div className="px-4 pb-4 flex items-center justify-between">
              <p className="text-[11px] text-[#9aa5b1]">
                {campaign.category} · Free product sample
              </p>
              <JoinButton status={campaign.status} slotsLeft={campaign.slotsLeft} />
            </div>
          </RzCard>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-[48px] mb-4">📋</span>
            <p className="text-[16px] font-[700] text-[#0d1117] mb-1">No campaigns</p>
            <p className="text-[13px] text-[#9aa5b1]">Check back soon for new opportunities</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
