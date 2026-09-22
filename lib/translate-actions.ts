"use server";

import { createHash } from "node:crypto";

import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { googleTranslate, translationAvailable } from "./translate";

export type TranslateKind = "post" | "help_request" | "help_offer" | "guide";

export type TranslateResult =
  | {
      ok: true;
      fields: Record<string, string>;
      /** The language the text was in, as the service recognised it. */
      detected: string | null;
    }
  | {
      ok: false;
      error: "unavailable" | "signin" | "notfound" | "limit" | "failed";
    };

const TARGETS = ["en", "de", "ku", "ckb", "ar"];

/**
 * Each translation that is not already stored costs money. Sixty an hour is
 * far more than a person reads, and far less than a script would spend.
 */
const HOURLY_LIMIT = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What each kind of text is made of, as columns. */
const FIELDS: Record<TranslateKind, { table: string; columns: string[] }> = {
  post: { table: "posts", columns: ["event_title", "body"] },
  help_request: { table: "help_requests", columns: ["title", "body"] },
  help_offer: { table: "help_offers", columns: ["body"] },
  guide: { table: "guides", columns: ["title", "summary", "steps"] },
};

/**
 * The texts to translate, by name. A guide’s steps are a list, so each
 * step’s title and body become fields of their own (step_0_title, …).
 */
function textsOf(row: Record<string, unknown>, columns: string[]) {
  const out: Record<string, string> = {};
  for (const c of columns) {
    const v = row[c];
    if (typeof v === "string" && v.trim()) out[c] = v;
    if (c === "steps" && Array.isArray(v)) {
      v.forEach((step, i) => {
        const s = step as { title?: unknown; body?: unknown };
        if (typeof s.title === "string" && s.title.trim()) {
          out[`step_${i}_title`] = s.title;
        }
        if (typeof s.body === "string" && s.body.trim()) {
          out[`step_${i}_body`] = s.body;
        }
      });
    }
  }
  return out;
}

/**
 * Translates a post, a request or a reply into the reader's language.
 *
 * The client names what to translate, never the text itself: the server
 * reads the original with the reader's own permissions, so nobody can
 * translate what they could not read, and nobody can use Cîhan's key as a
 * free translation service.
 */
export async function translateContent(
  kind: TranslateKind,
  id: string,
  target: string
): Promise<TranslateResult> {
  if (!translationAvailable()) return { ok: false, error: "unavailable" };
  const spec = FIELDS[kind];
  if (!spec || !UUID.test(id) || !TARGETS.includes(target)) {
    return { ok: false, error: "notfound" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "signin" };

  // Read as this reader: the row's own policy decides whether they may.
  const { data: row } = await supabase
    .from(spec.table)
    .select(spec.columns.join(", "))
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "notfound" };
  const source = textsOf(row as unknown as Record<string, unknown>, spec.columns);
  if (Object.keys(source).length === 0) return { ok: false, error: "notfound" };

  const hash = createHash("sha256")
    .update(JSON.stringify(source))
    .digest("hex");
  const service = createServiceClient();

  // Translated before, and not edited since: free, and instant.
  const { data: cached } = await service
    .from("translations")
    .select("source_hash, fields, detected")
    .eq("kind", kind)
    .eq("entity_id", id)
    .eq("target", target)
    .maybeSingle();
  if (cached && cached.source_hash === hash) {
    return {
      ok: true,
      fields: cached.fields as Record<string, string>,
      detected: (cached.detected as string | null) ?? null,
    };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "translate")
    .gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT) return { ok: false, error: "limit" };

  const keys = Object.keys(source);
  let out;
  try {
    out = await googleTranslate(
      keys.map((k) => source[k]),
      target
    );
  } catch (err) {
    console.error("[translate]", err instanceof Error ? err.message : err);
    return { ok: false, error: "failed" };
  }
  const fields = Object.fromEntries(keys.map((k, i) => [k, out[i].text]));
  const detected = out.find((o) => o.detected)?.detected ?? null;

  await supabase
    .from("usage_events")
    .insert({ user_id: user.id, feature: "translate", target_id: id });
  // Best-effort: without migration 0029 there is no store, and every reader
  // simply pays for their own translation.
  await service.from("translations").upsert({
    kind,
    entity_id: id,
    target,
    source_hash: hash,
    fields,
    detected,
    created_at: new Date().toISOString(),
  });

  return { ok: true, fields, detected };
}
