"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { REEL_MAX_SECONDS } from "./constants";

const reelSchema = z.object({
  videoUrl: z.string().url(),
  posterUrl: z.string().url().nullable(),
  caption: z.string().trim().max(500).optional().default(""),
  // The browser already refused anything longer, but the browser is not a
  // place to enforce anything — a hand-written request would skip that check.
  durationSeconds: z.number().int().positive().max(REEL_MAX_SECONDS),
});

export type CreateReelInput = z.input<typeof reelSchema>;

export async function createReel(
  input: CreateReelInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = reelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      type: "reel",
      body: v.caption || null,
      media: [v.videoUrl],
      poster_url: v.posterUrl,
      duration_seconds: v.durationSeconds,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "insert failed" };
  }

  revalidatePath("/reels");
  revalidatePath("/feed");
  return { ok: true, id: String(data.id) };
}
