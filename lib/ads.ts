import "server-only";

import { createClient } from "./supabase/server";
import { isEnabled } from "./features";
import { nearestFirst } from "./sponsored";
import { LISTING_STATS_COLUMNS, type ListingWithStats } from "@/types/listing";
import {
  AD_COLUMNS,
  type Ad,
  type PendingAd,
  type SponsoredItem,
} from "@/types/ad";

/*
 * Every loader returns empty rather than throwing: until migration 0026 has
 * run, or if the ads flag is off, Explore and the listing page render as they
 * did before.
 */

async function listingsById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, ListingWithStats>> {
  const map = new Map<string, ListingWithStats>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("listings_with_stats")
    .select(LISTING_STATS_COLUMNS)
    .in("id", ids);
  for (const l of (data ?? []) as unknown as ListingWithStats[]) {
    map.set(l.id, l);
  }
  return map;
}

/** Ads running now, for Explore — the viewer's city first, then country. */
export async function getSponsored(viewer: {
  city?: string | null;
  country?: string | null;
}): Promise<SponsoredItem[]> {
  if (!isEnabled("ads")) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("running_ads", { p_limit: 24 });
    if (error || !data) return [];
    const rows = data as {
      id: string;
      listing_id: string;
      headline: string;
      body: string | null;
    }[];
    const listings = await listingsById(supabase, [
      ...new Set(rows.map((r) => r.listing_id)),
    ]);
    const items = rows.flatMap((r) => {
      const listing = listings.get(r.listing_id);
      return listing
        ? [{ id: r.id, headline: r.headline, body: r.body, listing }]
        : [];
    });
    return nearestFirst(items, viewer);
  } catch {
    return [];
  }
}

/** The listing's most recent ad, for its owner (RLS returns only theirs). */
export async function getLatestAd(listingId: string): Promise<Ad | null> {
  if (!isEnabled("ads")) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ads")
      .select(AD_COLUMNS)
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Ad | null) ?? null;
  } catch {
    return null;
  }
}

/** Ads waiting for an administrator, oldest first. */
export async function getPendingAds(): Promise<PendingAd[]> {
  if (!isEnabled("ads")) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ads")
      .select(AD_COLUMNS)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error || !data) return [];
    const ads = data as Ad[];

    const listings = await listingsById(supabase, [
      ...new Set(ads.map((a) => a.listing_id)),
    ]);
    const owners = new Map<string, string | null>();
    const ownerIds = [...new Set(ads.map((a) => a.owner_id))];
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ownerIds);
      for (const p of profiles ?? []) {
        owners.set(
          String(p.user_id),
          (p.display_name as string | null) ?? null
        );
      }
    }

    return ads.flatMap((ad) => {
      const listing = listings.get(ad.listing_id);
      return listing
        ? [{ ad, listing, ownerName: owners.get(ad.owner_id) ?? null }]
        : [];
    });
  } catch {
    return [];
  }
}
