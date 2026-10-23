import { cookies } from "next/headers";
import { VIEW_COOKIE } from "@/lib/view.ts";
import type { AppUser } from "@/modules/accounts/users.ts";

/** True when an account with admin access has switched this device to the admin dashboard (menus, Settings, English). */
export async function adminView(user: Pick<AppUser, "role"> | null | undefined): Promise<boolean> {
  return user?.role === "admin" && (await cookies()).get(VIEW_COOKIE)?.value === "admin";
}
