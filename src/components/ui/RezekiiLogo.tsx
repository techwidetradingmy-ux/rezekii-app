interface RezekiiLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "color";
  /** Show only the icon mark, no wordmark */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { icon: 28, text: "text-[16px]", gap: "gap-1.5" },
  md: { icon: 36, text: "text-[22px]", gap: "gap-2" },
  lg: { icon: 52, text: "text-[32px]", gap: "gap-3" },
};

export default function RezekiiLogo({ size = "md", variant = "light", iconOnly = false }: RezekiiLogoProps) {
  const { icon: iconSize, text, gap } = sizeMap[size];
  const textColor =
    variant === "light" ? "#ffffff" :
    variant === "dark"  ? "#0d1117" :
    "#0d1117";

  const r = iconSize / 2;
  const cornerRadius = iconSize * 0.26;

  return (
    <div className={`inline-flex items-center ${gap}`}>
      {/* Icon mark: green rounded square with white R + warm gradient dot accent */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox={`0 0 ${iconSize} ${iconSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="rz-warm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5a623" />
            <stop offset="100%" stopColor="#e8005a" />
          </linearGradient>
        </defs>
        {/* Green rounded square background */}
        <rect
          x="0" y="0"
          width={iconSize} height={iconSize}
          rx={cornerRadius}
          fill="#00c073"
        />
        {/* White "R" letterform */}
        <text
          x={r * 0.86}
          y={r * 1.46}
          textAnchor="middle"
          fontFamily="'Albert Sans', system-ui, sans-serif"
          fontWeight="900"
          fontSize={iconSize * 0.56}
          fill="white"
        >
          R
        </text>
        {/* Warm gradient dot accent — top-right */}
        <circle
          cx={iconSize * 0.78}
          cy={iconSize * 0.22}
          r={iconSize * 0.13}
          fill="url(#rz-warm)"
        />
      </svg>

      {/* Wordmark */}
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
