"use client";

import React from "react";

interface RzInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  error?: string;
  hint?: string;
}

export default function RzInput({
  label,
  leadingIcon,
  trailingIcon,
  error,
  hint,
  className = "",
  ...props
}: RzInputProps) {
  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label className="text-[13px] font-[500] text-[#4a5568]">{label}</label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-3 text-[#9aa5b1] pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          {...props}
          className={[
            "w-full h-12 bg-white border rounded-[10px] px-4",
            "text-[14px] text-[#0d1117] placeholder:text-[#9aa5b1]",
            "outline-none transition-all duration-[200ms]",
            "focus:border-[#00c073] focus:ring-2 focus:ring-[#00c073]/20",
            error ? "border-red-400" : "border-[#d8f0e4]",
            leadingIcon ? "pl-10" : "",
            trailingIcon ? "pr-10" : "",
            className,
          ].join(" ")}
        />
        {trailingIcon && (
          <span className="absolute right-3 text-[#9aa5b1]">
            {trailingIcon}
          </span>
        )}
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      {hint && !error && <p className="text-[12px] text-[#9aa5b1]">{hint}</p>}
    </div>
  );
}
