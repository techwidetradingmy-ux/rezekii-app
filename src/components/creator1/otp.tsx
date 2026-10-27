"use client";

import { useEffect, useRef } from "react";

/** Six one-digit boxes: typing moves forward, Backspace moves back, pasting a whole code fills them all. */
export function Otp({ value, onChange, state }: { value: string; onChange: (v: string) => void; state?: "ok" | "busy" }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  const set = (i: number, digit: string) => {
    const arr = value.padEnd(6, " ").split("");
    arr[i] = digit || " ";
    onChange(arr.join("").replace(/\s+$/, ""));
  };
  return (
    <div className={`cr1-otp ${state ?? ""}`} role="group" aria-label="6-digit code">
      {Array.from({ length: 6 }, (_, i) => {
        const d = value[i] && value[i] !== " " ? value[i] : "";
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={d ? "filled" : undefined}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            maxLength={6}
            value={d}
            disabled={state === "busy" || state === "ok"}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              if (digits.length > 1) {
                // Pasted or autofilled: spread from this box onwards.
                const arr = value.padEnd(6, " ").split("");
                digits.slice(0, 6 - i).split("").forEach((c, k) => (arr[i + k] = c));
                onChange(arr.join("").replace(/\s+$/, ""));
                refs.current[Math.min(5, i + digits.length)]?.focus();
                return;
              }
              set(i, digits);
              if (digits && i < 5) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) {
                set(i - 1, "");
                refs.current[i - 1]?.focus();
              }
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
          />
        );
      })}
    </div>
  );
}
