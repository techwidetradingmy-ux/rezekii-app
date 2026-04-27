"use client";

import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import RzButton from "@/components/ui/RzButton";
import Link from "next/link";
import { ArrowLeft, TrendingUp, CreditCard, ArrowDownToLine } from "lucide-react";
import { creatorProfile } from "@/lib/mock-data";

function formatRM(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const transactions = [
  { id: "t1", type: "credit", label: "Commission — COSRX Serum Video",    amount: 84.00,    date: "27 Apr 2026", method: "TikTok Shop" },
  { id: "t2", type: "credit", label: "Commission — ZALORA Live",           amount: 1020.00,  date: "25 Apr 2026", method: "TikTok Shop" },
  { id: "t3", type: "debit",  label: "Payout To Maybank **** 4521",        amount: 1245.60,  date: "24 Apr 2026", method: "Bank Transfer" },
  { id: "t4", type: "credit", label: "Commission — Hari Raya Snacks",      amount: 280.00,   date: "22 Apr 2026", method: "TikTok Shop" },
  { id: "t5", type: "credit", label: "Commission — Tech Gadgets Video",    amount: 117.00,   date: "20 Apr 2026", method: "TikTok Shop" },
  { id: "t6", type: "debit",  label: "Payout To Maybank **** 4521",        amount: 800.00,   date: "15 Apr 2026", method: "Bank Transfer" },
  { id: "t7", type: "credit", label: "Commission — COSRX Campaign Bonus",  amount: 350.00,   date: "12 Apr 2026", method: "TikTok Shop" },
];

const availableBalance = 892.40;
const pendingBalance   = 543.20;
const totalPaidOut     = 15240.00;

export default function WalletPage() {
  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: "#00c073" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link href="/profile" className="tap-target">
            <ArrowLeft size={22} color="white" strokeWidth={2} />
          </Link>
          <h1 className="text-[22px] font-[800] text-white">Wallet & Payout</h1>
        </div>

        {/* Balance card */}
        <RzCard padding={false} className="animate-fade-up">
          <div
            className="rounded-t-[16px] px-4 pt-4 pb-3"
            style={{ background: "linear-gradient(135deg, #00c073 0%, #009a5c 100%)" }}
          >
            <p className="text-white/70 text-[12px] font-[500] mb-0.5">Available Balance</p>
            <p className="text-white text-[32px] font-[800] leading-tight">{formatRM(availableBalance)}</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#f5fdf7] py-3">
            <div className="flex flex-col items-center">
              <p className="text-[15px] font-[700] text-[#f5a623]">{formatRM(pendingBalance)}</p>
              <p className="text-[10px] text-[#9aa5b1]">Pending</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[15px] font-[700] text-[#0d1117]">{formatRM(totalPaidOut)}</p>
              <p className="text-[10px] text-[#9aa5b1]">Total Paid Out</p>
            </div>
          </div>
        </RzCard>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-4">

        {/* Withdraw Button */}
        <div className="animate-fade-up">
          <RzButton leftIcon={<ArrowDownToLine size={18} />}>
            Withdraw — {formatRM(availableBalance)}
          </RzButton>
          <p className="text-center text-[11px] text-[#9aa5b1] mt-2">
            Instant transfer to {creatorProfile.bankAccount}
          </p>
        </div>

        {/* Bank Details */}
        <RzCard className="animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard size={16} color="#00c073" />
              <p className="text-[14px] font-[700] text-[#0d1117]">Bank Account</p>
            </div>
            <button className="text-[12px] text-[#00c073] font-[600] tap-target">Edit</button>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: "#fff3d6" }}
            >
              <span className="text-[14px] font-[900] text-[#f5a623]">M</span>
            </div>
            <div>
              <p className="text-[14px] font-[600] text-[#0d1117]">{creatorProfile.bankAccount}</p>
              <p className="text-[11px] text-[#9aa5b1]">Maybank Berhad · Default</p>
            </div>
          </div>
        </RzCard>

        {/* Transaction History */}
        <div className="animate-fade-up delay-200">
          <h2 className="text-[16px] font-[700] text-[#0d1117] mb-3">Transaction History</h2>
          <RzCard padding={false} className="divide-y divide-[#f5fdf7]">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: tx.type === "credit"
                      ? "rgba(0,192,115,0.12)"
                      : "rgba(232,0,90,0.10)",
                  }}
                >
                  {tx.type === "credit"
                    ? <TrendingUp size={14} color="#00c073" />
                    : <ArrowDownToLine size={14} color="#e8005a" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#0d1117] font-[500] truncate">{tx.label}</p>
                  <p className="text-[11px] text-[#9aa5b1]">{tx.date} · {tx.method}</p>
                </div>
                <span
                  className="text-[13px] font-[700] shrink-0"
                  style={{ color: tx.type === "credit" ? "#00c073" : "#e8005a" }}
                >
                  {tx.type === "credit" ? "+" : "−"}RM {tx.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </RzCard>
        </div>

      </div>
    </AppShell>
  );
}
