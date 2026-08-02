import "server-only";

import { createClient } from "./supabase/server";

export type SearchHit = {
  kind: "person" | "listing" | "group" | "post" | "news";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

function sanitize(q: string) {
  return q.replace(/[%_,]/g, " ").trim().slice(0, 80);
}

export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = sanitize(query);
  if (q.length < 2) return [];
  const pattern = `%${q}%`;

  try {
    const supabase = await createClient();
    const [people, listings, groups, posts, news] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, city, country")
        .eq("is_public", true)
        .or(
          `display_name.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern},bio.ilike.${pattern}`
        )
        .limit(8),
      supabase
        .from("listings")
        .select("id, name, city, country, category")
        .or(
          `name.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern},description.ilike.${pattern}`
        )
        .limit(8),
      supabase
        .from("community_groups")
        .select("id, name, city, country")
        .or(
          `name.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern},description.ilike.${pattern}`
        )
        .limit(8),
      supabase
        .from("posts")
        .select("id, body, event_title, type")
        .is("group_id", null)
        .or(`body.ilike.${pattern},event_title.ilike.${pattern}`)
        .limit(6),
      supabase
        .from("news_articles")
        .select("id, title, source")
        .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
        .limit(6),
    ]);

    const hits: SearchHit[] = [];

    for (const p of people.data ?? []) {
      hits.push({
        kind: "person",
        id: String(p.id),
        title: String(p.display_name ?? "Member"),
        subtitle: [p.city, p.country].filter(Boolean).join(", ") || null,
        href: `/u/${p.id}`,
      });
    }
    for (const l of listings.data ?? []) {
      hits.push({
        kind: "listing",
        id: String(l.id),
        title: String(l.name),
        subtitle:
          [l.category, l.city, l.country].filter(Boolean).join(" · ") || null,
        href: `/directory/${l.id}`,
      });
    }
    for (const g of groups.data ?? []) {
      hits.push({
        kind: "group",
        id: String(g.id),
        title: String(g.name),
        subtitle: [g.city, g.country].filter(Boolean).join(", ") || null,
        href: `/groups/${g.id}`,
      });
    }
    for (const post of posts.data ?? []) {
      const title =
        post.type === "event" && post.event_title
          ? String(post.event_title)
          : String(post.body ?? "").slice(0, 80) || "Post";
      hits.push({
        kind: "post",
        id: String(post.id),
        title,
        subtitle: post.type === "event" ? "Event" : "Post",
        href: "/feed",
      });
    }
    for (const n of news.data ?? []) {
      hits.push({
        kind: "news",
        id: String(n.id),
        title: String(n.title),
        subtitle: (n.source as string | null) ?? null,
        href: "/news",
      });
    }

    return hits;
  } catch {
    return [];
  }
}
