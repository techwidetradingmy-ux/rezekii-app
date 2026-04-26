interface RezekiiLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "color";
}

const sizeMap = {
  sm: { text: "text-[18px]", dot: "w-2 h-2" },
  md: { text: "text-[26px]", dot: "w-3 h-3" },
  lg: { text: "text-[36px]", dot: "w-4 h-4" },
};

export default function RezekiiLogo({ size = "md", variant = "light" }: RezekiiLogoProps) {
  const { text, dot } = sizeMap[size];
  const textColor =
    variant === "light" ? "text-white" :
    variant === "dark"  ? "text-[#0d1117]" :
    "text-[#0d1117]";

  return (
    <div className="inline-flex items-center gap-1">
      <span className={`font-[900] tracking-tight leading-none ${text} ${textColor}`}>
        rezekii
      </span>
      {/* Warm gradient dot — brand accent */}
      <span
        className={`rounded-full shrink-0 ${dot}`}
        style={{ background: "linear-gradient(135deg, #f5a623, #e8005a)" }}
      />
    </div>
  );
}
