import Image from "next/image";

interface RezekiiLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "color";
  /** Show only the icon mark, no wordmark */
  iconOnly?: boolean;
  /** Override icon pixel size */
  px?: number;
}

const sizeMap = {
  sm: { px: 28, text: "text-[16px]", gap: "gap-1.5" },
  md: { px: 36, text: "text-[22px]", gap: "gap-2" },
  lg: { px: 52, text: "text-[32px]", gap: "gap-3" },
};

export default function RezekiiLogo({ size = "md", variant = "light", iconOnly = false, px: pxOverride }: RezekiiLogoProps) {
  const { px: pxDefault, text, gap } = sizeMap[size];
  const iconPx = pxOverride ?? pxDefault;
  const textColor = variant === "light" ? "#ffffff" : "#0d1117";

  return (
    <div className={`inline-flex items-center ${gap}`}>
      <Image
        src="/rezekii-logo.png"
        alt="Rezekii"
        width={iconPx}
        height={iconPx}
        priority
        style={{ display: "block" }}
      />
      {!iconOnly && (
        <span
          className={`font-[900] tracking-tight leading-none select-none ${text}`}
          style={{ color: textColor, fontFamily: "'Albert Sans', var(--font-albert-sans), system-ui, sans-serif" }}
        >
          rezekii
        </span>
      )}
    </div>
  );
}
