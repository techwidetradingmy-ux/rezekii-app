import "@/app/admin.css";
import { teamDrafts } from "@/modules/admin/posts.ts";
import { AdminDrafts } from "@/components/admin/posting";
import { adminOnly } from "../../guard";

export const dynamic = "force-dynamic";

/** Admin › Posting › Drafts (as on rezekii.com): drafts on Techwide's own TikTok accounts. */
export default async function PostingDrafts() {
  await adminOnly();
  return <AdminDrafts drafts={await teamDrafts()} />;
}
