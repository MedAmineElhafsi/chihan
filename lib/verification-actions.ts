"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";

/**
 * Verification, Instagram-style: you apply, a person looks at what you sent,
 * and they decide. Nobody can grant themselves the badge — there is no RLS
 * policy letting an applicant update their own request, and the decision runs
 * through a function that checks for an administrator.
 */

export async function requestVerification(
  documentPath: string,
  note: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  if (!documentPath.startsWith(`${user.id}/`)) {
    // Storage policy enforces this too; refusing here keeps a pointless row
    // out of the queue.
    return { ok: false, error: "bad_path" };
  }

  const { error } = await supabase.from("verification_requests").insert({
    user_id: user.id,
    document_url: documentPath,
    note: note.trim().slice(0, 500) || null,
  });

  if (error) {
    // The partial unique index is the source of truth for "one at a time".
    if (/duplicate key|unique/i.test(error.message)) {
      return { ok: false, error: "already_pending" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function withdrawVerification(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("verification_requests")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function decideVerification(
  id: string,
  approve: boolean,
  note?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_verification", {
    p_request: id,
    p_approve: approve,
    p_note: note?.trim().slice(0, 500) || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}
