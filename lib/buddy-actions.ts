"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { buddiesReady } from "./schema-ready";
import { isEnabled } from "./features";
import { startConversation } from "./chat-actions";
import { BUDDY_AREAS } from "@/types/buddy";

type Result = { ok: true } | { ok: false; error: string };

/** The short codes the database raises, as keys the app can translate. */
const CODES = [
  "not_signed_in",
  "not_yourself",
  "not_a_newcomer",
  "not_available",
  "buddy_full",
  "already_paired",
  "too_many_requests",
  "not_pending",
  "not_yours",
] as const;

function codeOf(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const hit = CODES.find((c) => message.includes(c));
  if (hit) return hit;
  if (/duplicate key|buddy_pairs_one_open/.test(message))
    return "already_asked";
  return "failed";
}

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Join the programme, or change your entry. The promise must be accepted:
 * without it there is no entry, and no way to ask or be asked.
 */
export async function saveBuddyProfile(input: {
  role: "newcomer" | "mentor";
  areas: string[];
  about?: string;
  capacity?: number;
  agreed: boolean;
}): Promise<Result> {
  if (!isEnabled("buddies") || !(await buddiesReady())) {
    return { ok: false, error: "unavailable" };
  }
  if (!input.agreed) return { ok: false, error: "promise" };

  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "not_signed_in" };

  const areas = input.areas.filter((a) =>
    (BUDDY_AREAS as readonly string[]).includes(a)
  );
  const about = (input.about ?? "").trim().slice(0, 500);
  const capacity = Math.min(3, Math.max(1, Number(input.capacity) || 1));

  const { error } = await supabase.from("buddy_profiles").upsert(
    {
      user_id: user.id,
      role: input.role,
      areas,
      about: about || null,
      capacity: input.role === "mentor" ? capacity : 1,
      active: true,
      agreed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  // The policy refuses a buddy entry without a checked document.
  if (error) {
    return {
      ok: false,
      error: /row-level security/.test(error.message)
        ? "needs_verification"
        : "failed",
    };
  }
  revalidatePath("/buddies");
  return { ok: true };
}

/** Pause or resume: a buddy who is busy stops being offered. */
export async function setBuddyActive(active: boolean): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "not_signed_in" };
  const { error } = await supabase
    .from("buddy_profiles")
    .update({ active })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/buddies");
  return { ok: true };
}

export async function leaveBuddies(): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "not_signed_in" };
  const { error } = await supabase
    .from("buddy_profiles")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/buddies");
  return { ok: true };
}

export async function requestBuddy(
  mentorId: string,
  message: string
): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "not_signed_in" };
  const { error } = await supabase.rpc("request_buddy", {
    p_mentor: mentorId,
    p_message: message.slice(0, 500),
  });
  if (error) return { ok: false, error: codeOf(error) };
  revalidatePath("/buddies");
  return { ok: true };
}

/**
 * Accept or decline. Accepting opens a chat between the two of them: a
 * buddyship that has to start with "how do I message you?" does not start.
 */
export async function respondBuddy(
  pairId: string,
  accept: boolean
): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "not_signed_in" };

  const { data: pair } = await supabase
    .from("buddy_pairs")
    .select("newcomer_id")
    .eq("id", pairId)
    .maybeSingle();

  const { error } = await supabase.rpc("respond_buddy", {
    p_pair: pairId,
    p_accept: accept,
  });
  if (error) return { ok: false, error: codeOf(error) };

  if (accept && pair?.newcomer_id) {
    // "help" so the free-tier limit on new conversations never stands
    // between a newcomer and the person who just said yes.
    await startConversation(String(pair.newcomer_id), "help");
  }
  revalidatePath("/buddies");
  return { ok: true };
}

export async function endBuddy(
  pairId: string,
  reason?: string
): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "not_signed_in" };
  const { error } = await supabase.rpc("end_buddy", {
    p_pair: pairId,
    p_reason: reason ?? null,
  });
  if (error) return { ok: false, error: codeOf(error) };
  revalidatePath("/buddies");
  return { ok: true };
}
