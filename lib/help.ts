import "server-only";

import { createClient } from "./supabase/server";
import { getHiddenAuthorIds } from "./blocks";
import type { HelpAuthor, HelpOffer, HelpRequest } from "@/types/help";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadAuthors(
  supabase: Supabase,
  userIds: string[]
): Promise<Map<string, HelpAuthor>> {
  const map = new Map<string, HelpAuthor>();
  if (!userIds.length) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, display_name, avatar_url")
    .in("user_id", userIds);
  for (const p of (data ?? []) as Array<Record<string, unknown>>) {
    map.set(String(p.user_id), {
      userId: String(p.user_id),
      profileId: String(p.id),
      displayName: (p.display_name as string | null) ?? null,
      avatarUrl: (p.avatar_url as string | null) ?? null,
    });
  }
  return map;
}

function fallbackAuthor(userId: string): HelpAuthor {
  return { userId, profileId: null, displayName: null, avatarUrl: null };
}

export type HelpFilters = {
  category?: string;
  city?: string;
  status?: string;
  mine?: boolean;
};

export async function getHelpRequests(
  filters: HelpFilters,
  viewerId?: string
): Promise<HelpRequest[]> {
  try {
    const supabase = await createClient();
    let q = supabase
      .from("help_requests")
      .select(
        "id, author_id, title, body, category, urgency, city, country, status, created_at, resolved_at, help_offers(count)"
      )
      .order("created_at", { ascending: false })
      .limit(120);

    if (filters.category) q = q.eq("category", filters.category);
    if (filters.city) q = q.ilike("city", `%${filters.city}%`);
    q = q.eq("status", filters.status || "open");
    if (filters.mine && viewerId) q = q.eq("author_id", viewerId);

    const { data, error } = await q;
    if (error || !data) return [];

    const rows = data as unknown as Array<Record<string, unknown>>;
    const authors = await loadAuthors(
      supabase,
      [...new Set(rows.map((r) => String(r.author_id)))]
    );

    // Respect blocks/mutes so nobody has to see someone they've blocked.
    const hidden = viewerId ? await getHiddenAuthorIds(viewerId) : new Set();

    return rows
      .filter((r) => !hidden.has(String(r.author_id)))
      .map((r) => {
        const offers = r.help_offers;
        const count = Array.isArray(offers)
          ? Number((offers[0] as { count?: number } | undefined)?.count ?? 0)
          : 0;
        return {
          id: String(r.id),
          author_id: String(r.author_id),
          title: String(r.title),
          body: (r.body as string | null) ?? null,
          category: String(r.category),
          urgency: String(r.urgency),
          city: (r.city as string | null) ?? null,
          country: (r.country as string | null) ?? null,
          status: String(r.status),
          created_at: String(r.created_at),
          resolved_at: (r.resolved_at as string | null) ?? null,
          offer_count: count,
          author:
            authors.get(String(r.author_id)) ??
            fallbackAuthor(String(r.author_id)),
        };
      });
  } catch {
    return [];
  }
}

export async function getHelpRequest(id: string): Promise<HelpRequest | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("help_requests")
      .select(
        "id, author_id, title, body, category, urgency, city, country, status, created_at, resolved_at"
      )
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const r = data as Record<string, unknown>;
    const authors = await loadAuthors(supabase, [String(r.author_id)]);
    return {
      id: String(r.id),
      author_id: String(r.author_id),
      title: String(r.title),
      body: (r.body as string | null) ?? null,
      category: String(r.category),
      urgency: String(r.urgency),
      city: (r.city as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      status: String(r.status),
      created_at: String(r.created_at),
      resolved_at: (r.resolved_at as string | null) ?? null,
      offer_count: 0,
      author:
        authors.get(String(r.author_id)) ?? fallbackAuthor(String(r.author_id)),
    };
  } catch {
    return null;
  }
}

export async function getHelpOffers(requestId: string): Promise<HelpOffer[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("help_offers")
      .select("id, request_id, author_id, body, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const authors = await loadAuthors(
      supabase,
      [...new Set(rows.map((r) => String(r.author_id)))]
    );
    return rows.map((r) => ({
      id: String(r.id),
      request_id: String(r.request_id),
      author_id: String(r.author_id),
      body: String(r.body),
      created_at: String(r.created_at),
      author:
        authors.get(String(r.author_id)) ?? fallbackAuthor(String(r.author_id)),
    }));
  } catch {
    return [];
  }
}
