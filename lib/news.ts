import "server-only";

import { createClient } from "./supabase/server";
import type { NewsArticle } from "@/types/news";

/** All news articles, newest first (filtering by country happens in the page). */
export async function getNews(): Promise<NewsArticle[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("news_articles")
      .select(
        "id, title, summary, source, url, image_url, country, category, published_at"
      )
      .order("published_at", { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data as unknown as NewsArticle[];
  } catch {
    return [];
  }
}
