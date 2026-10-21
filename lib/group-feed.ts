import "server-only";

import { createClient } from "./supabase/server";
import { getHiddenAuthorIds } from "./blocks";
import { mapPostRows } from "./feed";
import type { FeedItem } from "@/types/post";

/**
 * The group's board. Same rule as the group's chat and as the main feed:
 * somebody this member has blocked, or who has blocked them, or whom they
 * have muted, does not appear.
 */
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
    let rows = data as Array<Record<string, unknown>>;
    if (viewerId) {
      const hidden = await getHiddenAuthorIds(viewerId);
      if (hidden.size > 0) {
        rows = rows.filter((r) => !hidden.has(String(r.author_id)));
      }
    }
    return mapPostRows(supabase, rows, viewerId);
  } catch {
    return [];
  }
}
