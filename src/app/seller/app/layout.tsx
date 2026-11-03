import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { currentUser } from "@/app/current-user";

/** The seller app is for signed-in people; anyone else goes to sign-in instead of the sample shop (owner, 3 Nov 2026). */
export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentUser())) redirect("/signin?in=1&next=/seller/app");
  return <Shell app="seller">{children}</Shell>;
}
