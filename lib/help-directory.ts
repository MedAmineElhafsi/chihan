import "server-only";

import { createPublicClient } from "./supabase/public";
import type { ListingWithStats } from "@/types/listing";
import { LISTING_STATS_COLUMNS } from "@/types/listing";

/**
 * The directory is the help board's memory: questions people ask repeatedly
 * ("a dentist who speaks Kurdish") should resolve into a permanent listing.
 * These are the categories where a business is a real answer to a request.
 */
const CATEGORY_BRIDGE: Record<string, string[]> = {
  health: ["doctor"],
  legal: ["lawyer"],
  paperwork: ["lawyer", "community"],
  work: ["community"],
  language: ["community"],
  education: ["community"],
  family: ["community"],
  housing: ["community"],
  transport: ["other"],
};

/** Listings that could answer a help request, nearest city first. */
export async function getSuggestedListings(
  helpCategory: string,
  city: string | null,
  limit = 3
): Promise<ListingWithStats[]> {
  const categories = CATEGORY_BRIDGE[helpCategory];
  if (!categories?.length) return [];

  try {
    const supabase = createPublicClient();
    let q = supabase
      .from("listings_with_stats")
      .select(LISTING_STATS_COLUMNS)
      .in("category", categories)
      .limit(limit);
    if (city) q = q.ilike("city", `%${city}%`);

    const { data, error } = await q;
    if (error || !data?.length) {
      // Nothing in that city — fall back to the same categories anywhere.
      if (!city) return [];
      const { data: anywhere } = await supabase
        .from("listings_with_stats")
        .select(LISTING_STATS_COLUMNS)
        .in("category", categories)
        .limit(limit);
      return (anywhere ?? []) as unknown as ListingWithStats[];
    }
    return data as unknown as ListingWithStats[];
  } catch {
    return [];
  }
}
