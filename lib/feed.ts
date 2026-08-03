import "server-only";

import { createClient } from "./supabase/server";
import { getHiddenAuthorIds } from "./blocks";
import type {
  FeedAuthor,
  FeedItem,
  PostComment,
  RsvpStatus,
} from "@/types/post";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const NEAR_KM_DEFAULT = 80;

async function loadAuthors(
  supabase: Supabase,
  userIds: string[]
): Promise<Map<string, FeedAuthor>> {
  const map = new Map<string, FeedAuthor>();
  if (userIds.length === 0) return map;
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

function countFromEmbed(value: unknown): number {
  if (Array.isArray(value) && value[0] && typeof value[0] === "object") {
    const n = (value[0] as { count?: number }).count;
    return typeof n === "number" ? n : 0;
  }
  if (value && typeof value === "object" && "count" in value) {
    const n = (value as { count?: number }).count;
    return typeof n === "number" ? n : 0;
  }
  return 0;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POST_SELECT =
  "id, author_id, type, body, media, event_title, event_at, event_location, event_lat, event_lng, created_at, post_likes(count), post_comments(count)";

async function loadRsvps(
  supabase: Supabase,
  postIds: string[],
  viewerId?: string | null
): Promise<{
  going: Map<string, number>;
  interested: Map<string, number>;
  mine: Map<string, RsvpStatus>;
}> {
  const going = new Map<string, number>();
  const interested = new Map<string, number>();
  const mine = new Map<string, RsvpStatus>();
  if (postIds.length === 0) return { going, interested, mine };

  try {
    const { data } = await supabase
      .from("event_rsvps")
      .select("post_id, user_id, status")
      .in("post_id", postIds);
    for (const row of (data ?? []) as Array<{
      post_id: string;
      user_id: string;
      status: string;
    }>) {
      const pid = String(row.post_id);
      if (row.status === "going") going.set(pid, (going.get(pid) ?? 0) + 1);
      if (row.status === "interested")
        interested.set(pid, (interested.get(pid) ?? 0) + 1);
      if (viewerId && String(row.user_id) === viewerId) {
        mine.set(pid, row.status as RsvpStatus);
      }
    }
  } catch {
    // table missing pre-migration
  }
  return { going, interested, mine };
}

export async function mapPostRows(
  supabase: Supabase,
  data: Array<Record<string, unknown>>,
  viewerId?: string | null
): Promise<FeedItem[]> {
  const rows = data.map((r) => ({
    id: String(r.id),
    author_id: String(r.author_id),
    type: r.type as FeedItem["type"],
    body: (r.body as string | null) ?? null,
    media: (r.media as string[] | null) ?? [],
    event_title: (r.event_title as string | null) ?? null,
    event_at: (r.event_at as string | null) ?? null,
    event_location: (r.event_location as string | null) ?? null,
    event_lat: r.event_lat != null ? Number(r.event_lat) : null,
    event_lng: r.event_lng != null ? Number(r.event_lng) : null,
    created_at: String(r.created_at),
    like_count: countFromEmbed(r.post_likes),
    comment_count: countFromEmbed(r.post_comments),
  }));

  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const authors = await loadAuthors(supabase, authorIds);
  const rsvps = await loadRsvps(
    supabase,
    rows.filter((r) => r.type === "event").map((r) => r.id),
    viewerId
  );

  const likedSet = new Set<string>();
  if (viewerId && rows.length) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", viewerId)
      .in(
        "post_id",
        rows.map((r) => r.id)
      );
    for (const l of (likes ?? []) as Array<{ post_id: string }>) {
      likedSet.add(l.post_id);
    }
  }

  return rows.map((r) => ({
    ...r,
    liked: likedSet.has(r.id),
    author:
      authors.get(r.author_id) ?? {
        userId: r.author_id,
        profileId: null,
        displayName: null,
        avatarUrl: null,
      },
    rsvp_going: rsvps.going.get(r.id) ?? 0,
    rsvp_interested: rsvps.interested.get(r.id) ?? 0,
    my_rsvp: rsvps.mine.get(r.id) ?? null,
  }));
}

export async function getFeed(opts: {
  isPremium: boolean;
  horizonDays: number;
  viewerId?: string;
  /** When set, keep only events within this radius (km). Posts stay. */
  nearLat?: number | null;
  nearLng?: number | null;
  nearKm?: number;
  eventsOnly?: boolean;
}): Promise<FeedItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("posts")
      .select(POST_SELECT)
      .is("group_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (opts.eventsOnly) query = query.eq("type", "event");

    let { data, error } = await query;

    if (error) {
      const retry = await supabase
        .from("posts")
        .select(POST_SELECT)
        .order("created_at", { ascending: false })
        .limit(100);
      data = retry.data;
      error = retry.error;
    }
    if (error || !data) return [];

    let items = await mapPostRows(
      supabase,
      data as Array<Record<string, unknown>>,
      opts.viewerId
    );

    if (!opts.isPremium) {
      const horizon = Date.now() + opts.horizonDays * 24 * 60 * 60 * 1000;
      items = items.filter(
        (r) =>
          r.type !== "event" ||
          !r.event_at ||
          new Date(r.event_at).getTime() <= horizon
      );
    }

    if (
      opts.nearLat != null &&
      opts.nearLng != null &&
      Number.isFinite(opts.nearLat) &&
      Number.isFinite(opts.nearLng)
    ) {
      const maxKm = opts.nearKm ?? NEAR_KM_DEFAULT;
      items = items
        .filter((r) => r.type === "event")
        .map((r) => {
          if (r.event_lat == null || r.event_lng == null) {
            return { ...r, distance_km: null as number | null };
          }
          return {
            ...r,
            distance_km: haversineKm(
              opts.nearLat!,
              opts.nearLng!,
              r.event_lat,
              r.event_lng
            ),
          };
        })
        .filter((r) => r.distance_km != null && r.distance_km <= maxKm)
        .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    }

    if (opts.viewerId) {
      const hidden = await getHiddenAuthorIds(opts.viewerId);
      if (hidden.size > 0) {
        items = items.filter((r) => !hidden.has(r.author_id));
      }
    }

    return items;
  } catch {
    return [];
  }
}

export async function getComments(postId: string): Promise<PostComment[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("post_comments")
      .select("id, post_id, author_id, body, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const authorIds = [...new Set(rows.map((r) => String(r.author_id)))];
    const authors = await loadAuthors(supabase, authorIds);
    return rows.map((r) => ({
      id: String(r.id),
      post_id: String(r.post_id),
      author_id: String(r.author_id),
      body: String(r.body),
      created_at: String(r.created_at),
      author_name: authors.get(String(r.author_id))?.displayName ?? null,
    }));
  } catch {
    return [];
  }
}
