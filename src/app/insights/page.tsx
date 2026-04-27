"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import EarningsChart from "@/components/ui/EarningsChart";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Percent } from "lucide-react";
import { earningsWeek, earnings30Days, products } from "@/lib/mock-data";

const ranges = ["Past 7 Days", "Past 30 Days", "This Month"] as const;
type Range = typeof ranges[number];

function formatRM(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const commissionBreakdown = [
  { label: "Beauty",  pct: 42, color: "#e8005a" },
  { label: "Fashion", pct: 28, color: "#9aa5b1" },
  { label: "Food",    pct: 18, color: "#f5a623" },
  { label: "Tech",    pct: 12, color: "#25f4ee" },
];

export default function InsightsPage() {
  const [range, setRange]   = useState<Range>("Past 7 Days");
  const [metric, setMetric] = useState<"gmv" | "commission">("gmv");

  const chartData      = range === "Past 30 Days" ? earnings30Days.slice(-30) : earningsWeek;
  const totalGMV       = chartData.reduce((s, d) => s + d.gmv, 0);
  const totalCommission= chartData.reduce((s, d) => s + d.commission, 0);
  const totalOrders    = Math.round(totalGMV / 45);

  const topProducts = [...products]
    .sort((a, b) => b.sold * b.priceRM - a.sold * a.priceRM)
    .slice(0, 4);

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: "#00c073" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link href="/profile" className="tap-target">
            <ArrowLeft size={22} color="white" strokeWidth={2} />
          </Link>
          <h1 className="text-[22px] font-[800] text-white">Sales & Insights</h1>
        </div>

        {/* KPI pair */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up">
          {[
            { label: "Total GMV",    value: formatRM(totalGMV) },
            { label: "Commission",   value: formatRM(totalCommission) },
          ].map(({ label, value }) => (
            <RzCard key={label} padding={false} className="p-3">
              <p className="text-[11px] text-[#9aa5b1] font-[500] mb-1">{label}</p>
              <p className="text-[17px] font-[800] text-[#0d1117]">{value}</p>
            </RzCard>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-4">

        {/* Date Range */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 animate-fade-up">
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

        {/* Daily GMV Chart */}
        <RzCard className="animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-[700] text-[#0d1117]">Daily GMV</p>
            <div className="flex gap-1">
              {(["gmv", "commission"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={[
                    "px-3 py-1 rounded-full text-[11px] font-[600] tap-target transition-all",
                    metric === m ? "bg-[#00c073] text-white" : "text-[#9aa5b1]",
                  ].join(" ")}
                >
                  {m === "gmv" ? "GMV" : "Commission"}
                </button>
              ))}
            </div>
          </div>
          <EarningsChart data={chartData.slice(-14)} metric={metric} />
        </RzCard>

        {/* Conversion Rate + Orders */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up delay-200">
          <RzCard padding={false} className="p-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2" style={{ background: "rgba(37,244,238,0.15)" }}>
              <Percent size={16} color="#25f4ee" />
            </div>
            <p className="text-[20px] font-[800] text-[#0d1117] leading-none">3.8%</p>
            <p className="text-[10px] text-[#9aa5b1] mt-1">Conversion Rate</p>
            <p className="text-[10px] font-[600] text-[#25f4ee] mt-0.5">vs 3.2% avg</p>
          </RzCard>
          <RzCard padding={false} className="p-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2" style={{ background: "rgba(245,166,35,0.15)" }}>
              <ShoppingBag size={16} color="#f5a623" />
            </div>
            <p className="text-[20px] font-[800] text-[#0d1117] leading-none">{totalOrders}</p>
            <p className="text-[10px] text-[#9aa5b1] mt-1">Total Orders</p>
            <p className="text-[10px] font-[600] text-[#f5a623] mt-0.5">
              ~RM {Math.round(totalGMV / totalOrders)} avg order
            </p>
          </RzCard>
        </div>

        {/* Top Products By GMV */}
        <div className="animate-fade-up delay-300">
          <h2 className="text-[15px] font-[700] text-[#0d1117] mb-3">Top Products By GMV</h2>
          <RzCard padding={false} className="divide-y divide-[#f5fdf7]">
            {topProducts.map((p, i) => {
              const estGMV = Math.round(p.sold * p.priceRM / 1000);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[13px] font-[800] text-[#d8f0e4] w-5 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[600] text-[#0d1117] truncate">{p.name}</p>
                    <p className="text-[11px] text-[#9aa5b1]">{p.brand} · {p.commissionRate}% comm</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-[700] text-[#00c073]">RM {estGMV}k</p>
                    <p className="text-[10px] text-[#9aa5b1]">est. GMV</p>
                  </div>
                </div>
              );
            })}
          </RzCard>
        </div>

        {/* Commission Breakdown */}
        <div className="animate-fade-up delay-400">
          <h2 className="text-[15px] font-[700] text-[#0d1117] mb-3">Commission Breakdown</h2>
          <RzCard>
            <div className="flex flex-col gap-3">
              {commissionBreakdown.map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-[500] text-[#4a5568]">{label}</span>
                    <span className="text-[13px] font-[700] text-[#0d1117]">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f5fdf7] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </RzCard>
        </div>

      </div>
    </AppShell>
  );
}
