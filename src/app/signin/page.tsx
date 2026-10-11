import type { Metadata } from "next";
import Link from "next/link";
import { Splash } from "../splash";

export const metadata: Metadata = { title: "Sign in · Rezekii" };

/** Placeholder until "Continue with TikTok" and Google sign-in are built (Phase 1). */
export default function SignIn() {
  return (
    <Splash>
      <h1>Sign-in opens soon</h1>
      <p>
        We&apos;re finishing Rezekii&apos;s TikTok connection. Questions in the meantime: <a href="mailto:support@rezekii.com">support@rezekii.com</a>.{" "}
        <Link href="/">Back to the homepage</Link>
      </p>
    </Splash>
  );
}
