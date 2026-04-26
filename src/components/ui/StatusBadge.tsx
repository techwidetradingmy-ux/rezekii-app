import React from "react";

type Status = "Active" | "Pending" | "Completed" | "Rejected" | "Approved" | "Shipped";

const statusConfig: Record<Status, { bg: string; text: string; dot: string }> = {
  Active:    { bg: "bg-[rgba(0,192,115,0.12)]",  text: "text-[#00c073]",  dot: "bg-[#00c073]" },
  Pending:   { bg: "bg-[rgba(245,166,35,0.12)]",  text: "text-[#d97706]",  dot: "bg-[#f5a623]" },
  Completed: { bg: "bg-[rgba(99,102,241,0.12)]",  text: "text-[#4338ca]",  dot: "bg-[#6366f1]" },
  Rejected:  { bg: "bg-[rgba(239,68,68,0.10)]",   text: "text-[#dc2626]",  dot: "bg-[#ef4444]" },
  Approved:  { bg: "bg-[rgba(0,192,115,0.12)]",   text: "text-[#00c073]",  dot: "bg-[#00c073]" },
  Shipped:   { bg: "bg-[rgba(245,166,35,0.12)]",  text: "text-[#d97706]",  dot: "bg-[#f5a623]" },
};

interface StatusBadgeProps {
  status: Status | string;
  showDot?: boolean;
}

export default function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status as Status] ?? {
    bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400"
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
        "text-[11px] font-[600] tracking-wide",
        config.bg, config.text,
      ].join(" ")}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      )}
      {status}
    </span>
  );
}
