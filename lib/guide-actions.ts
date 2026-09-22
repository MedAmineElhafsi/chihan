"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { isAdmin } from "./moderation";
import { guidesReady } from "./schema-ready";
import { GUIDE_LOCALES, GUIDE_TOPICS } from "@/types/guide";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const guideSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "The address may use a–z, 0–9 and hyphens."
    ),
  locale: z.enum(GUIDE_LOCALES),
  topic: z.enum(GUIDE_TOPICS),
  country: z.string().trim().min(2).max(60),
  city: z.string().trim().max(80).optional().default(""),
  title: z.string().trim().min(3).max(140),
  summary: z.string().trim().max(400).optional().default(""),
  steps: z
    .array(
      z.object({
        title: z.string().trim().max(140),
        body: z.string().trim().max(2000),
      })
    )
    .max(30),
  links: z
    .array(
      z.object({
        label: z.string().trim().max(80),
        url: z.string().trim().max(500),
      })
    )
    .max(12),
  status: z.enum(["draft", "published"]),
  reviewedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export type GuideInput = z.input<typeof guideSchema>;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return { supabase, user };
}

/** Create or update one language of a guide. Administrators only. */
export async function saveGuide(
  input: GuideInput
): Promise<Result<{ id: string; slug: string }>> {
  if (!(await guidesReady())) {
    return { ok: false, error: "Run migration 0032 first." };
  }
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };

  const parsed = guideSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid guide.",
    };
  }
  const v = parsed.data;

  const steps = v.steps.filter((s) => s.title || s.body);
  const links = v.links.filter((l) => l.label || l.url);
  // Official sources only over https: a guide must never send a newcomer to
  // a page that can be tampered with on the way.
  if (links.some((l) => !/^https:\/\/[^\s]+\.[^\s]+$/i.test(l.url))) {
    return { ok: false, error: "Links must start with https://" };
  }
  if (v.status === "published" && steps.length === 0) {
    return { ok: false, error: "A published guide needs at least one step." };
  }

  const row = {
    slug: v.slug,
    locale: v.locale,
    topic: v.topic,
    country: v.country,
    city: v.city || null,
    title: v.title,
    summary: v.summary || null,
    steps,
    links,
    status: v.status,
    reviewed_on: v.reviewedOn || null,
  };

  const { data, error } = v.id
    ? await gate.supabase
        .from("guides")
        .update(row)
        .eq("id", v.id)
        .select("id, slug")
        .single()
    : await gate.supabase
        .from("guides")
        .insert({ ...row, author_id: gate.user.id })
        .select("id, slug")
        .single();
  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error:
          "This guide already exists in that language — edit that version instead.",
      };
    }
    return { ok: false, error: error?.message ?? "Could not save." };
  }

  revalidatePath("/guides");
  revalidatePath(`/guides/${data.slug}`);
  revalidatePath("/admin/guides");
  return { ok: true, id: String(data.id), slug: String(data.slug) };
}

export async function deleteGuide(id: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };
  const { error } = await gate.supabase.from("guides").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/guides");
  revalidatePath("/admin/guides");
  return { ok: true };
}

/**
 * A member suggests a guide — often from a request that was answered, so
 * the answer can reach the next person without them having to ask.
 */
export async function suggestGuide(input: {
  title: string;
  note?: string;
  city?: string;
  requestId?: string;
}): Promise<Result> {
  if (!(await guidesReady())) return { ok: false, error: "Unavailable." };
  const title = input.title.trim();
  const note = (input.note ?? "").trim();
  if (title.length < 3 || title.length > 140) {
    return { ok: false, error: "Give it a short title." };
  }
  if (note.length > 1000) return { ok: false, error: "Too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("guide_suggestions").insert({
    suggested_by: user.id,
    request_id: input.requestId || null,
    city: (input.city ?? "").trim() || null,
    title,
    note: note || null,
  });
  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }
  if (input.requestId) revalidatePath(`/help/${input.requestId}`);
  revalidatePath("/admin/guides");
  return { ok: true };
}

export async function resolveSuggestion(
  id: string,
  status: "done" | "dismissed"
): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };
  const { error } = await gate.supabase
    .from("guide_suggestions")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/guides");
  return { ok: true };
}
