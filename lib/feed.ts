import "server-only";

import { createClient } from "./supabase/server";
import type { FeedAuthor, FeedItem, PostComment } from "@/types/post";

type Supabase = Awaited<ReturnType<typeof createClient>>;

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

const POST_SELECT =
  "id, author_id, type, body, media, event_title, event_at, event_location, created_at, post_likes(count), post_comments(count)";

async function mapPostRows(
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
    created_at: String(r.created_at),
    like_count: countFromEmbed(r.post_likes),
    comment_count: countFromEmbed(r.post_comments),
  }));

  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const authors = await loadAuthors(supabase, authorIds);

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
  }));
}

export async function getFeed(opts: {
  isPremium: boolean;
  horizonDays: number;
  viewerId?: string;
}): Promise<FeedItem[]> {
  try {
    const supabase = await createClient();
    // Query `posts` directly (not posts_with_counts) so we can filter group_id
    // without rewriting the old view (which deadlocks under load).
    let { data, error } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .is("group_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

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
