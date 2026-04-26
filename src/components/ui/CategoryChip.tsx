"use client";

interface CategoryChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function CategoryChip({ label, active = false, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-[20px] text-[13px] font-[600] shrink-0 whitespace-nowrap",
        "border transition-all duration-[120ms] tap-target",
        active
          ? "bg-[#00c073] text-white border-[#00c073] shadow-[0_2px_8px_rgba(0,192,115,0.3)]"
          : "bg-white text-[#4a5568] border-[#d8f0e4] hover:border-[#00c073] hover:text-[#00c073]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
