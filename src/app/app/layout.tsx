import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { LinkBanner } from "@/components/link-banner";
import { currentUser } from "@/app/current-user";

/** The creator app is for signed-in people; anyone else goes to sign-in instead of the sample account (owner, 3 Nov 2026). */
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentUser())) redirect("/signin?in=1");
  return (
    <Shell app="creator" banner={<LinkBanner />}>
      {children}
    </Shell>
  );
}
