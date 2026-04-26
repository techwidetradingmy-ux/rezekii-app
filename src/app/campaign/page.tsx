"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { campaigns } from "@/lib/mock-data";
import { ChevronRight, Calendar, TrendingUp, Video } from "lucide-react";

const statusFilters = ["All", "Active", "Pending", "Completed", "Rejected"] as const;
type Filter = typeof statusFilters[number];

export default function CampaignPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = campaigns.filter(
    (c) => filter === "All" || c.status === filter
  );

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white border-b border-[#d8f0e4] sticky top-0 z-20">
        <h1 className="text-[22px] font-[800] text-[#0d1117] mb-3">Campaigns</h1>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "px-4 py-1.5 rounded-full text-[12px] font-[600] whitespace-nowrap shrink-0 tap-target transition-all",
                filter === f
                  ? "bg-[#00c073] text-white"
                  : "bg-[#f5fdf7] text-[#4a5568] border border-[#d8f0e4]",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-3">
        {filtered.map((campaign) => (
          <RzCard key={campaign.id} padding={false} className="overflow-hidden tap-target">
            <div className="flex gap-3 p-4">
              {/* Brand icon */}
              <div
                className="w-14 h-14 rounded-[12px] flex items-center justify-center text-[28px] shrink-0"
                style={{ background: campaign.imageColor }}
              >
                {campaign.category === "Beauty" ? "💄" :
                 campaign.category === "Food" ? "🍱" :
                 campaign.category === "Tech" ? "📱" :
                 campaign.category === "Fashion" ? "👗" : "🏠"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-[10px] text-[#9aa5b1] font-[500]">{campaign.brand}</p>
                    <p className="text-[14px] font-[700] text-[#0d1117] leading-tight">{campaign.title}</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={11} color="#9aa5b1" />
                    <span className="text-[11px] text-[#9aa5b1]">{campaign.commissionRate}% comm</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={11} color="#9aa5b1" />
                    <span className="text-[11px] text-[#9aa5b1]">{campaign.deadline}</span>
                  </div>
                </div>

                {/* GMV / Videos */}
                {campaign.status !== "Pending" && campaign.status !== "Rejected" && (
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[#f5fdf7]">
                    <div>
                      <p className="text-[10px] text-[#9aa5b1]">GMV</p>
                      <p className="text-[13px] font-[700] text-[#0d1117]">
                        RM {campaign.gmv.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Video size={11} color="#9aa5b1" />
                      <p className="text-[13px] font-[700] text-[#0d1117]">
                        {campaign.videos} <span className="text-[11px] text-[#9aa5b1] font-[400]">videos</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <ChevronRight size={16} color="#d8f0e4" className="self-center shrink-0" />
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

        {/* CTA for new campaigns */}
        <div
          className="mt-2 p-4 rounded-[16px] flex items-center gap-3 tap-target"
          style={{ background: "rgba(0,192,115,0.09)", border: "1.5px solid #d8f0e4" }}
        >
          <span className="text-[28px]">🚀</span>
          <div className="flex-1">
            <p className="text-[13px] font-[700] text-[#0d1117]">New campaigns available</p>
            <p className="text-[12px] text-[#9aa5b1]">Browse the marketplace to apply</p>
          </div>
          <ChevronRight size={16} color="#00c073" />
        </div>
      </div>
    </AppShell>
  );
}
