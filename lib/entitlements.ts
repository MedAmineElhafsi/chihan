import "server-only";

import { createClient } from "./supabase/server";
import { FREE_LIMITS } from "./constants";
import { FEATURES } from "./features";

export type Tier = "free" | "premium";

export type Entitlements = {
  tier: Tier;
  limits: typeof FREE_LIMITS;
  features: {
    advancedFilters: boolean;
    unlimitedReveals: boolean;
    whoViewedMe: boolean;
    createPosts: boolean;
    createEvents: boolean;
    verifiedBadge: boolean;
  };
};

const PREMIUM_STATUSES = ["active", "trialing"];

/**
 * The user's tier and limits. Reads `subscriptions`; everyone is free until the
 * Stripe webhook (Phase 8) marks a subscription active. Enforce BOTH in the UI
 * and server-side (brief §5).
 */
export async function getEntitlements(
  userId: string | null
): Promise<Entitlements> {
  // Billing is off for launch: with no users a paywall earns nothing and
  // only adds friction. Everyone gets full access until it is switched on.
  if (!FEATURES.billing) {
    return {
      tier: "premium",
      limits: { ...FREE_LIMITS },
      features: {
        advancedFilters: true,
        unlimitedReveals: true,
        whoViewedMe: true,
        createPosts: true,
        createEvents: true,
        verifiedBadge: true,
      },
    };
  }

  let premium = false;

  if (userId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      const row = data as { status?: string; current_period_end?: string } | null;
      if (row && row.status && PREMIUM_STATUSES.includes(row.status)) {
        if (
          !row.current_period_end ||
          new Date(row.current_period_end) > new Date()
        ) {
          premium = true;
        }
      }
    } catch {
      // table missing pre-migration → treat as free.
    }
  }

  const tier: Tier = premium ? "premium" : "free";
  return {
    tier,
    limits: { ...FREE_LIMITS },
    features: {
      advancedFilters: premium,
      unlimitedReveals: premium,
      whoViewedMe: premium,
      createPosts: premium,
      createEvents: premium,
      verifiedBadge: premium,
    },
  };
}
