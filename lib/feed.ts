import "server-only";

import { createClient } from "./supabase/server";
import type { FeedAuthor, FeedItem, PostComment } from "@/types/post";

async function loadAuthors(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

export async function getFeed(opts: {
  isPremium: boolean;
  horizonDays: number;
  viewerId?: string;
}): Promise<FeedItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts_with_counts")
      .select(
        "id, author_id, type, body, media, event_title, event_at, event_location, created_at, like_count, comment_count"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data) return [];

    let rows = data as unknown as Array<Omit<FeedItem, "liked" | "author">>;

    // Free users: hide events more than `horizonDays` in the future.
    if (!opts.isPremium) {
      const horizon = Date.now() + opts.horizonDays * 24 * 60 * 60 * 1000;
      rows = rows.filter(
        (r) =>
          r.type !== "event" ||
          !r.event_at ||
          new Date(r.event_at).getTime() <= horizon
      );
    }

    const authorIds = [...new Set(rows.map((r) => r.author_id))];
    const authors = await loadAuthors(supabase, authorIds);

    const likedSet = new Set<string>();
    if (opts.viewerId && rows.length) {
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", opts.viewerId)
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
