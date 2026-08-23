import "server-only";

import { createClient } from "./supabase/server";

/**
 * Whether this member may write a review of this listing.
 *
 * The database is the authority — `can_review` is enforced by the insert
 * policy on `reviews`, so a forged request fails there too. This is only so
 * the interface can explain itself instead of offering a form that will be
 * rejected.
 */
export async function canReview(
  listingId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("can_review", {
      p_listing: listingId,
      p_user: userId,
    });
    if (error) {
      console.error("[reviews] can_review failed:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[reviews] can_review threw:", err);
    return false;
  }
}
