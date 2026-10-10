import { callCreatorApi } from "./api.ts";

export type CreatorProfile = {
  creator_user_open_id: string;
  username: string;
  avatar?: { url: string };
  register_region?: string;
  permissions?: string[];
};

export function getCreatorProfile(accessToken: string) {
  return callCreatorApi<CreatorProfile>({
    method: "GET",
    path: "/affiliate_creator/202508/profiles",
    accessToken,
  });
}

export type GeneralLinks = {
  sharing_links?: { material_id: string; sharing_link?: string; deep_link?: string; one_link?: string }[];
  failed_materials?: { material_id: string; fail_reason: string }[];
};

/** "Creator Generate General Link": up to 50 product IDs per call. */
export function generateGeneralLinks(accessToken: string, productIds: string[], campaignId?: string) {
  return callCreatorApi<GeneralLinks>({
    method: "POST",
    path: "/affiliate_creator/202505/affiliate_sharing_links/general_publishers/generate_batch",
    accessToken,
    body: {
      material: { type: "PRODUCT", ids: productIds },
      ...(campaignId ? { campaign_id: campaignId } : {}),
    },
  });
}

export type TaggedLinks = {
  affiliate_sharing_links?: { tag: string; affiliate_sharing_link: string }[];
  errors?: { code: number; message: string; detail?: { tag: string; fail_reason: string } }[];
};

/** "Generate Affiliate Sharing Link": one link per tag (e.g. threads, whatsapp) for one product. */
export function generateTaggedLinks(accessToken: string, productId: string, tags: string[]) {
  return callCreatorApi<TaggedLinks>({
    method: "POST",
    path: "/affiliate_creator/202501/affiliate_sharing_links/generate_batch",
    accessToken,
    body: { material: { type: "PRODUCT", id: productId }, tags },
  });
}
