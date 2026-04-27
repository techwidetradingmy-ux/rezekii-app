import AppShell from "@/components/layout/AppShell";
import RezekiiLogo from "@/components/ui/RezekiiLogo";
import RzCard from "@/components/ui/RzCard";
import Link from "next/link";
import {
  TrendingUp, Package, Megaphone, Clock,
  ChevronRight, ArrowUpRight, Bell, Wallet,
} from "lucide-react";
import {
  dashboardStats, recentActivity, creatorProfile, earningsWeek,
} from "@/lib/mock-data";
import EarningsChart from "@/components/ui/EarningsChart";

function formatRM(amount: number) {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HomePage() {
  const totalWeekCommission = earningsWeek.reduce((s, d) => s + d.commission, 0);

  return (
    <AppShell>
      {/* Green header band — contains logo, greeting AND earnings card */}
      <div
        style={{ background: "#00c073" }}
        className="px-5 pt-12 pb-5"
      >
        {/* Top row: logo + bell */}
        <div className="flex items-center justify-between mb-3">
          <RezekiiLogo size="md" variant="light" />
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative tap-target">
              <Bell size={22} color="white" strokeWidth={1.8} />
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] text-white font-[700] flex items-center justify-center"
                style={{ background: "#e8005a" }}
              >3</span>
            </Link>
          </div>
        </div>

        {/* Greeting */}
        <p className="text-white text-[18px] font-[700] mb-4">
          Good morning, {creatorProfile.name.split(" ")[0]} 👋
        </p>

        {/* Earnings card — sits inside the green band */}
        <RzCard padding={false} className="animate-fade-up">
          {/* Card top: monthly earnings with gradient */}
          <div
            className="rounded-t-[16px] px-4 pt-4 pb-3"
            style={{ background: "linear-gradient(135deg, #00c073 0%, #009a5c 100%)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-[12px] font-[500] mb-0.5">This Month&apos;s Earnings</p>
                <p className="text-white text-[24px] font-[700] leading-tight">
                  {formatRM(dashboardStats.totalEarningsThisMonth)}
                </p>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full mt-1"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <ArrowUpRight size={12} color="white" />
                <span className="text-white text-[12px] font-[700]">+{dashboardStats.earningsDelta}%</span>
              </div>
            </div>
            <p className="text-white/60 text-[11px] mt-1">vs last month</p>
          </div>

          {/* Card bottom: weekly chart + 7-day commission */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[11px] text-[#9aa5b1] font-[500] mb-2">This week</p>
            <EarningsChart data={earningsWeek} metric="commission" />
          </div>
          <div className="px-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#9aa5b1]">7-day commission</p>
              <p className="text-[15px] font-[700] text-[#0d1117]">{formatRM(totalWeekCommission)}</p>
            </div>
            <Link href="/earnings">
              <button className="flex items-center gap-1 text-[#00c073] text-[13px] font-[600] tap-target">
                See all <ChevronRight size={14} />
              </button>
            </Link>
          </div>
        </RzCard>
      </div>

      {/* White section */}
      <div className="px-5 pt-4 pb-4 flex flex-col gap-4">

        {/* Quick Stats — all green icons per design spec */}
        <div className="grid grid-cols-3 gap-3 animate-fade-up delay-100">
          {[
            { label: "Products Sold",   value: dashboardStats.productsSold,      icon: Package,   },
            { label: "Campaigns",        value: dashboardStats.activeCampaigns,   icon: Megaphone, },
            { label: "Pending Samples", value: dashboardStats.pendingSamples,    icon: Clock,     },
          ].map(({ label, value, icon: Icon }) => (
            <RzCard key={label} padding={false} className="p-3">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-2"
                style={{ background: "rgba(0,192,115,0.12)" }}
              >
                <Icon size={16} color="#00c073" />
              </div>
              <p className="text-[20px] font-[800] text-[#0d1117] leading-none">{value}</p>
              <p className="text-[10px] text-[#9aa5b1] font-[500] mt-1 leading-tight">{label}</p>
            </RzCard>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up delay-200">
          <Link href="/marketplace">
            <div
              className="rounded-[14px] p-4 flex items-center gap-3 tap-target"
              style={{
                background: "#00c073",
                boxShadow: "0 2px 12px rgba(0,192,115,0.25)",
              }}
            >
              <Package size={20} color="white" />
              <span className="text-white font-[700] text-[14px]">Browse Products</span>
            </div>
          </Link>
          <Link href="/earnings">
            <div
              className="rounded-[14px] p-4 flex items-center gap-3 tap-target bg-white"
              style={{ border: "1.5px solid #00c073" }}
            >
              <Wallet size={20} color="#00c073" />
              <span className="font-[700] text-[14px]" style={{ color: "#00c073" }}>Withdraw</span>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="animate-fade-up delay-300">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-[700] text-[#0d1117]">Recent Activity</h2>
            <button className="text-[12px] text-[#00c073] font-[600] tap-target">See all</button>
          </div>
          <RzCard padding={false} className="divide-y divide-[#f5fdf7]">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: item.type === "earn"   ? "rgba(0,192,115,0.12)" :
                                item.type === "payout" ? "rgba(232,0,90,0.10)"  :
                                                         "rgba(245,166,35,0.12)"
                  }}
                >
                  {item.type === "earn"     && <TrendingUp size={14} color="#00c073" />}
                  {item.type === "payout"   && <Wallet     size={14} color="#e8005a" />}
                  {item.type === "sample"   && <Package    size={14} color="#f5a623" />}
                  {item.type === "campaign" && <Megaphone  size={14} color="#f5a623" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#0d1117] font-[500] truncate">{item.text}</p>
                  <p className="text-[11px] text-[#9aa5b1]">{item.time}</p>
                </div>
                {item.amount && (
                  <span
                    className="text-[13px] font-[700] shrink-0"
                    style={{ color: item.amount.startsWith("+") ? "#00c073" : "#4a5568" }}
                  >
                    {item.amount}
                  </span>
                )}
              </div>
            ))}
          </RzCard>
        </div>

        {/* Creator level banner */}
        <RzCard padding={false} className="animate-fade-up delay-400">
          <div className="p-4 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-[20px] shrink-0"
              style={{ background: "rgba(245,166,35,0.15)" }}
            >
              🏅
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px] font-[700] text-[#0d1117]">Gold Creator</span>
                <span
                  className="text-[10px] font-[600] px-2 py-0.5 rounded-full"
                  style={{ color: "#f5a623", background: "rgba(245,166,35,0.12)" }}
                >
                  68% to Platinum
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#f5fdf7" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: "68%", background: "linear-gradient(90deg, #f5a623, #e8005a)" }}
                />
              </div>
            </div>
          </div>
        </RzCard>

      </div>
    </AppShell>
  );
}
