"use client";

import React from "react";

type Variant = "primary" | "tiktok" | "ghost" | "dark" | "outline";

interface RzButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-[#00c073] hover:bg-[#009a5c] text-white border-transparent shadow-[0_2px_12px_rgba(0,192,115,0.25)] rz-btn-fx-primary",
  tiktok:  "bg-[#25f4ee] hover:bg-[#1be0da] text-[#0d1117] border-transparent",
  ghost:   "bg-[rgba(0,192,115,0.09)] hover:bg-[rgba(0,192,115,0.15)] text-[#00c073] border-[#d8f0e4]",
  dark:    "bg-[#0d1117] hover:bg-[#1a2332] text-white border-transparent",
  outline: "bg-transparent hover:bg-[rgba(0,192,115,0.06)] text-[#00c073] border-[#00c073]",
};

const sizeStyles = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-[52px] px-5 text-[15px]",
  lg: "h-14 px-6 text-[16px]",
};

export default function RzButton({
  variant = "primary",
  loading = false,
  fullWidth = true,
  size = "md",
  leftIcon,
  rightIcon,
  children,
  className = "",
  disabled,
  ...props
}: RzButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-[12px] border font-[700]",
        "rz-btn-fx",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c073]/50",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
