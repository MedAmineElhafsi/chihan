"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";

export type SafetyActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateSafety() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/people");
  revalidatePath("/feed");
  revalidatePath("/messages");
}

export async function blockUser(
  targetUserId: string
): Promise<SafetyActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.id === targetUserId) return { ok: false, error: "Invalid target." };

  const { error } = await supabase.from("user_blocks").upsert(
    { blocker_id: user.id, blocked_id: targetUserId },
    { onConflict: "blocker_id,blocked_id" }
  );
  if (error) return { ok: false, error: error.message };

  // Mute is implied by block for content, but keep mute row for clarity.
  await supabase.from("user_mutes").upsert(
    { muter_id: user.id, muted_id: targetUserId },
    { onConflict: "muter_id,muted_id" }
  );

  revalidateSafety();
  return { ok: true };
}

export async function unblockUser(
  targetUserId: string
): Promise<SafetyActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId);
  if (error) return { ok: false, error: error.message };

  revalidateSafety();
  return { ok: true };
}

export async function muteUser(
  targetUserId: string
): Promise<SafetyActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.id === targetUserId) return { ok: false, error: "Invalid target." };

  const { error } = await supabase.from("user_mutes").upsert(
    { muter_id: user.id, muted_id: targetUserId },
    { onConflict: "muter_id,muted_id" }
  );
  if (error) return { ok: false, error: error.message };

  revalidateSafety();
  return { ok: true };
}

export async function unmuteUser(
  targetUserId: string
): Promise<SafetyActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("user_mutes")
    .delete()
    .eq("muter_id", user.id)
    .eq("muted_id", targetUserId);
  if (error) return { ok: false, error: error.message };

  revalidateSafety();
  return { ok: true };
}
