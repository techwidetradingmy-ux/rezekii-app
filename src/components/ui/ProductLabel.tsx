type Label = "BEST SELLER" | "HOT SELLING" | "NEW ARRIVAL";

const labelConfig: Record<Label, string> = {
  "BEST SELLER":  "from-[#f5a623] to-[#e8005a]",
  "HOT SELLING":  "from-[#e8005a] to-[#f5a623]",
  "NEW ARRIVAL":  "from-[#00c073] to-[#009a5c]",
};

export default function ProductLabel({ label }: { label: Label }) {
  const gradient = labelConfig[label] ?? "from-[#9aa5b1] to-[#4a5568]";
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-[8px] text-[9px] font-[700] text-white tracking-wider",
        `bg-gradient-to-r ${gradient}`,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
