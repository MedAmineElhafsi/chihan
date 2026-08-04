import "server-only";

import { createClient } from "./supabase/server";
import { getHiddenAuthorIds } from "./blocks";
import type { AuthorStories, Story, StoryAuthor } from "@/types/story";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadAuthors(
  supabase: Supabase,
  userIds: string[]
): Promise<Map<string, StoryAuthor>> {
  const map = new Map<string, StoryAuthor>();
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

/** Active (unexpired) stories grouped by author. Hides blocked/muted authors. */
export async function getActiveStories(
  viewerId?: string | null
): Promise<AuthorStories[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("stories")
      .select("id, author_id, media_url, caption, created_at, expires_at")
      .gt("expires_at", now)
      .order("created_at", { ascending: true });
    if (error || !data) return [];

    const hidden = viewerId
      ? await getHiddenAuthorIds(viewerId)
      : new Set<string>();

    const rows = (data as Array<Record<string, unknown>>).filter(
      (r) => !hidden.has(String(r.author_id))
    );
    if (rows.length === 0) return [];

    const authorIds = [...new Set(rows.map((r) => String(r.author_id)))];
    const authors = await loadAuthors(supabase, authorIds);

    const byAuthor = new Map<string, Story[]>();
    for (const r of rows) {
      const authorId = String(r.author_id);
      const author = authors.get(authorId) ?? {
        userId: authorId,
        profileId: null,
        displayName: null,
        avatarUrl: null,
      };
      const story: Story = {
        id: String(r.id),
        author_id: authorId,
        media_url: String(r.media_url),
        caption: (r.caption as string | null) ?? null,
        created_at: String(r.created_at),
        expires_at: String(r.expires_at),
        author,
      };
      const list = byAuthor.get(authorId) ?? [];
      list.push(story);
      byAuthor.set(authorId, list);
    }

    const groups: AuthorStories[] = [];
    for (const [authorId, stories] of byAuthor) {
      const author = authors.get(authorId) ?? {
        userId: authorId,
        profileId: null,
        displayName: null,
        avatarUrl: null,
      };
      groups.push({ author, stories });
    }

    // Most recently updated author first.
    groups.sort((a, b) => {
      const aLatest = a.stories[a.stories.length - 1]?.created_at ?? "";
      const bLatest = b.stories[b.stories.length - 1]?.created_at ?? "";
      return bLatest.localeCompare(aLatest);
    });

    return groups;
  } catch {
    return [];
  }
}
