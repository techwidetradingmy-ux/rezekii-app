import React from "react";

interface RzCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
  as?: "div" | "article" | "section";
}

export default function RzCard({
  children,
  className = "",
  padding = true,
  onClick,
  as: Tag = "div",
}: RzCardProps) {
  return (
    <Tag
      onClick={onClick}
      className={[
        "bg-white rounded-[16px] border border-[#d8f0e4]",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
        padding ? "p-4" : "",
        onClick ? "cursor-pointer tap-target active:scale-[0.99]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}
