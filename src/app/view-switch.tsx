"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "@/lib/i18n/client.tsx";
import { VIEW_COOKIE } from "@/lib/view.ts";

const remember = (admin: boolean) => {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = admin ? `${VIEW_COOKIE}=admin; path=/; max-age=31536000; samesite=lax${secure}` : `${VIEW_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
};

/**
 * For accounts with admin access: Admin dashboard (on the creator pages) or Creator view (in the admin dashboard). A full page
 * load, so the menus and language follow the choice.
 */
export function ViewSwitch({ to }: { to: "admin" | "creator" }) {
  const t = useT();
  return (
    <button
      type="button"
      className="view-switch"
      onClick={() => {
        remember(to === "admin");
        window.location.href = to === "admin" ? "/app/admin" : "/app";
      }}
    >
      {to === "admin" ? t("Admin dashboard") : t("Creator view")}
    </button>
  );
}

/** An admin page opened in creator view (an old link or bookmark): this device switches to the admin dashboard's menus. */
export function AdminViewMark() {
  const router = useRouter();
  useEffect(() => {
    if (document.cookie.split("; ").includes(`${VIEW_COOKIE}=admin`)) return;
    remember(true);
    router.refresh();
  }, [router]);
  return null;
}
