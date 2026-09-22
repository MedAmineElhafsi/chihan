"use server";

import { createClient } from "./supabase/server";
import {
  BUSINESS_PRICE_ID,
  businessPlanConfigured,
  getStripe,
  siteUrl,
} from "./stripe";

type Result = { ok: true; url: string } | { ok: false; error: string };

/**
 * Buying the plan. Stripe collects the card; Cîhan never sees it. The
 * webhook writes the subscription when Stripe says it is paid.
 */
export async function startBusinessCheckout(
  listingId?: string
): Promise<Result> {
  if (!businessPlanConfigured()) {
    return { ok: false, error: "unavailable" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  try {
    const { data: existing } = await supabase
      .from("business_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const customerId =
      (existing as { stripe_customer_id?: string | null } | null)
        ?.stripe_customer_id ?? undefined;

    const back = listingId ? `/directory/${listingId}/stats` : "/dashboard";
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: BUSINESS_PRICE_ID!, quantity: 1 }],
      success_url: `${siteUrl()}${back}?plan=1`,
      cancel_url: `${siteUrl()}${back}`,
      client_reference_id: user.id,
      customer: customerId,
      customer_email: customerId ? undefined : (user.email ?? undefined),
      subscription_data: { metadata: { user_id: user.id, kind: "business" } },
      metadata: { user_id: user.id, kind: "business" },
      allow_promotion_codes: true,
    });
    if (!session.url) return { ok: false, error: "failed" };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[business] checkout", err);
    return { ok: false, error: "failed" };
  }
}

/** Where a business changes its card or cancels. */
export async function openBusinessPortal(): Promise<Result> {
  if (!businessPlanConfigured()) return { ok: false, error: "unavailable" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  const { data } = await supabase
    .from("business_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customer = (data as { stripe_customer_id?: string | null } | null)
    ?.stripe_customer_id;
  if (!customer) return { ok: false, error: "no_plan" };

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${siteUrl()}/dashboard`,
    });
    return { ok: true, url: portal.url };
  } catch (err) {
    console.error("[business] portal", err);
    return { ok: false, error: "failed" };
  }
}

/**
 * Counting a visit or a tap on a listing. The function behind this keeps a
 * number per day and kind — never who — and ignores the owner looking at
 * their own page.
 */
export async function recordListingEvent(
  listingId: string,
  kind: string
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_listing_event", {
      p_listing: listingId,
      p_kind: kind,
    });
  } catch {
    // Counting is never worth an error in someone's face.
  }
}
