"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** "Sign in" or "My account" on the static homepage, checked in the browser so the page itself can be served from the CDN. */
export function NavAccount() {
  const [me, setMe] = useState<{ signedIn: boolean; avatar?: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ signedIn: false }));
  }, []);
  if (me?.signedIn)
    return (
      <Link href="/app" className="site-signin site-account">
        {me.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.avatar} alt="" width={26} height={26} />
        ) : null}
        My account
      </Link>
    );
  return (
    <Link href="/signin" className="site-signin">
      Sign in
    </Link>
  );
}
