import "server-only";

import { createClient } from "./supabase/server";
import { mapPostRows } from "./feed";
import type { FeedItem } from "@/types/post";

export async function getGroupPosts(
  groupId: string,
  viewerId?: string | null
): Promise<FeedItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, author_id, type, body, media, event_title, event_at, event_location, event_lat, event_lng, created_at, post_likes(count), post_comments(count)"
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error || !data) return [];
    return mapPostRows(
      supabase,
      data as Array<Record<string, unknown>>,
      viewerId
    );
  } catch {
    return [];
  }
}
