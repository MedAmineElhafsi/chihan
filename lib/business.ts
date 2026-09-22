import "server-only";

import { createClient } from "./supabase/server";
import { businessPlanConfigured } from "./stripe";
import { businessReady } from "./schema-ready";

export type StatKind =
  | "view"
  | "call"
  | "whatsapp"
  | "website"
  | "directions"
  | "share";

export type ListingStats = {
  /** Totals over the window, by kind. */
  totals: Record<StatKind, number>;
  /** Views per day, oldest first, with empty days filled in. */
  days: Array<{ day: string; views: number; taps: number }>;
  from: string;
};

export const STAT_KINDS: StatKind[] = [
  "view",
  "call",
  "whatsapp",
  "website",
  "directions",
  "share",
];

/** The business plan can be bought: the plan exists and Stripe is set up. */
export async function businessPlanAvailable(): Promise<boolean> {
  return businessPlanConfigured() && (await businessReady());
}

/** Whether this member's business plan is running. */
export async function hasBusiness(userId: string): Promise<boolean> {
  if (!(await businessReady())) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("business_subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    const row = data as {
      status?: string;
      current_period_end?: string | null;
    } | null;
    if (!row?.status || !["active", "trialing"].includes(row.status)) {
      return false;
    }
    return (
      !row.current_period_end || new Date(row.current_period_end) > new Date()
    );
  } catch {
    return false;
  }
}

/**
 * A listing's own numbers for the last `days` days. Readable only by its
 * owner — the policy says so, and this reads with their session.
 */
export async function getListingStats(
  listingId: string,
  days = 30
): Promise<ListingStats> {
  const empty: ListingStats = {
    totals: {
      view: 0,
      call: 0,
      whatsapp: 0,
      website: 0,
      directions: 0,
      share: 0,
    },
    days: [],
    from: "",
  };
  const from = new Date(Date.now() - (days - 1) * 864e5)
    .toISOString()
    .slice(0, 10);
  empty.from = from;
  if (!(await businessReady())) return empty;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("listing_events")
      .select("day, kind, count")
      .eq("listing_id", listingId)
      .gte("day", from);
    const rows = (data ?? []) as Array<{
      day: string;
      kind: StatKind;
      count: number;
    }>;

    const totals = { ...empty.totals };
    const byDay = new Map<string, { views: number; taps: number }>();
    for (let i = 0; i < days; i++) {
      byDay.set(
        new Date(Date.now() - (days - 1 - i) * 864e5)
          .toISOString()
          .slice(0, 10),
        { views: 0, taps: 0 }
      );
    }
    for (const r of rows) {
      const day = String(r.day).slice(0, 10);
      totals[r.kind] = (totals[r.kind] ?? 0) + Number(r.count);
      const bucket = byDay.get(day);
      if (!bucket) continue;
      if (r.kind === "view") bucket.views += Number(r.count);
      else bucket.taps += Number(r.count);
    }
    return {
      totals,
      days: [...byDay.entries()].map(([day, v]) => ({ day, ...v })),
      from,
    };
  } catch {
    return empty;
  }
}
