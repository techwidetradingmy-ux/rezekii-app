"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ERRORS: Record<string, string> = {
  denied: "Sign-in was cancelled. Try again when you're ready.",
  expired: "That sign-in took too long or was opened in another browser. Please try again.",
  failed: "We couldn't finish signing you in. Please try again.",
  config: "Sign-in isn't switched on yet. Please try again later.",
};

/** The sign-in page is static (served from the CDN), so the error message and the "already signed in" check run in the browser. */
export function SigninStatus() {
  const router = useRouter();
  const error = useSearchParams().get("error");
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((me: { signedIn?: boolean }) => {
        if (me.signedIn) router.replace("/app");
      })
      .catch(() => {});
  }, [router]);
  if (!error || !ERRORS[error]) return null;
  return (
    <p role="alert" className="signin-error">
      {ERRORS[error]}
    </p>
  );
}
