import "server-only";

import { createClient } from "./supabase/server";
import { createPublicClient } from "./supabase/public";
import { isEnabled } from "./features";
import { guidesReady } from "./schema-ready";
import {
  GUIDE_COLUMNS,
  toGuide,
  type Guide,
  type GuideLocale,
  type GuideSuggestion,
  type GuideTopic,
} from "@/types/guide";

/** Guides are switched on and migration 0032 has run. */
export async function guidesEnabled(): Promise<boolean> {
  return isEnabled("guides") && (await guidesReady());
}

/**
 * Which version of a guide a reader gets: their own language, then English,
 * then German (the language of every office they will visit), then any.
 */
function pick(versions: Guide[], locale: string): Guide {
  const order = [locale, "en", "de"];
  for (const l of order) {
    const hit = versions.find((v) => v.locale === l);
    if (hit) return hit;
  }
  return versions[0];
}

function group(rows: Guide[], locale: string): Guide[] {
  const bySlug = new Map<string, Guide[]>();
  for (const g of rows) {
    const list = bySlug.get(g.slug) ?? [];
    list.push(g);
    bySlug.set(g.slug, list);
  }
  return [...bySlug.values()].map((versions) => ({
    ...pick(versions, locale),
    languages: versions.map((v) => v.locale),
  }));
}

const same = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").trim().toLocaleLowerCase() === (b ?? "").trim().toLocaleLowerCase();

export type GuidePlace = { city: string | null; country: string };

/**
 * Published guides for a place — the city's own first, then those that hold
 * for the whole country — one per guide, in the reader's language where it
 * exists.
 */
export async function getGuides(
  place: GuidePlace,
  locale: string,
  topics?: GuideTopic[]
): Promise<{ city: Guide[]; country: Guide[] }> {
  if (!(await guidesEnabled())) return { city: [], country: [] };
  try {
    let q = createPublicClient()
      .from("guides")
      .select(GUIDE_COLUMNS)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (topics?.length) q = q.in("topic", topics);
    const { data, error } = await q;
    if (error || !data) return { city: [], country: [] };
    const all = group(
      (data as unknown as Array<Record<string, unknown>>).map((r) =>
        toGuide(r)
      ),
      locale
    );
    return {
      city: place.city
        ? all.filter((g) => g.city && same(g.city, place.city))
        : [],
      country: all.filter((g) => !g.city && same(g.country, place.country)),
    };
  } catch {
    return { city: [], country: [] };
  }
}

/**
 * One guide by its address, in the reader's language where it exists.
 * Administrators also see drafts, so they can preview before publishing.
 */
export async function getGuide(
  slug: string,
  locale: string,
  opts: { includeDrafts?: boolean } = {}
): Promise<Guide | null> {
  if (!(await guidesEnabled())) return null;
  try {
    const supabase = opts.includeDrafts
      ? await createClient()
      : createPublicClient();
    let q = supabase.from("guides").select(GUIDE_COLUMNS).eq("slug", slug);
    if (!opts.includeDrafts) q = q.eq("status", "published");
    const { data } = await q;
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    if (rows.length === 0) return null;
    const versions = rows.map((r) => toGuide(r));
    const published = versions
      .filter((v) => v.status === "published")
      .map((v) => v.locale);
    return {
      ...pick(versions, locale),
      languages: (published.length
        ? published
        : versions.map((v) => v.locale)) as GuideLocale[],
    };
  } catch {
    return null;
  }
}

/** What help categories a guide topic answers, for the request page. */
const TOPICS_FOR_HELP: Record<string, GuideTopic[]> = {
  paperwork: ["registration", "residence", "money"],
  housing: ["housing", "registration"],
  health: ["health_insurance"],
  education: ["schools", "language"],
  language: ["language"],
  work: ["work"],
  legal: ["residence"],
  family: ["family", "schools"],
};

/** Up to two guides that might already answer a request. */
export async function getGuidesForHelp(
  category: string,
  place: GuidePlace,
  locale: string
): Promise<Guide[]> {
  const topics = TOPICS_FOR_HELP[category];
  if (!topics) return [];
  const { city, country } = await getGuides(place, locale, topics);
  return [...city, ...country].slice(0, 2);
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

/** Every guide in every language, drafts included (administrators only). */
export async function getAllGuides(): Promise<Guide[]> {
  if (!(await guidesReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("guides")
      .select(GUIDE_COLUMNS)
      .order("slug")
      .order("locale");
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
      (r) => toGuide(r)
    );
  } catch {
    return [];
  }
}

export async function getGuideById(id: string): Promise<Guide | null> {
  if (!(await guidesReady())) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("guides")
      .select(GUIDE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    return data ? toGuide(data as unknown as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Suggestions waiting for an administrator, newest first. */
export async function getOpenSuggestions(): Promise<GuideSuggestion[]> {
  if (!(await guidesReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("guide_suggestions")
      .select(
        "id, suggested_by, request_id, city, title, note, status, created_at"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const ids = [...new Set(rows.map((r) => String(r.suggested_by)))];
    const names = new Map<string, string | null>();
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      for (const p of profiles ?? []) {
        names.set(String(p.user_id), (p.display_name as string | null) ?? null);
      }
    }
    return rows.map((r) => ({
      id: String(r.id),
      suggested_by: String(r.suggested_by),
      suggester_name: names.get(String(r.suggested_by)) ?? null,
      request_id: (r.request_id as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      title: String(r.title),
      note: (r.note as string | null) ?? null,
      status: r.status as GuideSuggestion["status"],
      created_at: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

/** Whether this member already suggested a guide from this request. */
export async function hasSuggestedFromRequest(
  requestId: string,
  userId: string
): Promise<boolean> {
  if (!(await guidesReady())) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("guide_suggestions")
      .select("id")
      .eq("request_id", requestId)
      .eq("suggested_by", userId)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
