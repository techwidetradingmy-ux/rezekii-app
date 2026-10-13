import { redirect } from "next/navigation";
import { currentUser } from "../../current-user";

/** Admin pages: signed-in Techwide admins only; everyone else goes to their own Today. */
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role !== "admin") redirect("/app");
  return user;
}
