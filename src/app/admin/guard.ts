import { redirect } from "next/navigation";
import { currentUser } from "@/app/current-user";

/** Admin pages that read data on the server check first, so nothing loads for anyone else (the layout sends them on). */
export async function adminOnly() {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/admin");
  return user;
}
