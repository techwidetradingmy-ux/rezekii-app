"use client";

import { useState } from "react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import RzButton from "@/components/ui/RzButton";
import EarningsChart from "@/components/ui/EarningsChart";
import { earningsWeek, earnings30Days, topPosts } from "@/lib/mock-data";
import { ArrowUpRight, Video, Radio, Eye, Wallet, ChevronRight } from "lucide-react";

const ranges = ["Today", "Past 7 Days", "Past 30 Days", "This Month"] as const;
type Range = typeof ranges[number];

function formatRM(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EarningsPage() {
  const [range, setRange] = useState<Range>("Past 7 Days");

  const chartData =
    range === "Today"       ? [earningsWeek[earningsWeek.length - 1]] :
    range === "Past 7 Days" ? earningsWeek :
                              earnings30Days.slice(-30);

  const totalGMV        = chartData.reduce((s, d) => s + d.gmv, 0);
  const totalCommission = chartData.reduce((s, d) => s + d.commission, 0);
  const gmvPerVideo     = Math.round(totalGMV / 12);
  const gmvPerLive      = Math.round(totalGMV / 4);
  const totalViews      = "604K";

  return (
    <AppShell>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5"
        style={{ background: "#00c073" }}
      >
        <h1 className="text-[22px] font-[800] text-white mb-4">Earnings</h1>

        {/* Hero numbers */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[#9aa5b1] text-[12px] mb-1">Total Commission</p>
            <p className="text-[32px] font-[800] text-white leading-none">
              {formatRM(totalCommission)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight size={13} color="#00c073" />
              <span className="text-[12px] text-[#00c073] font-[600]">+18.4%</span>
              <span className="text-[11px] text-[#9aa5b1]">vs previous period</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[#9aa5b1] text-[11px]">GMV</p>
            <p className="text-[18px] font-[700] text-white">{formatRM(totalGMV)}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-4">

        {/* Date Range Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={[
                "px-4 py-2 rounded-full text-[12px] font-[600] whitespace-nowrap shrink-0 tap-target transition-all",
                range === r
                  ? "bg-[#00c073] text-white shadow-[0_2px_8px_rgba(0,192,115,0.3)]"
                  : "bg-white border border-[#d8f0e4] text-[#4a5568]",
              ].join(" ")}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Bar Chart */}
        <RzCard className="animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-[700] text-[#0d1117]">Commission Trend</p>
            <span className="text-[11px] text-[#9aa5b1] bg-[#f5fdf7] px-2 py-1 rounded-full">{range}</span>
          </div>
          <EarningsChart data={chartData.slice(-14)} metric="commission" />
        </RzCard>

        {/* KPI Cards */}
        <div className="animate-fade-up delay-100">
          <h2 className="text-[15px] font-[700] text-[#0d1117] mb-3">Performance</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "GMV / Video", value: `RM ${(gmvPerVideo / 1000).toFixed(1)}k`, icon: Video, color: "#00c073" },
              { label: "GMV / Live", value: `RM ${(gmvPerLive / 1000).toFixed(1)}k`, icon: Radio, color: "#25f4ee" },
              { label: "Video Views", value: totalViews, icon: Eye, color: "#f5a623" },
            ].map(({ label, value, icon: Icon, color }) => (
              <RzCard key={label} padding={false} className="p-3">
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-2"
                  style={{ background: `${color}22` }}
                >
                  <Icon size={14} color={color} />
                </div>
                <p className="text-[14px] font-[800] text-[#0d1117] leading-none">{value}</p>
                <p className="text-[10px] text-[#9aa5b1] font-[500] mt-1 leading-tight">{label}</p>
              </RzCard>
            ))}
          </div>
        </div>

        {/* Summary */}
        <RzCard className="animate-fade-up delay-200" padding={false}>
          <div className="divide-y divide-[#f5fdf7]">
            {[
              { label: "Total GMV", value: formatRM(totalGMV), color: "#0d1117" },
              { label: "Commission Earned", value: formatRM(totalCommission), color: "#00c073" },
              { label: "Avg Commission Rate", value: "12%", color: "#0d1117" },
              { label: "Pending Payout", value: "RM 892.40", color: "#f5a623" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-[#4a5568]">{label}</span>
                <span className="text-[14px] font-[700]" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </RzCard>

        {/* Top Posts */}
        <div className="animate-fade-up delay-300">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-[700] text-[#0d1117]">Top Performing Posts</h2>
            <button className="text-[12px] text-[#00c073] font-[600] tap-target flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {topPosts.map((post, i) => (
              <RzCard key={post.id} padding={false} className="overflow-hidden tap-target">
                <div className="flex items-center gap-3 p-3">
                  <div
                    className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0 relative"
                    style={{ background: post.imageColor }}
                  >
                    {post.imageUrl && (
                      <Image
                        src={post.imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    )}
                    <span
                      className="absolute bottom-1 right-1 text-[9px] font-[700] text-white px-1.5 py-0.5 rounded-full"
                      style={{
                        background: post.platform === "live" ? "#e8005a" : "#0d1117"
                      }}
                    >
                      {post.platform === "live" ? "LIVE" : "VIDEO"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[600] text-[#0d1117] truncate">{post.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Eye size={10} color="#9aa5b1" />
                        <span className="text-[11px] text-[#9aa5b1]">{post.views}</span>
                      </div>
                      <span className="text-[11px] text-[#9aa5b1]">GMV: RM {post.gmv.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-[800] text-[#00c073]">RM {post.commission}</p>
                    <p className="text-[10px] text-[#9aa5b1]">earned</p>
                  </div>
                </div>
              </RzCard>
            ))}
          </div>
        </div>

        {/* Withdraw CTA */}
        <div className="animate-fade-up delay-400 pb-2">
          <RzButton
            leftIcon={<Wallet size={18} />}
          >
            Withdraw Earnings — RM 892.40
          </RzButton>
          <p className="text-center text-[11px] text-[#9aa5b1] mt-2">
            Instant transfer to Maybank **** 4521
          </p>
        </div>

      </div>
    </AppShell>
  );
}
