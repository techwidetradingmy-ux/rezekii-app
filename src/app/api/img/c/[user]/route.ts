import { noImage, readCreatorPhoto } from "@/modules/photos/store.ts";

export const dynamic = "force-dynamic";

/** A creator's saved TikTok photo (public on TikTok anyway). The page adds ?v=<day saved>, so caches keep each copy for good. */
export async function GET(_req: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  if (!/^[a-z0-9._]{1,40}$/i.test(user)) return noImage();
  return (await readCreatorPhoto(user)) ?? noImage();
}
