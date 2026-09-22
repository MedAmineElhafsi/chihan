import "server-only";

import { createClient } from "./supabase/server";
import { isEnabled } from "./features";
import { classifiedsReady } from "./schema-ready";
import { signPaths } from "./signed-urls";
import { getHiddenAuthorIds } from "./blocks";
import {
  BOARD_PHOTO_BUCKET,
  CLASSIFIED_COLUMNS,
  photoPathsOf,
  toClassified,
  type Classified,
  type ClassifiedKind,
} from "@/types/classified";

/** The board is switched on and migration 0034 has run. */
export async function classifiedsEnabled(): Promise<boolean> {
  return isEnabled("jobsHousing") && (await classifiedsReady());
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadAuthors(supabase: Supabase, ids: string[]) {
  const map = new Map<string, NonNullable<Classified["author"]>>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, display_name, avatar_url, is_verified, created_at")
    .in("user_id", ids);
  for (const p of (data ?? []) as Array<Record<string, unknown>>) {
    map.set(String(p.user_id), {
      userId: String(p.user_id),
      profileId: String(p.id),
      displayName: (p.display_name as string | null) ?? null,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      verified: p.is_verified === true,
      memberSince: (p.created_at as string | null) ?? null,
    });
  }
  return map;
}

async function decorate(
  supabase: Supabase,
  rows: Array<Record<string, unknown>>,
  coverOnly: boolean
): Promise<Classified[]> {
  const authors = await loadAuthors(supabase, [
    ...new Set(rows.map((r) => String(r.author_id))),
  ]);
  const paths = rows.flatMap((r) => {
    const all = photoPathsOf(r);
    return coverOnly ? all.slice(0, 1) : all;
  });
  const urls = await signPaths(supabase, BOARD_PHOTO_BUCKET, paths);
  return rows.map((r) =>
    toClassified(
      r,
      photoPathsOf(r)
        .slice(0, coverOnly ? 1 : undefined)
        .map((p) => urls.get(p))
        .filter((u): u is string => Boolean(u)),
      authors.get(String(r.author_id)) ?? null
    )
  );
}

export type ClassifiedFilters = {
  city?: string;
  type?: string;
  mine?: boolean;
};

export async function getClassifieds(
  kind: ClassifiedKind,
  filters: ClassifiedFilters,
  viewerId: string
): Promise<Classified[]> {
  if (!(await classifiedsEnabled())) return [];
  try {
    const supabase = await createClient();
    let q = supabase
      .from("classifieds")
      .select(CLASSIFIED_COLUMNS)
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(120);
    if (filters.mine) q = q.eq("author_id", viewerId);
    else q = q.eq("status", "open").gt("expires_at", new Date().toISOString());
    if (filters.city) q = q.ilike("city", `%${filters.city}%`);
    if (filters.type) {
      q = q.eq(kind === "housing" ? "housing_type" : "job_type", filters.type);
    }
    const { data, error } = await q;
    if (error || !data) return [];
    const hidden = await getHiddenAuthorIds(viewerId);
    const rows = (data as unknown as Array<Record<string, unknown>>).filter(
      (r) => !hidden.has(String(r.author_id))
    );
    return decorate(supabase, rows, true);
  } catch {
    return [];
  }
}

export async function getClassified(id: string): Promise<Classified | null> {
  if (!(await classifiedsEnabled())) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("classifieds")
      .select(CLASSIFIED_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const [one] = await decorate(
      supabase,
      [data as unknown as Record<string, unknown>],
      false
    );
    return one ?? null;
  } catch {
    return null;
  }
}

/** Posts held for review, with how many members reported them. */
export async function getHeldClassifieds(): Promise<
  Array<Classified & { reports: number }>
> {
  if (!(await classifiedsReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("classifieds")
      .select(CLASSIFIED_COLUMNS)
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    if (rows.length === 0) return [];
    const posts = await decorate(supabase, rows, true);
    // Administrators may read reports; count the distinct people behind them.
    const { data: reports } = await supabase
      .from("reports")
      .select("target_id, reporter_id")
      .eq("target_type", "classified")
      .in(
        "target_id",
        posts.map((p) => p.id)
      );
    const byPost = new Map<string, Set<string>>();
    for (const r of (reports ?? []) as Array<Record<string, unknown>>) {
      const id = String(r.target_id);
      byPost.set(id, (byPost.get(id) ?? new Set()).add(String(r.reporter_id)));
    }
    return posts.map((p) => ({ ...p, reports: byPost.get(p.id)?.size ?? 0 }));
  } catch {
    return [];
  }
}
