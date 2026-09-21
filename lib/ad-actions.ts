"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { BODY_MAX, HEADLINE_MAX, HEADLINE_MIN } from "@/types/ad";

/**
 * Promoting a listing, and deciding on a promotion. Every rule that matters
 * lives in the database functions (migration 0026) — ownership, one ad at a
 * time, the seven-day week, who may approve — so these only shape the input
 * and translate the answer.
 */

export type AdError =
  | "not_signed_in"
  | "not_owner"
  | "already_active"
  | "headline"
  | "body"
  | "not_withdrawable"
  | "not_admin"
  | "not_pending"
  | "failed";

type Result = { ok: true } | { ok: false; error: AdError };

const KNOWN: AdError[] = [
  "not_signed_in",
  "not_owner",
  "already_active",
  "not_withdrawable",
  "not_admin",
  "not_pending",
];

function toError(message: string | undefined): AdError {
  if (!message) return "failed";
  // Two requests at once reach the unique index instead of the check.
  if (/duplicate key|unique/i.test(message)) return "already_active";
  return KNOWN.find((code) => message.includes(code)) ?? "failed";
}

export async function submitAd(
  listingId: string,
  headline: string,
  body: string
): Promise<Result> {
  const h = headline.trim();
  const b = body.trim();
  if (h.length < HEADLINE_MIN || h.length > HEADLINE_MAX) {
    return { ok: false, error: "headline" };
  }
  if (b.length > BODY_MAX) return { ok: false, error: "body" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_ad", {
    p_listing: listingId,
    p_headline: h,
    p_body: b || null,
  });
  if (error) return { ok: false, error: toError(error.message) };

  revalidatePath(`/directory/${listingId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function withdrawAd(
  adId: string,
  listingId: string
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_ad", { p_ad: adId });
  if (error) return { ok: false, error: toError(error.message) };

  revalidatePath(`/directory/${listingId}`);
  revalidatePath("/feed");
  revalidatePath("/admin");
  return { ok: true };
}

export async function decideAd(
  adId: string,
  approve: boolean,
  note?: string
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_ad", {
    p_ad: adId,
    p_approve: approve,
    p_note: note?.trim().slice(0, 500) || null,
  });
  if (error) return { ok: false, error: toError(error.message) };

  revalidatePath("/admin");
  revalidatePath("/feed");
  return { ok: true };
}
