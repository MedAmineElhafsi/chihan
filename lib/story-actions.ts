"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";

const createSchema = z.object({
  mediaUrl: z.string().url().max(2000),
  caption: z.string().trim().max(280).optional().nullable(),
});

export type CreateStoryResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createStory(input: {
  mediaUrl: string;
  caption?: string | null;
}): Promise<CreateStoryResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const caption = parsed.data.caption?.trim() || null;

  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: user.id,
      media_url: parsed.data.mediaUrl,
      caption,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/feed");
  return { ok: true, id: String(data.id) };
}

export async function deleteStory(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Missing id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/feed");
  return { ok: true };
}
