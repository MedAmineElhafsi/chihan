import "server-only";

import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getHiddenAuthorIds } from "./blocks";
import { helpKindsReady, voiceReady } from "./schema-ready";
import { signPaths } from "./signed-urls";
import { signVoiceNotes } from "./voice";
import { HELP_PHOTO_BUCKET } from "./constants";
import type { HelpAuthor, HelpOffer, HelpRequest } from "@/types/help";
import { VOICE_COLUMNS, voiceFromRow } from "@/types/voice";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BASE_COLUMNS =
  "id, author_id, title, body, category, urgency, city, country, status, created_at, resolved_at";

/** Added by migration 0030. */
const KIND_COLUMNS =
  "kind, photos, interpret_from, interpret_to, setting, meeting, needed_at";

/**
 * The select list for requests, growing with the migrations that have run:
 * a column that does not exist yet would fail the whole board.
 */
async function requestColumns(): Promise<string> {
  const [voice, kinds] = await Promise.all([voiceReady(), helpKindsReady()]);
  return [BASE_COLUMNS, voice && VOICE_COLUMNS, kinds && KIND_COLUMNS]
    .filter(Boolean)
    .join(", ");
}

async function loadAuthors(
  supabase: Supabase,
  userIds: string[]
): Promise<Map<string, HelpAuthor>> {
  const map = new Map<string, HelpAuthor>();
  if (!userIds.length) return map;
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

function fallbackAuthor(userId: string): HelpAuthor {
  return { userId, profileId: null, displayName: null, avatarUrl: null };
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Storage paths of a give's photos, as stored. */
function photoPaths(r: Record<string, unknown>): string[] {
  return Array.isArray(r.photos)
    ? (r.photos as unknown[]).filter((p): p is string => typeof p === "string")
    : [];
}

function toRequest(
  r: Record<string, unknown>,
  author: HelpAuthor,
  offerCount: number,
  photoUrls: string[]
): HelpRequest {
  return {
    id: String(r.id),
    author_id: String(r.author_id),
    title: String(r.title),
    body: str(r.body),
    category: String(r.category),
    urgency: String(r.urgency),
    city: str(r.city),
    country: str(r.country),
    status: String(r.status),
    created_at: String(r.created_at),
    resolved_at: str(r.resolved_at),
    offer_count: offerCount,
    author,
    voice: voiceFromRow(r),
    kind: r.kind === "give" ? "give" : "ask",
    photo_urls: photoUrls,
    interpret_from: str(r.interpret_from),
    interpret_to: str(r.interpret_to),
    setting: str(r.setting),
    meeting: str(r.meeting),
    needed_at: str(r.needed_at),
  };
}

export type HelpFilters = {
  category?: string;
  city?: string;
  status?: string;
  mine?: boolean;
  /** Within "Free things": only gives, or only asks. */
  kind?: "ask" | "give";
};

export async function getHelpRequests(
  filters: HelpFilters,
  viewerId?: string
): Promise<HelpRequest[]> {
  try {
    const supabase = await createClient();
    const columns = await requestColumns();
    let q = supabase
      .from("help_requests")
      .select(`${columns}, help_offers(count)`)
      .order("created_at", { ascending: false })
      .limit(120);

    if (filters.category) q = q.eq("category", filters.category);
    if (filters.city) q = q.ilike("city", `%${filters.city}%`);
    q = q.eq("status", filters.status || "open");
    if (filters.mine && viewerId) q = q.eq("author_id", viewerId);
    if (filters.kind && columns.includes("kind"))
      q = q.eq("kind", filters.kind);

    const { data, error } = await q;
    if (error || !data) return [];

    const rows = data as unknown as Array<Record<string, unknown>>;
    const authors = await loadAuthors(supabase, [
      ...new Set(rows.map((r) => String(r.author_id))),
    ]);

    // Respect blocks/mutes so nobody has to see someone they've blocked.
    const hidden = viewerId ? await getHiddenAuthorIds(viewerId) : new Set();
    const visible = rows.filter((r) => !hidden.has(String(r.author_id)));

    // A card shows a give's first photo; one request signs them all.
    const covers = await signPaths(
      supabase,
      HELP_PHOTO_BUCKET,
      visible.map((r) => photoPaths(r)[0]).filter(Boolean)
    );

    return visible.map((r) => {
      const offers = r.help_offers;
      const count = Array.isArray(offers)
        ? Number((offers[0] as { count?: number } | undefined)?.count ?? 0)
        : 0;
      const cover = covers.get(photoPaths(r)[0] ?? "");
      return toRequest(
        r,
        authors.get(String(r.author_id)) ?? fallbackAuthor(String(r.author_id)),
        count,
        cover ? [cover] : []
      );
    });
  } catch {
    return [];
  }
}

export async function getHelpRequest(id: string): Promise<HelpRequest | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("help_requests")
      .select(await requestColumns())
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const r = data as unknown as Record<string, unknown>;
    const paths = photoPaths(r);
    const [authors, urls] = await Promise.all([
      loadAuthors(supabase, [String(r.author_id)]),
      signPaths(supabase, HELP_PHOTO_BUCKET, paths),
    ]);
    const request = toRequest(
      r,
      authors.get(String(r.author_id)) ?? fallbackAuthor(String(r.author_id)),
      0,
      paths.map((p) => urls.get(p)).filter((u): u is string => Boolean(u))
    );
    await signVoiceNotes(supabase, [request.voice]);
    return request;
  } catch {
    return null;
  }
}

export async function getHelpOffers(requestId: string): Promise<HelpOffer[]> {
  try {
    const supabase = await createClient();
    const withVoice = await voiceReady();
    const { data } = await supabase
      .from("help_offers")
      .select(
        `id, request_id, author_id, body, created_at${withVoice ? `, ${VOICE_COLUMNS}` : ""}`
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const authors = await loadAuthors(supabase, [
      ...new Set(rows.map((r) => String(r.author_id))),
    ]);
    const offers = rows.map((r) => ({
      id: String(r.id),
      request_id: String(r.request_id),
      author_id: String(r.author_id),
      body: String(r.body ?? ""),
      created_at: String(r.created_at),
      author:
        authors.get(String(r.author_id)) ?? fallbackAuthor(String(r.author_id)),
      voice: voiceFromRow(r),
    }));
    await signVoiceNotes(
      supabase,
      offers.map((o) => o.voice)
    );
    return offers;
  } catch {
    return [];
  }
}

/**
 * How many open requests exist, as a number and nothing else.
 *
 * Reading a request is restricted to members on purpose — asking for help
 * reveals that you need it. But telling a signed-out visitor "no requests
 * here yet" when seven people are waiting is a lie that costs us the visitor
 * and the askers at once.
 *
 * This uses the service client deliberately: it must see past the policy to
 * count, and it returns only the count, so nothing a member wrote can leak.
 */
export async function countOpenHelpRequests(
  city?: string | null
): Promise<number> {
  try {
    const supabase = createServiceClient();
    let q = supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    if (city) q = q.ilike("city", city);
    const { count, error } = await q;
    if (error) {
      console.error("[help] count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[help] count threw:", err);
    return 0;
  }
}
