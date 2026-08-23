import "server-only";

import { createClient } from "./supabase/server";
import {
  LISTING_STATS_COLUMNS,
  type ListingWithStats,
  type Review,
} from "@/types/listing";

export async function getListings(
  opts: { category?: string; country?: string; q?: string } = {}
): Promise<ListingWithStats[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("listings_with_stats")
      .select(LISTING_STATS_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);
    if (opts.category) query = query.eq("category", opts.category);
    if (opts.country) query = query.eq("country", opts.country);
    if (opts.q) query = query.ilike("name", `%${opts.q}%`);
    const { data, error } = await query;
    if (error || !data) return [];
    return data as unknown as ListingWithStats[];
  } catch {
    return [];
  }
}

export async function getListingById(
  id: string
): Promise<ListingWithStats | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("listings_with_stats")
      .select(LISTING_STATS_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    return (data as unknown as ListingWithStats | null) ?? null;
  } catch {
    return null;
  }
}

export async function getReviews(listingId: string): Promise<Review[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, listing_id, author_id, rating, body, created_at, reply, replied_at")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];

    const rows = data as Array<Record<string, unknown>>;
    const authorIds = [...new Set(rows.map((r) => String(r.author_id)))];

    // Author names come from public profiles only (RLS); private reviewers stay
    // anonymous.
    const names: Record<string, string> = {};
    const avatars: Record<string, string> = {};
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", authorIds);
      for (const p of (profs ?? []) as Array<Record<string, unknown>>) {
        if (p.display_name) names[String(p.user_id)] = String(p.display_name);
        if (p.avatar_url) avatars[String(p.user_id)] = String(p.avatar_url);
      }
    }

    return rows.map((r) => ({
      id: String(r.id),
      listing_id: String(r.listing_id),
      author_id: String(r.author_id),
      rating: Number(r.rating),
      body: (r.body as string | null) ?? null,
      created_at: String(r.created_at),
      author_name: names[String(r.author_id)] ?? null,
      author_avatar: avatars[String(r.author_id)] ?? null,
      reply: (r.reply as string | null) ?? null,
      replied_at: (r.replied_at as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}
