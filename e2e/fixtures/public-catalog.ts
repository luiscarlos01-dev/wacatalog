import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/config/env";

// No admin UI exists yet for `hero_banners` (out of scope for this feature,
// see specs/003-public-catalog/data-model.md) and the table has no write
// RLS policy at all — the service role key is the only way to seed test
// banners, same purpose the key was already reserved for in `.env.example`.
export function hasConfiguredBannerSeeding(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().length);
}

function getServiceRoleClient() {
  const { supabaseUrl } = getPublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured for banner seeding.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export type SeedHeroBannerInput = {
  storeId: string;
  imageAssetId: string;
  accessibleDescription: string;
  title?: string | null;
  text?: string | null;
  position: number;
  isActive?: boolean;
};

export async function seedHeroBanner(input: SeedHeroBannerInput): Promise<string> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from("hero_banners")
    .insert({
      store_id: input.storeId,
      image_asset_id: input.imageAssetId,
      accessible_description: input.accessibleDescription,
      title: input.title ?? null,
      text: input.text ?? null,
      position: input.position,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed hero banner: ${error?.message ?? "no row returned"}`);
  }

  return data.id;
}

export async function deleteHeroBanners(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const supabase = getServiceRoleClient();
  await supabase.from("hero_banners").delete().in("id", ids);
}
